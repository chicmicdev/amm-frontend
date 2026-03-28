/**
 * ERC-20 `decimals()` from chain, cached per address (listed + unknown tokens).
 */
import { readContract } from 'viem/actions';
import type { Address } from 'viem';
import { LISTED_TOKEN_META } from '../../config/tokens';
import type { Token } from '../../types';
import { erc20Abi } from '../../contracts/abis';
import { getAmmPublicClient } from './ammClient';

const decimalsCache = new Map<string, number>();

export function cacheTokenDecimals(address: string, decimals: number): void {
  decimalsCache.set(address.toLowerCase(), decimals);
}

export function getCachedTokenDecimals(address: string): number | undefined {
  return decimalsCache.get(address.toLowerCase());
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
