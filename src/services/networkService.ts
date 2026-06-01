import { ethers } from 'ethers';
import { getExpectedChainId, getRpcUrl, SEPOLIA_CHAIN_ID_HEX, SEPOLIA_CHAIN_ID_DECIMAL, SEPOLIA_CHAIN_NAME, SEPOLIA_EXPLORER_URL } from '@/config/networks';

export function isSepolia(chainId: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID_DECIMAL;
}

export async function validateNetwork(provider: ethers.providers.BaseProvider): Promise<boolean> {
  const network = await provider.getNetwork();
  return isSepolia(network.chainId);
}

export async function addSepoliaNetwork(): Promise<void> {
  const ethereum = (window as any).ethereum;
  const rpcUrl = getRpcUrl();

  if (!ethereum || typeof ethereum.request !== 'function') {
    throw new Error('MetaMask is not available.');
  }

  if (!rpcUrl) {
    throw new Error('Missing RPC URL for Sepolia.');
  }

  await ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: SEPOLIA_CHAIN_ID_HEX,
        chainName: SEPOLIA_CHAIN_NAME,
        rpcUrls: [rpcUrl],
        blockExplorerUrls: [SEPOLIA_EXPLORER_URL],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      },
    ],
  });
}

export async function switchToSepolia(): Promise<void> {
  const ethereum = (window as any).ethereum;

  if (!ethereum || typeof ethereum.request !== 'function') {
    throw new Error('MetaMask is not available.');
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    if (error?.code === 4902) {
      await addSepoliaNetwork();
      return;
    }

    if (error?.code === 4001) {
      throw new Error('Network switch rejected by user.');
    }

    throw error;
  }
}

export async function ensureSepolia(provider: ethers.providers.BaseProvider): Promise<void> {
  const expectedChainId = getExpectedChainId();
  const network = await provider.getNetwork();

  if (network.chainId === expectedChainId) return;

  // If this provider is the injected provider (has request), attempt to switch
  const anyProvider = (provider as any);
  const ethereum = anyProvider?.provider ?? (window as any).ethereum;

  if (ethereum && typeof ethereum.request === 'function') {
    await switchToSepolia();
    return;
  }

  // Non-injected provider (JsonRpc) cannot be switched programmatically
  throw new Error(`Connected RPC (${network.chainId}) does not match expected chain (${expectedChainId}).`);
}
