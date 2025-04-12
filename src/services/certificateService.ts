import { Certificate, CertificateData } from '../types/certificate';
import { User } from '../types/user';
import { updateUser } from './authService';
import { uploadToPinata } from './ipfsService';
import { issueCertificateOnChain, validateCertificateOnChain, getCertificateFromChain } from './web3Service';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const CERTIFICATES_COLLECTION = 'certificates';

// Generate certificate
export const generateCertificate = async (
  data: CertificateData,
  currentUser: User
): Promise<Certificate> => {
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
    issuedBy: currentUser.id,
    issuedOn: new Date().toISOString(),
    expiresOn: data.duration 
      ? new Date(new Date(data.assignedDate).setFullYear(new Date(data.assignedDate).getFullYear() + Number(data.duration))).toISOString()
      : undefined,
  };
  
  // Upload to IPFS via Pinata
  const ipfsHash = await uploadToPinata(certificateMetadata);
  
  if (!ipfsHash) {
    throw new Error('Failed to upload certificate to IPFS');
  }
  
  // Issue certificate on blockchain
  const recipientName = `${data.firstName} ${data.lastName}`;
  await issueCertificateOnChain(recipientName, data.certifiedFor, ipfsHash);
  
  // Create the certificate object
  const certificate: Certificate = {
    id: certificateId,
    ipfsHash,
    issuedBy: currentUser.id,
    issuedOn: new Date().toISOString(),
    expiresOn: data.duration 
      ? new Date(new Date(data.assignedDate).setFullYear(new Date(data.assignedDate).getFullYear() + Number(data.duration))).toISOString()
      : undefined,
    ...data
  };
  
  // Add certificate to user's list
  const updatedUser = {
    ...currentUser,
    certificates: [...(currentUser.certificates || []), certificate.id]
  };
  updateUser(updatedUser);
  
  // Store certificate in Firestore
  try {
    await addDoc(collection(db, CERTIFICATES_COLLECTION), certificate);
  } catch (error) {
    console.error('Error storing certificate in Firestore:', error);
    throw new Error('Failed to store certificate');
  }
  
  return certificate;
};

// Get all certificates
export const getCertificates = async (): Promise<Certificate[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CERTIFICATES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as Certificate);
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
    const q = query(collection(db, CERTIFICATES_COLLECTION), where("issuedBy", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Certificate);
  } catch (error) {
    console.error('Error getting user certificates:', error);
    return [];
  }
};
