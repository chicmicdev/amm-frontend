import type { Token } from '../types';

/** Static registry (no decimals — loaded from ERC-20 `decimals()` on chain). */
export type ListedTokenMeta = Omit<Token, 'decimals'>;

/** Sync with `AMM_v3-main/deployments/amoy-latest.json` (or deploy log). */
export const LISTED_TOKEN_META: ListedTokenMeta[] = [
  {
    address: '0x7ba2199aA5191D5255B1f653031263a7F977C782',
    symbol: 'dUSDC',
    name: 'dUSDC',
    logoColor: '#2775ca',
  },
  {
    address: '0x12a903df873e4627926a85100bea6F7F07EbB6Bf',
    symbol: 'dWETH',
    name: 'dWETH',
    logoColor: '#627eea',
  },
  {
    address: '0x0145A755A7E0e34cb1bCCd886617d57f9b20b94B',
    symbol: 'dWBTC',
    name: 'dWBTC',
    logoColor: '#f7931a',
  },
  {
    address: '0x4D0B3b4Fa0b117A06aD8fe96aB4f29840b306E32',
    symbol: 'dDAI',
    name: 'dDAI',
    logoColor: '#f5ac37',
  },
  {
    address: '0x93dc66aaD35559B9E0E0a311820400064f60F910',
    symbol: 'dMATIC',
    name: 'dMATIC',
    logoColor: '#8247e5',
  },
  {
    address: '0x69Be8db62b93b718Af2ceaa5950D3b1fC987E9fD',
    symbol: 'dLINK',
    name: 'dLINK',
    logoColor: '#375bd2',
  },
  {
    address: '0x5A5c039086d2EbC2104AAaD041421304DBA79c8C',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    logoColor: '#3fb950',
  },
];

export const LISTED_TOKEN_ADDRESSES = LISTED_TOKEN_META.map(t => t.address);

export function getListedTokenMeta(address: string): ListedTokenMeta | undefined {
  return LISTED_TOKEN_META.find(t => t.address.toLowerCase() === address.toLowerCase());
}

/** Until on-chain decimals load, UI uses 18 (overwritten by `TokensProvider`). */
const PLACEHOLDER_DECIMALS = 18;

export function tokensWithPlaceholderDecimals(): Token[] {
  return LISTED_TOKEN_META.map(t => ({ ...t, decimals: PLACEHOLDER_DECIMALS }));
}

/**
 * Legacy sync list — decimals are placeholders until `prefetchListedTokenDecimals` + context refresh.
 * Prefer `useTokens()` from `TokensContext` in React.
 */
export const TOKENS: Token[] = tokensWithPlaceholderDecimals();

export const TOKEN_MAP: Record<string, Token> = Object.fromEntries(
  TOKENS.map(t => [t.address.toLowerCase(), t])
);

export const DEFAULT_TOKEN_IN = TOKENS[0];
export const DEFAULT_TOKEN_OUT = TOKENS[1];
