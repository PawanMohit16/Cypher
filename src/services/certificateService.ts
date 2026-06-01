import { Certificate, CertificateData } from '../types/certificate';
import { User } from '../types/user';
import { uploadToPinata, getFromIPFS } from './ipfsService';
import { normalizeIPFSHash } from '@/lib/ipfs';
import { issueCertificateOnChain, validateCertificateOnChain } from './web3Service';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, arrayUnion, type DocumentData } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const CERTIFICATES_COLLECTION = 'certificates';
const USERS_COLLECTION = 'users';
const LEGACY_USER_CERTIFICATE_FIELDS = ['certificates', 'certificateIds', 'issuedCertificates', 'generatedCertificates'] as const;
const CERTIFICATE_OWNER_FIELDS = ['issuedBy', 'issuerId', 'creatorId', 'ownerId', 'userId'] as const;

type FirestoreCertificateRecord = Certificate & {
  blockchainValid?: boolean;
  legacySource?: string;
  ipfsCid?: string;
  ipfsUri?: string;
};

function safeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || typeof value === 'undefined') {
    return fallback;
  }

  return String(value);
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return fallback;
}

function normalizeCertificateRecord(data: DocumentData, fallbackId: string): FirestoreCertificateRecord {
  const ipfsSource = data.ipfsHash ?? data.ipfsCid ?? data.cid ?? data.ipfsUri ?? data.ipfs;
  const normalizedHash = typeof ipfsSource === 'string' && ipfsSource.trim().length > 0
    ? normalizeIPFSHash(ipfsSource)
    : null;

  const issuedOn = toIsoString(data.issuedOn ?? data.createdAt, new Date().toISOString());
  const assignedDate = toIsoString(data.assignedDate ?? data.issuedOn ?? issuedOn, issuedOn);

  return {
    id: safeString(data.id ?? fallbackId, fallbackId),
    firstName: safeString(data.firstName),
    lastName: safeString(data.lastName),
    organization: safeString(data.organization),
    certifiedFor: safeString(data.certifiedFor),
    assignedDate,
    duration: typeof data.duration === 'undefined' ? undefined : safeString(data.duration),
    recipientEmail: safeString(data.recipientEmail),
    templateType: data.templateType || 'classic',
    ipfsHash: normalizedHash?.raw ?? safeString(data.ipfsHash ?? ipfsSource),
    issuedBy: safeString(data.issuedBy ?? data.issuerId ?? data.ownerId ?? data.creatorId ?? data.userId),
    issuedOn,
    expiresOn: typeof data.expiresOn !== 'undefined' ? toIsoString(data.expiresOn, '') : undefined,
    blockchainValid: typeof data.blockchainValid === 'boolean' ? data.blockchainValid : undefined,
    ipfsCid: normalizedHash?.raw,
    ipfsUri: normalizedHash?.prefixed,
    legacySource: safeString(data.legacySource ?? data.source ?? ''),
  };
}

