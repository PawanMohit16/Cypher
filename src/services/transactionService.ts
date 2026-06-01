import { getReadContract, getWriteContract } from './contractService';
import { ensureSepolia } from './networkService';
import { getOrCreateProvider } from './walletService';
import { normalizeWeb3Error } from './errorHandler';
import { normalizeIPFSHash } from '@/lib/ipfs';

export type TransactionOptions = {
  retries?: number;
  timeoutMs?: number;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Transaction timed out.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readIssuedHashFromReceipt(receipt: any, contract: ReturnType<typeof getWriteContract>): string | null {
  const logs = Array.isArray(receipt?.logs) ? receipt.logs : [];

  for (const log of logs) {
    try {
      if (!log || log.address?.toLowerCase?.() !== contract.address.toLowerCase()) {
        continue;
      }

      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'CertificateIssued') {
        const emittedHash = parsed.args?.ipfsHash ?? parsed.args?.[0];
        if (typeof emittedHash === 'string') {
          return normalizeIPFSHash(emittedHash).raw;
        }
      }
    } catch {
      // Ignore logs that do not belong to this contract or cannot be parsed.
    }
  }

  return null;
}

async function hasCertificateEventOnChain(
  contract: ReturnType<typeof getReadContract>,
  candidateHashes: string[]
): Promise<boolean> {
  const provider = contract.provider;
  if (!provider || typeof provider.getLogs !== 'function') {
    return false;
  }

  const issuedTopic = contract.interface.getEventTopic('CertificateIssued');
  const revokedTopic = contract.interface.getEventTopic('CertificateRevoked');
  const [latestBlock, issuedLogs, revokedLogs] = await Promise.all([
    provider.getBlockNumber().catch(() => null),
    provider.getLogs({ address: contract.address, fromBlock: 0, toBlock: 'latest', topics: [issuedTopic] }).catch(() => []),
    provider.getLogs({ address: contract.address, fromBlock: 0, toBlock: 'latest', topics: [revokedTopic] }).catch(() => []),
  ]);

  if (latestBlock === null) {
    return false;
  }

  const issuedHashes = new Set<string>();
  const revokedHashes = new Set<string>();

  for (const log of issuedLogs) {
    try {
      const parsed = contract.interface.parseLog(log);
      const emittedHash = parsed.args?.ipfsHash ?? parsed.args?.[0];
      if (typeof emittedHash === 'string') {
        issuedHashes.add(normalizeIPFSHash(emittedHash).raw);
      }
    } catch {
      // ignore malformed logs
    }
  }

  for (const log of revokedLogs) {
    try {
      const parsed = contract.interface.parseLog(log);
      const emittedHash = parsed.args?.ipfsHash ?? parsed.args?.[0];
      if (typeof emittedHash === 'string') {
        revokedHashes.add(normalizeIPFSHash(emittedHash).raw);
      }
    } catch {
      // ignore malformed logs
    }
  }

  return candidateHashes.some((candidate) => issuedHashes.has(candidate) && !revokedHashes.has(candidate));
}

