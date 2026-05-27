/**
 * Deployed contract addresses (sync with your deployment log).
 * ABIs are inlined in the app — see `src/contracts/abis.ts` and `src/contracts/inlinedAbis.ts`.
 */
export const CONTRACTS = {
  WETH9: '0x5A5c039086d2EbC2104AAaD041421304DBA79c8C',
  Factory: '0x37874728AA16Cc3cFa4196612071fc8129AF8e05',
  SwapRouter: '0x74d1bB973A524Cd17cBEC489eA05E78Bc7201EDE',
  NonfungiblePositionManager: '0x26c03A3B131Ce8Cc590f97975C5197e5D8b7105b',
  LiquidityHelper: '0x22a2fA1c5033f2CA0B31c13AAC65216dE3728774',
  /** `StakingPool.sol` — stake stakingToken, earn rewardToken */
  StakingPool: '0x172A0688D35Cf30c7D8e5DA7a1dEF5aa848fB841',
} as const;

/**
 * Chain where the above contracts are deployed.
 * Polygon Amoy testnet (80002). For Hardhat local, use 31337 and matching addresses.
 * Optional RPC override: `VITE_POLYGON_AMOY_RPC` in `.env` (see `config/reown.ts`).
 */
export const CHAIN_ID = 80_002;

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

/**
 * Explicit gas overrides for Polygon Amoy testnet.
 * Amoy RPCs occasionally return wildly inflated maxFeePerGas estimates that
 * exceed viem's 1-ether built-in cap. Capping both the price and the gas limit
 * keeps fees predictable while leaving plenty of headroom for each operation.
 *
 * maxFeePerGas = 100 gwei  (Amoy rarely goes above 30 gwei in practice)
 * maxPriorityFeePerGas = 30 gwei
 */
export const GAS = {
  maxFeePerGas:         100_000_000_000n, // 100 gwei
  maxPriorityFeePerGas:  30_000_000_000n, //  30 gwei
  limits: {
    approve:           80_000n,  // standard ERC-20 approve
    swap:             300_000n,  // Uniswap V3 exactInputSingle
    mint:             500_000n,  // NPM mint (new position)
    increaseLiquidity: 400_000n, // NPM increaseLiquidity
    decreaseLiquidity: 300_000n, // NPM decreaseLiquidity
    collect:          200_000n,  // NPM collect fees
    burn:             150_000n,  // NPM burn (close position)
  },
} as const;

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
