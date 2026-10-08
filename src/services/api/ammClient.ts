/**
 * Shared wagmi public client for the configured AMM chain (avoids circular imports).
 * Falls back to a direct HTTP client when the wagmi/AppKit transport is not yet
 * hydrated (e.g. cold load before wallet connects).
 */
import { createPublicClient, http } from 'viem';
import type { Address } from 'viem';
import { getTransactionCount } from 'viem/actions';
import { polygonAmoy } from 'viem/chains';
import { getPublicClient as wagmiGetPublicClient } from 'wagmi/actions';
import { wagmiAdapter } from '../../config/reown';
import { CHAIN_ID } from '../../config/contracts';
import { submitWithManagedNonce } from './transactionNonceManager';

export const ammWagmiConfig = wagmiAdapter.wagmiConfig;

/** Singleton fallback — created once, reused for every call before AppKit hydrates. */
let _fallbackClient: ReturnType<typeof createPublicClient> | null = null;
let _historyFallbackClient: ReturnType<typeof createPublicClient> | null = null;

function getFallbackPublicClient() {
  if (!_fallbackClient) {
    const rpc =
      (import.meta.env.VITE_POLYGON_AMOY_RPC as string | undefined)?.trim() ||
      'https://rpc-amoy.polygon.technology';
    _fallbackClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(rpc),
    });
  }
  return _fallbackClient;
}

function getFallbackHistoryPublicClient() {
  if (!_historyFallbackClient) {
    const rpc =
      (import.meta.env.VITE_POLYGON_AMOY_HISTORY_RPC as string | undefined)?.trim() ||
      (import.meta.env.VITE_POLYGON_AMOY_RPC as string | undefined)?.trim() ||
      'https://rpc-amoy.polygon.technology';
    _historyFallbackClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(rpc),
    });
  }
  return _historyFallbackClient;
}

export function getPublicClient() {
  // `getPublicClient` returns undefined when wagmi config has no transport for
  // this chainId yet (before AppKit finishes hydrating).  Use a direct HTTP
  // client as fallback so reads work immediately on page load.
  return wagmiGetPublicClient(ammWagmiConfig, { chainId: CHAIN_ID }) ?? getFallbackPublicClient();
}

export function submitAmmTransaction(
  account: Address,
  submit: (nonce: number) => Promise<`0x${string}`>,
): Promise<`0x${string}`> {
  return submitWithManagedNonce({
    account,
    chainId: CHAIN_ID,
    getNetworkNonce: async () => {
      // Use both views because providers may expose accepted transactions in
      // `pending` before they are visible in `latest` (or vice versa briefly).
      const [latest, pending] = await Promise.all([
        getTransactionCount(getPublicClient(), { address: account, blockTag: 'latest' }),
        getTransactionCount(getPublicClient(), { address: account, blockTag: 'pending' }),
      ]);
      return Math.max(latest, pending);
    },
    submit,
  });
}

export function getHistoryPublicClient() {
  return wagmiGetPublicClient(ammWagmiConfig, { chainId: CHAIN_ID }) ?? getFallbackHistoryPublicClient();
}