export async function issueCertificateOnChain(
  recipientName: string,
  courseName: string,
  ipfsHash: string,
  options: TransactionOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 120000;
  const retries = options.retries ?? 1;
  const provider = getOrCreateProvider();
  const normalized = normalizeIPFSHash(ipfsHash);

  await ensureSepolia(provider);

  const contract = getWriteContract();
  const hash = normalized.raw;
  const fromAddress = await contract.signer.getAddress();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await contract.estimateGas.issueCertificate(recipientName, courseName, hash, {
        from: fromAddress,
      });

      const tx = await contract.issueCertificate(recipientName, courseName, hash);
      const receipt = await withTimeout(tx.wait(1), timeoutMs);

      if (receipt.status !== 1) {
        throw new Error('Transaction failed on-chain.');
      }

      const eventHash = readIssuedHashFromReceipt(receipt, contract);
      if (eventHash && eventHash !== hash) {
        throw new Error('Issued certificate hash does not match the transaction event payload.');
      }

      try {
        const cert = await contract.getCertificate(hash);
        const storedHash = normalizeIPFSHash(cert.ipfsHash || hash).raw;
        if (storedHash !== hash) {
          console.warn('On-chain certificate hash mismatch after issuance:', {
            submittedHash: hash,
            storedHash,
            txHash: tx.hash,
          });
        }
        if (Number(cert.issuedOn?.toString?.() ?? cert.issuedOn ?? 0) <= 0) {
          console.warn('On-chain certificate record looks incomplete after issuance:', {
            submittedHash: hash,
            txHash: tx.hash,
          });
        }
      } catch (verificationError: any) {
        console.warn('Best-effort on-chain readback failed after issuance:', {
          submittedHash: hash,
          txHash: tx.hash,
          error: verificationError?.message || verificationError,
        });

        if (!eventHash) {
          console.warn('Certificate issuance receipt did not include a parseable event:', {
            submittedHash: hash,
            txHash: tx.hash,
          });
        }
      }

      return tx.hash;
    } catch (error: any) {
      const normalized = normalizeWeb3Error(error);
      if (attempt < retries && normalized.retryable) {
        continue;
      }
      throw new Error(normalized.message);
    }
  }

  throw new Error('Transaction failed unexpectedly.');
}

export async function validateCertificateOnChain(ipfsHash: string): Promise<boolean> {
  const provider = getOrCreateProvider();
  const { candidates } = normalizeIPFSHash(ipfsHash);

  try {
    await ensureSepolia(provider as any);
  } catch (err: any) {
    // If the provider is a non-injected JsonRpcProvider, it cannot be switched programmatically.
    // In that case, assume read-only validation is still possible and continue.
    const anyProv = (provider as any);
    const ethereum = anyProv?.provider ?? (window as any).ethereum;

    if (ethereum && typeof ethereum.request === 'function') {
      // injected provider failed to switch; rethrow so caller can handle
      throw err;
    }
    // otherwise fallthrough to read from RPC provider
  }

  const contract = getReadContract();
  try {
    for (const candidate of candidates) {
      try {
        if (Boolean(await contract.validateCertificate(candidate))) {
          return true;
        }
      } catch {
        try {
          const cert = await contract.getCertificate(candidate);
          if (cert && Number(cert.issuedOn?.toString?.() ?? cert.issuedOn ?? 0) > 0) {
            const revokedAt = cert.revokedAt ? Number(cert.revokedAt.toString()) : 0;
            if (revokedAt === 0) {
              return true;
            }
          }
        } catch {
          // Try the next candidate form.
        }
      }
    }

    return await hasCertificateEventOnChain(contract, candidates);
  } catch {
    return false;
  }
}

export async function getCertificateFromChain(ipfsHash: string): Promise<any> {
  const provider = getOrCreateProvider();
  const { candidates, raw } = normalizeIPFSHash(ipfsHash);

  try {
    await ensureSepolia(provider as any);
  } catch (err: any) {
    const anyProv = (provider as any);
    const ethereum = anyProv?.provider ?? (window as any).ethereum;
    if (ethereum && typeof ethereum.request === 'function') {
      throw err;
    }
    // continue for JsonRpcProvider
  }

  const contract = getReadContract();
  let certData: any;
  for (const candidate of candidates) {
    try {
      certData = await contract.getCertificate(candidate);
      break;
    } catch {
      certData = undefined;
    }
  }

  if (!certData) {
    throw new Error(`Certificate does not exist on-chain for ${raw}`);
  }

  return {
    recipientName: certData.recipientName,
    courseName: certData.courseName,
    ipfsHash: normalizeIPFSHash(certData.ipfsHash || raw).raw,
    issuedOn: new Date(certData.issuedOn.toNumber() * 1000).toISOString(),
  };
}
