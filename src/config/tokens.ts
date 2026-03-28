import type { Token } from '../types';

export const TOKENS: Token[] = [
  {
    address: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
    logoColor: '#58a6ff',
  },
  {
    address: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
    symbol: 'TKB',
    name: 'Token B',
    decimals: 18,
    logoColor: '#bc8cff',
  },
  {
    address: '0x9A676e781A523b5d0C0e43731313A708CB607508',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoColor: '#3fb950',
  },
];

export const TOKEN_MAP: Record<string, Token> = Object.fromEntries(
  TOKENS.map(t => [t.address.toLowerCase(), t])
);

export const DEFAULT_TOKEN_IN = TOKENS[0];
export const DEFAULT_TOKEN_OUT = TOKENS[1];
