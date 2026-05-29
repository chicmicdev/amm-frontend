/**
 * Spot quote for exact-in single-hop swap (ignores price impact / tick crossings).
 * Matches Uniswap V3 direction: zeroForOne = tokenIn is pool token0.
 */
export function quoteExactInputSingleSpot(
  sqrtPriceX96: bigint,
  amountIn: bigint,
  fee: number,
  zeroForOne: boolean
): bigint {
  if (amountIn === 0n || sqrtPriceX96 === 0n) return 0n;
  const feeComp = 1_000_000n - BigInt(fee);
  const amountInAfterFee = (amountIn * feeComp) / 1_000_000n;
  const two192 = 2n ** 192n;
  const sq = sqrtPriceX96 * sqrtPriceX96;
  if (zeroForOne) {
    return (amountInAfterFee * sq) / two192;
  }
  if (sq === 0n) return 0n;
  return (amountInAfterFee * two192) / sq;
}
