/**
 * ERC-20 `decimals()` from chain, cached per address (listed + unknown tokens).
 */
import { readContract } from 'viem/actions';
import type { Address } from 'viem';
import { getListedTokenMeta, LISTED_TOKEN_META } from '../../config/tokens';
import type { Token } from '../../types';
import { erc20Abi } from '../../contracts/abis';
import { getAmmPublicClient } from './ammClient';

const decimalsCache = new Map<string, number>();
const symbolCache = new Map<string, string>();

export function cacheTokenDecimals(address: string, decimals: number): void {
  decimalsCache.set(address.toLowerCase(), decimals);
}

export function getCachedTokenDecimals(address: string): number | undefined {
  return decimalsCache.get(address.toLowerCase());
}

/**
 * ERC-20 `symbol()` when not in the static list; cached per address.
 * Falls back to a short address if the call fails (non-standard token).
 */
export async function fetchTokenSymbol(address: string): Promise<string> {
  const k = address.toLowerCase();
  const cached = symbolCache.get(k);
  if (cached !== undefined) return cached;
  const listed = getListedTokenMeta(address);
  if (listed) {
    symbolCache.set(k, listed.symbol);
    return listed.symbol;
  }
  try {
    const pc = getAmmPublicClient();
    const sym = (await readContract(pc, {
      address: address as Address,
      abi: erc20Abi,
      functionName: 'symbol',
    })) as string;
    const s = typeof sym === 'string' ? sym : String(sym);
    symbolCache.set(k, s);
    return s;
  } catch {
    const fb = `${address.slice(0, 6)}…${address.slice(-4)}`;
    symbolCache.set(k, fb);
    return fb;
  }
}

export async function fetchTokenDecimals(address: string): Promise<number> {
  const k = address.toLowerCase();
  const hit = decimalsCache.get(k);
  if (hit !== undefined) return hit;
  const pc = getAmmPublicClient();
  const d = (await readContract(pc, {
    address: address as Address,
    abi: erc20Abi,
    functionName: 'decimals',
  })) as number;
  decimalsCache.set(k, d);
  return d;
}

export async function mergeTokenDecimals(token: Token): Promise<Token> {
  const d = await fetchTokenDecimals(token.address);
  return { ...token, decimals: d };
}

/** Warm cache for all tokens in `LISTED_TOKEN_META` (parallel reads). */
export async function prefetchListedTokenDecimals(): Promise<void> {
  await Promise.all(LISTED_TOKEN_META.map(m => fetchTokenDecimals(m.address)));
}

/** Snapshot listed tokens using cached decimals (fallback 18 if not cached). */
export function listedTokensFromCache(): Token[] {
  return LISTED_TOKEN_META.map(m => ({
    ...m,
    decimals: getCachedTokenDecimals(m.address) ?? 18,
  }));
}
