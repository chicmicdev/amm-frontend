/**
 * Lending market — Base Sepolia (chain 84532)
 * Pool contract addresses for the integrated lending protocol on this network.
 */

export const LENDING_CHAIN_ID = 84532; // Base Sepolia

export const LENDING_CONTRACTS = {
  POOL:                     '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27',
  POOL_ADDRESSES_PROVIDER:  '0xE4C23309117Aa30342BFaae6c95c6478e0A4Ad00',
  UI_POOL_DATA_PROVIDER:    '0x6a9D64f93DB660EaCB2b6E9424792c630CdA87d8',
  UI_INCENTIVE_DATA_PROVIDER: '0xDB1412acf288D5bE057f8e90fd7b1BF4f84bB3B1',
  WALLET_BALANCE_PROVIDER:  '0x2c4D1F4EC7F4FfA09a5E1C9e74fD3A10f21Bd811',
  WETH_GATEWAY:             '0x0568130e794429D2eEBC4dafE18f25Ff1a1ed8b6',
  ORACLE:                   '0x943b0dE18d4abf4eF02A85912F8fc07684C141dF',
} as const;

/** Example / reference token metadata for Base Sepolia test assets */
export const LENDING_ASSETS = {
  USDC: {
    symbol: 'USDC',
    address: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f',
    decimals: 6,
    logoColor: '#2775ca',
  },
  WETH: {
    symbol: 'WETH',
    address: '0xE5Fc7d0C7C4e7b6e4a1efFe9db1b2e4a88b89b1a',
    decimals: 18,
    logoColor: '#627eea',
  },
} as const;

export const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

/** Interest rate mode: 1 = stable (deprecated in V3.2), 2 = variable */
export const INTEREST_RATE_MODE = {
  VARIABLE: 2,
} as const;

/** Protocol referral code — 0 means none */
export const REFERRAL_CODE = 0;
