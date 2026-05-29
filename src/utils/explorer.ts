import { CHAIN_ID } from '../config/contracts';

/** Block explorer URL for a transaction hash, or null for local / unsupported chains. */
export function getTxExplorerUrl(hash: string): string | null {
  const id = CHAIN_ID as number;
  if (id === 1) return `https://etherscan.io/tx/${hash}`;
  if (id === 11155111) return `https://sepolia.etherscan.io/tx/${hash}`;
  if (id === 80_002) return `https://amoy.polygonscan.com/tx/${hash}`;
  return null;
}
