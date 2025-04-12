
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { connectMetaMask, isMetaMaskInstalled } from '@/services/web3Service';
import { useToast } from '@/hooks/use-toast';

interface MetaMaskButtonProps {
  onConnect?: (address: string) => void;
}

const MetaMaskButton: React.FC<MetaMaskButtonProps> = ({ onConnect }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const userAddress = await connectMetaMask();
      if (userAddress) {
        setAddress(userAddress);
        if (onConnect) onConnect(userAddress);
        
        toast({
          title: 'Connected to MetaMask',
          description: `Connected to ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`,
        });
      }
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if MetaMask is available
  useEffect(() => {
    if (!isMetaMaskInstalled()) {
      toast({
        title: 'MetaMask Not Detected',
        description: 'Please install MetaMask to use blockchain features.',
        variant: 'destructive',
      });
    }
  }, []);

  return (
    <Button 
      onClick={handleConnect}
      disabled={isConnecting || !isMetaMaskInstalled()}
      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90"
    >
      {isConnecting ? 
        <span className="flex items-center">
          <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
          Connecting...
        </span>
       : 
        address ? 
          `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
          : 
          'Connect MetaMask'
      }
    </Button>
  );
};

export default MetaMaskButton;
