/**
 * Shared wagmi public client for the configured AMM chain (avoids circular imports).
 * Falls back to a direct HTTP client when the wagmi/AppKit transport is not yet
 * hydrated (e.g. cold load before wallet connects).
 */
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { getPublicClient } from 'wagmi/actions';
import { wagmiAdapter } from '../../config/reown';
import { CHAIN_ID } from '../../config/contracts';

export const ammWagmiConfig = wagmiAdapter.wagmiConfig;

/** Singleton fallback — created once, reused for every call before AppKit hydrates. */
let _fallbackClient: ReturnType<typeof createPublicClient> | null = null;

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

export function getAmmPublicClient() {
  // `getPublicClient` returns undefined when wagmi config has no transport for
  // this chainId yet (before AppKit finishes hydrating).  Use a direct HTTP
  // client as fallback so reads work immediately on page load.
  return getPublicClient(ammWagmiConfig, { chainId: CHAIN_ID }) ?? getFallbackPublicClient();
}
