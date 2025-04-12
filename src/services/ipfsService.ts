
import axios from 'axios';

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
    
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('IPFS upload error:', error);
    return null;
  }
};

export const getFromIPFS = async (ipfsHash: string): Promise<any> => {
  try {
    // Remove ipfs:// prefix if it exists
    const hash = ipfsHash.replace('ipfs://', '');
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
    return response.data;
  } catch (error) {
    console.error('IPFS fetch error:', error);
    return null;
  }
};
