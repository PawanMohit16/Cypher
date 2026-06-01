import { isMetaMaskInstalled, connectWallet, getProvider, getSigner, resetWalletState, attachWalletListeners, recreateProvider } from './walletService';
import { addSepoliaNetwork, ensureSepolia, isSepolia, switchToSepolia, validateNetwork } from './networkService';
import { getReadContract, getWriteContract, getSafeSigner } from './contractService';
import { issueCertificateOnChain, validateCertificateOnChain, getCertificateFromChain } from './transactionService';

export {
  isMetaMaskInstalled,
  connectWallet as connectMetaMask,
  getProvider,
  getSigner,
  resetWalletState,
  attachWalletListeners,
  recreateProvider,
  addSepoliaNetwork,
  ensureSepolia,
  isSepolia,
  switchToSepolia,
  validateNetwork,
  getReadContract,
  getWriteContract,
  getSafeSigner,
  issueCertificateOnChain,
  validateCertificateOnChain,
  getCertificateFromChain,
};

export async function getCurrentChainId(): Promise<number | null> {
  const provider = getProvider();
  if (!provider) {
    return null;
  }

  try {
    const network = await provider.getNetwork();
    return network.chainId;
  } catch {
    return null;
  }
}
