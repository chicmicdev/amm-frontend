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

/**
 * Raw on-chain ratio: token1 base units per 1 token0 base unit (from sqrtPriceX96).
 * Not human-readable when token0/token1 use different decimals.
 */
export function sqrtPriceX96ToPriceToken1PerToken0(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 === 0n) return 0;
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * 10n ** 18n) / 2n ** 192n;
  return Number(scaled) / 1e18;
}

/** Human price: how many whole token1 per 1 whole token0 (e.g. WETH per USDC). */
export function sqrtPriceX96ToHumanPriceToken1PerToken0(
  sqrtPriceX96: bigint,
  decimalsToken0: number,
  decimalsToken1: number,
): number {
  const raw = sqrtPriceX96ToPriceToken1PerToken0(sqrtPriceX96);
  return raw * 10 ** (decimalsToken0 - decimalsToken1);
}

/** Integer sqrt (Newton) — matches `frontend-integration-test.mjs` / Uniswap `encodeSqrtRatioX96`. */
function sqrtBigInt(n: bigint): bigint {
  if (n < 0n) throw new Error('sqrt negative');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (n / x + x) / 2n;
  }
  return x;
}

/**
 * sqrt( (amount1 * 2^192) / amount0 ) — on-chain `initialize` format (amounts are raw base units).
 * @see AMM_v3-main/scripts/frontend-integration-test.mjs `encodeSqrtRatioX96`
 */
export function encodeSqrtRatioX96(amount1: bigint, amount0: bigint): bigint {
  if (amount0 <= 0n || amount1 <= 0n) return 0n;
  return sqrtBigInt((amount1 << 192n) / amount0);
}

/**
 * Inverse of {@link sqrtPriceX96ToHumanPriceToken1PerToken0} for pool `initialize`.
 * Uses bigint ratio (same math as integration test: 1 whole token0 vs `humanPrice` whole token1).
 */
export function humanPriceToken1PerToken0ToSqrtPriceX96(
  humanPrice: number,
  decimalsToken0: number,
  decimalsToken1: number,
): bigint {
  if (!(humanPrice > 0) || !Number.isFinite(humanPrice)) return 0n;
  const amount0 = 10n ** BigInt(decimalsToken0);
  const scaled = humanPrice * 10 ** decimalsToken1;
  if (!Number.isFinite(scaled) || scaled <= 0) return 0n;
  const amount1 = BigInt(Math.floor(scaled + 1e-12));
  if (amount1 <= 0n) return 0n;
  return encodeSqrtRatioX96(amount1, amount0);
}
