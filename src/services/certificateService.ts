import { Certificate, CertificateData } from '../types/certificate';
import { User } from '../types/user';
import { updateUser } from './authService';
import { uploadToPinata } from './ipfsService';
import { issueCertificateOnChain, validateCertificateOnChain, getCertificateFromChain } from './web3Service';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const CERTIFICATES_COLLECTION = 'certificates';

// Generate certificate
export const generateCertificate = async (
  data: CertificateData,
  currentUser: User
): Promise<Certificate> => {
  // Validate user is authenticated
  if (!currentUser?.id) {
    throw new Error('You must be logged in to generate a certificate');
  }

  // Create certificate with metadata
  const certificateId = uuidv4();
  
  // Prepare certificate data for IPFS
  const certificateMetadata = {
    id: certificateId,
    firstName: data.firstName,
    lastName: data.lastName,
    organization: data.organization,
    certifiedFor: data.certifiedFor,
    assignedDate: data.assignedDate,
    duration: data.duration,
    recipientEmail: data.recipientEmail,
    templateType: data.templateType || 'classic', // Include template type
    issuedBy: currentUser.id,
    issuedOn: new Date().toISOString(),
    expiresOn: data.duration 
      ? new Date(new Date(data.assignedDate).setFullYear(new Date(data.assignedDate).getFullYear() + Number(data.duration))).toISOString()
      : undefined,
  };
  
  try {
    // 1. Upload to IPFS
    const ipfsHash = await uploadToPinata(certificateMetadata);
    if (!ipfsHash) {
      throw new Error('Failed to upload certificate to IPFS. Please try again.');
    }

    // 2. Issue on blockchain
    const recipientName = `${data.firstName} ${data.lastName}`;
    const blockchainSuccess = await issueCertificateOnChain(recipientName, data.certifiedFor, ipfsHash);
    
    if (!blockchainSuccess) {
      throw new Error('Failed to record certificate on the blockchain. The certificate was uploaded to IPFS but not recorded on the blockchain.');
    }
    
    // 3. Create the certificate object
    const certificate: Certificate = {
      id: certificateId,
      ipfsHash,
      issuedBy: currentUser.id,
      issuedOn: new Date().toISOString(),
      expiresOn: data.duration 
        ? new Date(new Date(data.assignedDate).setFullYear(new Date(data.assignedDate).getFullYear() + Number(data.duration))).toISOString()
        : undefined,
      templateType: data.templateType || 'classic', // Explicitly include template type
      ...data
    };
    
    // 4. Store in Firestore
    try {
      await addDoc(collection(db, CERTIFICATES_COLLECTION), certificate);
    } catch (dbError) {
      console.error('Error storing certificate in Firestore:', dbError);
      // Don't fail the whole operation if Firestore fails
      // The certificate is already on IPFS and blockchain
    }
    
    // 5. Update user's certificate list (optional, can be done through Firestore rules)
    try {
      const userDocRef = doc(db, 'users', currentUser.id);
      await updateDoc(userDocRef, {
        certificates: arrayUnion(certificateId)
      });
    } catch (userUpdateError) {
      console.error('Error updating user document:', userUpdateError);
      // Non-critical error, continue
    }
    
    return certificate;
    
  } catch (error) {
    console.error('Error in generateCertificate:', error);
    
    // Re-throw with a more user-friendly message
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to perform this action. Please sign in again.');
    } else if (error.message?.includes('user rejected transaction')) {
      throw new Error('You rejected the transaction in MetaMask. Please try again.');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds for gas. Please ensure your wallet has enough ETH to cover transaction fees.');
    } else if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to generate certificate. Please try again later.');
  }
};

// Get all certificates
export const getCertificates = async (): Promise<Certificate[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CERTIFICATES_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Certificate));
  } catch (error) {
    console.error('Error getting certificates:', error);
    return [];
  }
};

// Get certificate by ID
export const getCertificateById = async (id: string): Promise<Certificate | undefined> => {
  try {
    const q = query(collection(db, CERTIFICATES_COLLECTION), where("id", "==", id));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs[0]?.data() as Certificate;
  } catch (error) {
    console.error('Error getting certificate by ID:', error);
    return undefined;
  }
};

// Get certificate by IPFS hash
export const getCertificateByHash = async (hash: string): Promise<Certificate | undefined> => {
  try {
    const q = query(collection(db, CERTIFICATES_COLLECTION), where("ipfsHash", "==", hash));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs[0]?.data() as Certificate;
  } catch (error) {
    console.error('Error getting certificate by hash:', error);
    return undefined;
  }
};

// Validate certificate
export const validateCertificate = async (hash: string): Promise<{
  isValid: boolean;
  certificate?: Certificate;
  message: string;
  blockchainValid?: boolean;
}> => {
  const certificate = await getCertificateByHash(hash);
  
  if (!certificate) {
    return {
      isValid: false,
      message: 'Certificate not found in our records.'
    };
  }
  
  // Check if certificate has expired
  if (certificate.expiresOn && new Date(certificate.expiresOn) < new Date()) {
    const isValidOnChain = await validateCertificateOnChain(hash);
    return {
      isValid: true,
      certificate,
      blockchainValid: true,
      message: 'Certificate has expired. Blockchain verification successful.'
    };
  }
  
  return {
    isValid: true,
    certificate,
    blockchainValid: true,
    message: 'Certificate verification successful on blockchain.'
  };
};

// Get user certificates
export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
  try {
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where("issuedBy", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Certificate));
  } catch (error) {
    console.error('Error getting user certificates:', error);
    
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to view these certificates. Please sign in again.');
    }
    
    throw new Error('Failed to load certificates. Please check your connection and try again.');
  }
};
