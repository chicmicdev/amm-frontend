import type { Address } from 'viem';

/** Uniswap V3 `IUniswapV3Pool.slot0()` tuple. */
export type PoolSlot0Tuple = readonly [
  sqrtPriceX96: bigint,
  tick: number,
  observationIndex: number,
  observationCardinality: number,
  observationCardinalityNext: number,
  feeProtocol: number,
  unlocked: boolean,
];

/** `INonfungiblePositionManager.positions(uint256)` return tuple. */
export type NpmPositionsTuple = readonly [
  nonce: bigint,
  operator: Address,
  token0: Address,
  token1: Address,
  fee: number,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint,
  feeGrowthInside0LastX128: bigint,
  feeGrowthInside1LastX128: bigint,
  tokensOwed0: bigint,
  tokensOwed1: bigint,
];

export type Erc721TransferArgs = {
  from: Address;
  to: Address;
  tokenId: bigint;
};