function uniqCertificates(certificates: FirestoreCertificateRecord[]): FirestoreCertificateRecord[] {
  const seen = new Set<string>();

  return certificates.filter((certificate) => {
    const key = `${certificate.id}:${certificate.ipfsHash}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function upsertCertificateRecord(certificate: FirestoreCertificateRecord): Promise<void> {
  const { raw } = normalizeIPFSHash(certificate.ipfsHash);
  const certDocRef = doc(db, CERTIFICATES_COLLECTION, certificate.id);

  await setDoc(
    certDocRef,
    {
      ...certificate,
      ipfsHash: raw,
      ipfsCid: raw,
      ipfsUri: `ipfs://${raw}`,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function upsertUserCertificateIndex(currentUser: User, certificateId: string): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, currentUser.id);

  await setDoc(
    userDocRef,
    {
      id: currentUser.id,
      email: currentUser.email,
      fullName: currentUser.fullName,
      userType: currentUser.userType,
      certificates: arrayUnion(certificateId),
      certificateIds: arrayUnion(certificateId),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function fetchCertificatesByOwnerField(userId: string): Promise<FirestoreCertificateRecord[]> {
  const querySnapshots = await Promise.all(
    CERTIFICATE_OWNER_FIELDS.map((field) =>
      getDocs(query(collection(db, CERTIFICATES_COLLECTION), where(field, '==', userId)))
        .catch((error) => {
          console.warn(`Certificate owner query failed for ${field}:`, error);
          return null;
        })
    )
  );

  return querySnapshots.flatMap((snapshot) => {
    if (!snapshot) {
      return [];
    }

    return snapshot.docs.map((certificateDoc) =>
      normalizeCertificateRecord(certificateDoc.data(), certificateDoc.id)
    );
  });
}

async function fetchLegacyCertificatesFromUserDoc(userId: string): Promise<FirestoreCertificateRecord[]> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userDoc.exists()) {
    return [];
  }

  const userData = userDoc.data();
  const entries = LEGACY_USER_CERTIFICATE_FIELDS.flatMap((field) => {
    const value = userData[field];
    if (Array.isArray(value)) {
      return value;
    }

    return typeof value === 'undefined' || value === null ? [] : [value];
  });

  const certificates: FirestoreCertificateRecord[] = [];

  for (const entry of entries) {
    if (typeof entry === 'string') {
      const directDoc = await getDoc(doc(db, CERTIFICATES_COLLECTION, entry));
      if (directDoc.exists()) {
        certificates.push(normalizeCertificateRecord(directDoc.data(), directDoc.id));
        continue;
      }

      const querySnapshot = await getDocs(query(collection(db, CERTIFICATES_COLLECTION), where('id', '==', entry)));
      certificates.push(...querySnapshot.docs.map((certificateDoc) => normalizeCertificateRecord(certificateDoc.data(), certificateDoc.id)));
      continue;
    }

    if (entry && typeof entry === 'object') {
      certificates.push(normalizeCertificateRecord(entry as DocumentData, safeString((entry as Record<string, unknown>).id ?? uuidv4())));
    }
  }

  return certificates;
}

async function hydrateBlockchainStatus(certificates: FirestoreCertificateRecord[]): Promise<FirestoreCertificateRecord[]> {
  const hydrated = await Promise.all(
    certificates.map(async (certificate) => ({
      ...certificate,
      blockchainValid: await validateCertificateOnChain(certificate.ipfsHash),
    }))
  );

  return uniqCertificates(hydrated);
}

async function recoverCertificateFromIPFS(hash: string): Promise<Certificate | undefined> {
  const metadata = await getFromIPFS(hash);

  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const normalizedHash = metadata.ipfsHash ? normalizeIPFSHash(metadata.ipfsHash).raw : normalizeIPFSHash(hash).raw;

  if (!metadata.firstName || !metadata.lastName || !metadata.certifiedFor || !metadata.organization) {
    return undefined;
  }

  return {
    id: metadata.id ?? normalizedHash,
    ipfsHash: normalizedHash,
    issuedBy: metadata.issuedBy ?? 'unknown',
    issuedOn: metadata.issuedOn ?? new Date().toISOString(),
    expiresOn: metadata.expiresOn,
    templateType: metadata.templateType ?? 'classic',
    firstName: metadata.firstName,
    lastName: metadata.lastName,
    organization: metadata.organization,
    certifiedFor: metadata.certifiedFor,
    assignedDate: metadata.assignedDate ?? metadata.issuedOn ?? new Date().toISOString(),
    duration: metadata.duration,
    recipientEmail: metadata.recipientEmail ?? '',
    ipfsCid: normalizedHash,
    ipfsUri: `ipfs://${normalizedHash}`,
  } as Certificate;
}

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
    const uploadedIpfsHash = await uploadToPinata(certificateMetadata);
    if (!uploadedIpfsHash) {
      throw new Error('Failed to upload certificate to IPFS. Please try again.');
    }

    // Normalize CID so we use canonical form everywhere
    const { raw: rawCid, prefixed: prefixedCid } = normalizeIPFSHash(uploadedIpfsHash);

    // 2. Issue on blockchain
    const recipientName = `${data.firstName} ${data.lastName}`;
    const blockchainSuccess = await issueCertificateOnChain(recipientName, data.certifiedFor, rawCid);
    
    if (!blockchainSuccess) {
      throw new Error('Failed to record certificate on the blockchain. The certificate was uploaded to IPFS but not recorded on the blockchain.');
    }
    
    // 3. Create the certificate object (deterministic doc id)
    const certificate: Certificate = {
      id: certificateId,
      ipfsHash: rawCid,
      issuedBy: currentUser.id,
      issuedOn: new Date().toISOString(),
      expiresOn: data.duration 
        ? new Date(new Date(data.assignedDate).setFullYear(new Date(data.assignedDate).getFullYear() + Number(data.duration))).toISOString()
        : undefined,
      templateType: data.templateType || 'classic', // Explicitly include template type
      ipfsCid: rawCid,
      ipfsUri: prefixedCid,
      blockchainValid: true,
      ...data
    };

    // 4. Store in Firestore with deterministic id so we can update safely
    try {
      await upsertCertificateRecord(certificate as FirestoreCertificateRecord);
    } catch (dbError) {
      console.error('Error storing certificate in Firestore:', dbError);
      // Don't fail the whole operation if Firestore fails
      // The certificate is already on IPFS and blockchain
    }

    // 5. Update user's certificate list using setDoc merge to avoid 'No document to update'
    try {
      await upsertUserCertificateIndex(currentUser, certificateId);
    } catch (userUpdateError) {
      console.error('Error updating user document:', userUpdateError);
      // Non-critical error, continue
    }

    // Return certificate only after DB write attempts completed
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
    return querySnapshot.docs.map(doc => normalizeCertificateRecord(doc.data(), doc.id));
  } catch (error) {
    console.error('Error getting certificates:', error);
    return [];
  }
};

// Get certificate by ID
export const getCertificateById = async (id: string): Promise<Certificate | undefined> => {
  try {
    const directDoc = await getDoc(doc(db, CERTIFICATES_COLLECTION, id));
    if (directDoc.exists()) {
      return normalizeCertificateRecord(directDoc.data(), directDoc.id);
    }

    const q = query(collection(db, CERTIFICATES_COLLECTION), where('id', '==', id));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs[0] ? normalizeCertificateRecord(querySnapshot.docs[0].data(), querySnapshot.docs[0].id) : undefined;
  } catch (error) {
    console.error('Error getting certificate by ID:', error);
    return undefined;
  }
};

// Get certificate by IPFS hash
export const getCertificateByHash = async (hash: string): Promise<Certificate | undefined> => {
  try {
    const { candidates, raw } = normalizeIPFSHash(hash);
    const hashFields = ['ipfsHash', 'ipfsCid', 'cid', 'ipfsUri'];

    for (const candidate of candidates) {
      for (const field of hashFields) {
        const querySnapshot = await getDocs(query(collection(db, CERTIFICATES_COLLECTION), where(field, '==', candidate)));
        if (querySnapshot.docs.length > 0) {
          return normalizeCertificateRecord(querySnapshot.docs[0].data(), querySnapshot.docs[0].id);
        }
      }
    }

    const fallbackSnapshot = await getDocs(query(collection(db, CERTIFICATES_COLLECTION), where('ipfsHash', '==', raw)));
    if (fallbackSnapshot.docs.length > 0) {
      return normalizeCertificateRecord(fallbackSnapshot.docs[0].data(), fallbackSnapshot.docs[0].id);
    }

    return undefined;
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
  // Normalize hash to bare form for on-chain checks and IPFS fetch
  const { raw: normalized } = normalizeIPFSHash(hash);

  // Try to find in our DB first
  let certificate = await getCertificateByHash(normalized);

  // Check on-chain first. If that fails, try to recover from IPFS for legacy or partially written records.
  if (!certificate) {
    const isValidOnChain = await validateCertificateOnChain(normalized);
    if (!isValidOnChain) {
      const recoveredFromIpfs = await recoverCertificateFromIPFS(normalized);
      if (!recoveredFromIpfs) {
        return {
          isValid: false,
          message: 'Certificate is not valid on-chain or on IPFS.'
        };
      }

      certificate = recoveredFromIpfs;
      await upsertCertificateRecord(certificate as FirestoreCertificateRecord).catch((error) => {
        console.warn('Unable to persist recovered IPFS certificate:', error);
      });

      const isExpired = certificate.expiresOn && new Date(certificate.expiresOn) < new Date();
      return {
        isValid: true,
        certificate,
        blockchainValid: false,
        message: isExpired
          ? 'Certificate recovered from IPFS. Blockchain record is missing or invalid, but the certificate data is present.'
          : 'Certificate recovered from IPFS. Blockchain record is missing or invalid, but the certificate data is present.'
      };
    }

    certificate = {
      id: normalized,
      ipfsHash: normalized,
      issuedBy: 'unknown',
      issuedOn: new Date().toISOString(),
      templateType: 'classic',
      firstName: 'Unknown',
      lastName: 'Recipient',
      organization: 'Unknown',
      certifiedFor: 'Unknown',
      assignedDate: new Date().toISOString(),
      recipientEmail: '',
      ipfsCid: normalized,
      ipfsUri: `ipfs://${normalized}`,
    } as Certificate;

    return {
      isValid: false,
      message: 'Certificate is not valid on-chain or on IPFS.'
    };
  } else {
    // If found in DB, still validate on-chain
    const isValidOnChain = await validateCertificateOnChain(certificate.ipfsHash || normalized);
    if (!isValidOnChain) {
      const recoveredFromIpfs = await recoverCertificateFromIPFS(certificate.ipfsHash || normalized);
      if (recoveredFromIpfs) {
        const mergedCertificate = {
          ...certificate,
          ...recoveredFromIpfs,
          blockchainValid: false,
        } as Certificate;

        await upsertCertificateRecord(mergedCertificate as FirestoreCertificateRecord).catch((error) => {
          console.warn('Unable to persist recovered certificate from DB lookup:', error);
        });

        return {
          isValid: true,
          certificate: mergedCertificate,
          blockchainValid: false,
          message: 'Certificate recovered from IPFS. Blockchain record is missing or invalid.'
        };
      }

      return {
        isValid: false,
        certificate,
        blockchainValid: false,
        message: 'Certificate is not valid on-chain or on IPFS.'
      };
    }
  }

  const isExpired = certificate.expiresOn && new Date(certificate.expiresOn) < new Date();

  return {
    isValid: true,
    certificate,
    blockchainValid: true,
    message: isExpired
      ? 'Certificate has expired. Blockchain verification successful.'
      : 'Certificate verification successful on blockchain.'
  };
};

// Get user certificates
export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
  try {
    const [ownedCertificates, legacyCertificates] = await Promise.all([
      fetchCertificatesByOwnerField(userId),
      fetchLegacyCertificatesFromUserDoc(userId),
    ]);

    const mergedCertificates = uniqCertificates([...ownedCertificates, ...legacyCertificates]);
    const withBlockchainStatus = await hydrateBlockchainStatus(mergedCertificates);

    return withBlockchainStatus.sort((left, right) => {
      const leftDate = new Date(left.issuedOn).getTime();
      const rightDate = new Date(right.issuedOn).getTime();
      return rightDate - leftDate;
    });
  } catch (error) {
    console.error('Error getting user certificates:', error);
    
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to view these certificates. Please sign in again.');
    }
    
    throw new Error('Failed to load certificates. Please check your connection and try again.');
  }
};
