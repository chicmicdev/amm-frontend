export const CONTRACTS = {
  Factory: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  SwapRouter: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
  NonfungiblePositionManager: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
  WETH9: '0x9A676e781A523b5d0C0e43731313A708CB607508',
} as const;

export const CHAIN_ID = 31337;

export const FEE_TIERS = [
  { fee: 500, label: '0.05%', tickSpacing: 10, description: 'Best for stable pairs' },
  { fee: 3000, label: '0.3%', tickSpacing: 60, description: 'Best for most pairs' },
  { fee: 10000, label: '1%', tickSpacing: 200, description: 'Best for exotic pairs' },
] as const;

export const FEE_TO_TICK_SPACING: Record<number, number> = {
  500: 10,
  3000: 60,
  10000: 200,
};

export const MAX_TICK = 887272;
export const MIN_TICK = -887272;

export const CONTRACT_ERRORS: Record<string, string> = {
  IT: 'The two tokens must be different',
  '0A': 'Token address cannot be zero',
  FE: 'Invalid fee tier selected',
  PE: 'This pool already exists',
  AI: 'Pool has already been initialized',
  LOK: 'Transaction blocked, please try again',
  IL: 'Liquidity amount must be greater than zero',
  AS: 'Swap amount cannot be zero',
  SPL: 'Price limit out of bounds',
  M0: 'Insufficient token transfer to pool',
  M1: 'Insufficient token transfer to pool',
  IIA: 'Insufficient input amount for swap',
  TF: 'Token transfer failed, check approvals',
  LO: 'Maximum liquidity per tick exceeded',
  'Price slippage check': 'Price moved too much, increase slippage tolerance',
  'Transaction too old': 'Transaction deadline expired, please retry',
  'Not approved': "You don't own this position NFT",
  'Too little received': 'Slippage too low or price moved — increase slippage and retry',
};
