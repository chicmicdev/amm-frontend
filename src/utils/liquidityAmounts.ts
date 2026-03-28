/**
 * Uniswap V3 LiquidityAmounts-style helpers (token1 per token0 pricing).
 */
const Q96 = 2n ** 96n;

function mulDiv(a: bigint, b: bigint, denom: bigint): bigint {
  return (a * b) / denom;
}

export function getAmount0ForLiquidity(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity: bigint): bigint {
  let a = sqrtRatioAX96;
  let b = sqrtRatioBX96;
  if (a > b) [a, b] = [b, a];
  if (a === 0n || b === 0n) return 0n;
  return mulDiv(mulDiv(liquidity << 96n, b - a, b), 1n, a);
}

export function getAmount1ForLiquidity(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity: bigint): bigint {
  let a = sqrtRatioAX96;
  let b = sqrtRatioBX96;
  if (a > b) [a, b] = [b, a];
  return mulDiv(liquidity, b - a, Q96);
}

export function getAmountsForLiquidity(
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  let a = sqrtRatioAX96;
  let b = sqrtRatioBX96;
  if (a > b) [a, b] = [b, a];

  if (sqrtRatioX96 <= a) {
    return { amount0: getAmount0ForLiquidity(a, b, liquidity), amount1: 0n };
  }
  if (sqrtRatioX96 < b) {
    return {
      amount0: getAmount0ForLiquidity(sqrtRatioX96, b, liquidity),
      amount1: getAmount1ForLiquidity(a, sqrtRatioX96, liquidity),
    };
  }
  return { amount0: 0n, amount1: getAmount1ForLiquidity(a, b, liquidity) };
}

/** Human price token1 per 1 token0 from sqrtPriceX96 (avoids float overflow on large Q64.96 values). */
export function sqrtPriceX96ToPriceToken1PerToken0(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 === 0n) return 0;
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * 10n ** 18n) / 2n ** 192n;
  return Number(scaled) / 1e18;
}
