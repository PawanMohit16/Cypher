
import { ethers } from 'ethers';
import CertVaultABI from '../contracts/CertVault.json';
import { toast } from '@/hooks/use-toast';

let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null;
let contract: ethers.Contract | null = null;
let contractAddress = '';

// Check if MetaMask is installed
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && window.ethereum !== undefined;
};

// Connect to MetaMask
export const connectMetaMask = async (): Promise<string | null> => {
  if (!isMetaMaskInstalled()) {
    toast({
      title: 'MetaMask Not Found',
      description: 'Please install MetaMask to use this application.',
      variant: 'destructive',
    });
    return null;
  }

  try {
    // Request account access
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    
    contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '';
    if (!contractAddress) {
      console.error('Contract address not found in environment variables');
    } else {
      contract = new ethers.Contract(contractAddress, CertVaultABI, signer);
    }
    
    return address;
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    toast({
      title: 'Connection Failed',
      description: 'Failed to connect to MetaMask. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
};

// Issue certificate on blockchain
export const issueCertificateOnChain = async (
  recipientName: string,
  courseName: string,
  ipfsHash: string
): Promise<boolean> => {
  if (!contract || !signer) {
    toast({
      title: 'Blockchain Connection Error',
      description: 'Please connect to MetaMask first.',
      variant: 'destructive',
    });
    return false;
  }

  try {
    // Remove "ipfs://" prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    
    const tx = await contract.issueCertificate(recipientName, courseName, hash);
    await tx.wait();
    
    toast({
      title: 'Certificate Issued',
      description: 'Certificate has been successfully recorded on the blockchain.',
    });
    return true;
  } catch (error) {
    console.error('Error issuing certificate on chain:', error);
    toast({
      title: 'Transaction Failed',
      description: 'Failed to issue certificate on the blockchain.',
      variant: 'destructive',
    });
    return false;
  }
};

// Validate certificate on blockchain
export const validateCertificateOnChain = async (ipfsHash: string): Promise<boolean> => {
  if (!contract || !signer) {
    await connectMetaMask();
    if (!contract || !signer) return false;
  }

  try {
    // Remove "ipfs://" prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    
    const isValid = await contract.validateCertificate(hash);
    return isValid;
  } catch (error) {
    console.error('Error validating certificate on chain:', error);
    return false;
  }
};

// Get certificate details from blockchain
export const getCertificateFromChain = async (ipfsHash: string): Promise<any> => {
  if (!contract || !signer) {
    await connectMetaMask();
    if (!contract || !signer) return null;
  }

  try {
    // Remove "ipfs://" prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    
    const certData = await contract.getCertificate(hash);
    return {
      recipientName: certData.recipientName,
      courseName: certData.courseName,
      ipfsHash: certData.ipfsHash,
      issuedOn: new Date(certData.issuedOn.toNumber() * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error getting certificate from chain:', error);
    return null;
  }
};
