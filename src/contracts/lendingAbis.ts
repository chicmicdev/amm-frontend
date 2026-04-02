/**
 * Minimal lending pool ABI (supply / borrow / repay / withdraw + reserve / user views).
 */
export const LENDING_POOL_ABI = [
  // ── Write functions ─────────────────────────────────────────────────────────

  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset',        type: 'address' },
      { name: 'amount',       type: 'uint256' },
      { name: 'onBehalfOf',   type: 'address' },
      { name: 'referralCode', type: 'uint16'  },
    ],
    outputs: [],
  },
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset',            type: 'address' },
      { name: 'amount',           type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
      { name: 'referralCode',     type: 'uint16'  },
      { name: 'onBehalfOf',       type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'repay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset',            type: 'address' },
      { name: 'amount',           type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
      { name: 'onBehalfOf',       type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset',  type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to',     type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },

  // ── View functions ───────────────────────────────────────────────────────────

  {
    name: 'getReserveData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'configuration',           type: 'uint256' },
          { name: 'liquidityIndex',          type: 'uint128' },
          { name: 'currentLiquidityRate',    type: 'uint128' },
          { name: 'variableBorrowIndex',     type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp',     type: 'uint40'  },
          { name: 'id',                      type: 'uint16'  },
          { name: 'aTokenAddress',           type: 'address' },
          { name: 'stableDebtTokenAddress',  type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury',       type: 'uint128' },
          { name: 'unbacked',                type: 'uint128' },
          { name: 'isolationModeTotalDebt',  type: 'uint128' },
        ],
      },
    ],
  },
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase',       type: 'uint256' },
      { name: 'totalDebtBase',             type: 'uint256' },
      { name: 'availableBorrowsBase',      type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv',                       type: 'uint256' },
      { name: 'healthFactor',              type: 'uint256' },
    ],
  },
  {
    name: 'getReservesList',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
] as const;

/** Price oracle — getAssetPrice returns USD with 8 decimals */
export const LENDING_ORACLE_ABI = [
  {
    name: 'getAssetPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getAssetsPrices',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'address[]' }],
    outputs: [{ type: 'uint256[]' }],
  },
] as const;

/** Minimal ERC-20 ABI for approve + balanceOf */
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;
