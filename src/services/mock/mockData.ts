import type { Pool, Position, SwapQuote, PoolStats } from '../../types';
import { TOKENS } from '../../config/tokens';

const [TKA, TKB, WETH] = TOKENS;

export const MOCK_POOLS: Pool[] = [
  {
    address: '0xpool1',
    token0: TKA,
    token1: TKB,
    fee: 3000,
    sqrtPriceX96: '79228162514264337593543950336',
    tick: 0,
    liquidity: '1000000000000000000',
    price: 1.0,
    tvl: 2_450_000,
    volume24h: 342_000,
    feesEarned24h: 1_026,
  },
  {
    address: '0xpool2',
    token0: TKA,
    token1: TKB,
    fee: 500,
    sqrtPriceX96: '79228162514264337593543950336',
    tick: 0,
    liquidity: '500000000000000000',
    price: 1.0,
    tvl: 890_000,
    volume24h: 98_000,
    feesEarned24h: 49,
  },
  {
    address: '0xpool3',
    token0: TKA,
    token1: WETH,
    fee: 3000,
    sqrtPriceX96: '176364987744069840580948',
    tick: -6932,
    liquidity: '750000000000000000',
    price: 0.0005,
    tvl: 1_200_000,
    volume24h: 215_000,
    feesEarned24h: 645,
  },
];

export const MOCK_POSITIONS: Position[] = [
  {
    tokenId: 1,
    token0: TKA,
    token1: TKB,
    fee: 3000,
    tickLower: -600,
    tickUpper: 600,
    liquidity: '500000000000000000',
    tokensOwed0: '12340000000000000000',
    tokensOwed1: '11230000000000000000',
    priceLower: 0.9417,
    priceUpper: 1.0619,
    currentPrice: 1.0,
    inRange: true,
    amount0: 1234.0,
    amount1: 1123.0,
    unclaimedFees0: 12.34,
    unclaimedFees1: 11.23,
  },
  {
    tokenId: 2,
    token0: TKA,
    token1: TKB,
    fee: 500,
    tickLower: -100,
    tickUpper: 100,
    liquidity: '250000000000000000',
    tokensOwed0: '5670000000000000000',
    tokensOwed1: '0',
    priceLower: 0.99,
    priceUpper: 1.01,
    currentPrice: 1.0,
    inRange: true,
    amount0: 567.0,
    amount1: 0,
    unclaimedFees0: 5.67,
    unclaimedFees1: 0,
  },
  {
    tokenId: 3,
    token0: TKA,
    token1: WETH,
    fee: 3000,
    tickLower: -8000,
    tickUpper: -4000,
    liquidity: '100000000000000000',
    tokensOwed0: '0',
    tokensOwed1: '890000000000000000',
    priceLower: 0.00045,
    priceUpper: 0.00067,
    currentPrice: 0.0005,
    inRange: false,
    amount0: 0,
    amount1: 0.89,
    unclaimedFees0: 0,
    unclaimedFees1: 0.0089,
  },
];

export const MOCK_POOL_STATS: Record<string, PoolStats> = {
  [`${TKA.address}-${TKB.address}-3000`]: {
    price: 1.0,
    priceChange24h: 0.12,
    tvl: 2_450_000,
    volume24h: 342_000,
    fees24h: 1_026,
  },
  [`${TKA.address}-${TKB.address}-500`]: {
    price: 1.0,
    priceChange24h: 0.08,
    tvl: 890_000,
    volume24h: 98_000,
    fees24h: 49,
  },
  [`${TKA.address}-${WETH.address}-3000`]: {
    price: 0.0005,
    priceChange24h: -1.43,
    tvl: 1_200_000,
    volume24h: 215_000,
    fees24h: 645,
  },
};

export function getMockSwapQuote(
  amountIn: string,
  price: number,
  fee: number,
  slippage: number
): SwapQuote {
  const inNum = parseFloat(amountIn) || 0;
  const feeRate = fee / 1_000_000;
  const amountAfterFee = inNum * (1 - feeRate);
  const amountOut = amountAfterFee * price;
  const priceImpact = Math.min(inNum / 10000, 5);
  const amountOutAdjusted = amountOut * (1 - priceImpact / 100);
  const amountOutMinimum = amountOutAdjusted * (1 - slippage / 100);

  return {
    amountOut: amountOutAdjusted.toFixed(6),
    amountOutMinimum: amountOutMinimum.toFixed(6),
    priceImpact,
    executionPrice: price * (1 - priceImpact / 100),
    gasFee: '0.002',
  };
}
