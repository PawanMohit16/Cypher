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
    const rpcUrl = import.meta.env.VITE_RPC_URL || '';
    
    if (!contractAddress) {
      const errorMsg = 'Contract address not found in environment variables. Please check your .env file.';
      console.error(errorMsg);
      toast({
        title: 'Configuration Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    }

    // Ensure the contract address is properly checksummed
    try {
      contractAddress = ethers.utils.getAddress(contractAddress);
    } catch (error) {
      console.error('Invalid contract address:', error);
      toast({
        title: 'Configuration Error',
        description: 'Invalid contract address in configuration.',
        variant: 'destructive',
      });
      return null;
    }

    if (!rpcUrl) {
      console.warn('RPC URL not found in environment variables. Using default provider.');
    } else {
      // Use custom RPC provider if available
      provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }
    
    // Initialize contract
    contract = new ethers.Contract(contractAddress, CertVaultABI, signer);
    
    return address;
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    
    let errorMessage = 'Failed to connect to MetaMask';
    if (error.code === 4001) {
      errorMessage = 'Please connect to MetaMask to continue';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast({
      title: 'Connection Failed',
      description: errorMessage,
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
  // First, ensure we're connected to MetaMask
  if (!contract || !signer) {
    const connectedAddress = await connectMetaMask();
    if (!connectedAddress) {
      toast({
        title: 'Blockchain Connection Required',
        description: 'Please connect your MetaMask wallet to issue certificates.',
        variant: 'destructive',
      });
      return false;
    }
  }

  try {
    // Remove "ipfs://" prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    // Show pending transaction toast
    const pendingToast = toast({
      title: 'Processing Transaction',
      description: 'Please confirm the transaction in MetaMask...',
      duration: 10000, // 10 seconds
    });
    
    const tx = await contract.issueCertificate(recipientName, courseName, hash);
    
    // Update toast to show transaction is being mined
    toast({
      id: pendingToast,
      title: 'Transaction Submitted',
      description: 'Waiting for transaction confirmation...',
      duration: 10000,
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      toast({
        title: 'Success!',
        description: 'Certificate has been successfully recorded on the blockchain.',
      });
      return true;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error: any) {
    console.error('Error issuing certificate on chain:', error);
    
    let errorMessage = 'Failed to issue certificate on the blockchain.';
    
    // Handle specific MetaMask errors
    if (error.code === 4001) {
      errorMessage = 'Transaction was rejected by user.';
    } else if (error.code === -32603) {
      errorMessage = 'Transaction failed. You may not have enough ETH for gas.';
    } else if (error.message?.includes('user rejected transaction')) {
      errorMessage = 'Transaction was rejected by user.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast({
      title: 'Transaction Failed',
      description: errorMessage,
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
