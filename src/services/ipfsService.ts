
import axios from 'axios';
import { normalizeIPFSHash } from '@/lib/ipfs';

export const uploadToPinata = async (data: any): Promise<string | null> => {
  try {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    const secretApiKey = import.meta.env.VITE_PINATA_SECRET_API_KEY;
    
    if (!apiKey || !secretApiKey) {
      console.error('Pinata API keys not found in environment variables');
      return null;
    }
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data,
      {
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: secretApiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return normalizeIPFSHash(response.data.IpfsHash).raw;
  } catch (error) {
    console.error('IPFS upload error:', error);
    return null;
  }
};

export const getFromIPFS = async (ipfsHash: string): Promise<any> => {
  try {
    const { raw } = normalizeIPFSHash(ipfsHash);
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${raw}`);
    return response.data;
  } catch (error) {
    console.error('IPFS fetch error:', error);
    return null;
  }
};
