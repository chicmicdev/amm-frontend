/**
 * Shared wagmi public client for the configured AMM chain (avoids circular imports).
 */
import { getPublicClient } from 'wagmi/actions';
import { wagmiAdapter } from '../../config/reown';
import { CHAIN_ID } from '../../config/contracts';

export const ammWagmiConfig = wagmiAdapter.wagmiConfig;

export function getAmmPublicClient() {
  const pc = getPublicClient(ammWagmiConfig, { chainId: CHAIN_ID });
  if (!pc) {
    throw new Error(
      `No RPC for chain ${CHAIN_ID}. Add the network in your wallet / AppKit or point the app at a reachable RPC.`
    );
  }
  return pc;
}
