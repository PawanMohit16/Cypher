
// Environment variables type definitions
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_CHAIN_ID?: string; // e.g. "11155111" or "0xaa36a7" for Sepolia
  readonly VITE_PINATA_API_KEY: string;
  readonly VITE_PINATA_SECRET_API_KEY: string;
  readonly VITE_PRIVATE_KEY: string;
}
