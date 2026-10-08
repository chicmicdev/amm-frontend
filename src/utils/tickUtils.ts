import { FEE_TO_TICK_SPACING, MAX_TICK, MIN_TICK } from '../config/contracts';
import type { Token } from '../types';

export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

export function nearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  if (rounded < MIN_TICK + tickSpacing) return MIN_TICK + tickSpacing;
  if (rounded > MAX_TICK - tickSpacing) return MAX_TICK - tickSpacing;
  return rounded;
}

/**
 * Convert a UI price range (tokenB per tokenA, in whole-token units) into the
 * pool's canonical raw-unit ticks.
 *
 * Pool ticks always describe canonical token1 base units per token0 base unit.
 * Human prices therefore need both decimal scaling and, when the selected UI
 * order is reversed, reciprocal bounds.
 */
export function getTickRange(
  fee: number,
  priceLower: number,
  priceUpper: number,
  tokenA: Pick<Token, 'address' | 'decimals'>,
  tokenB: Pick<Token, 'address' | 'decimals'>,
) {
  const tickSpacing = FEE_TO_TICK_SPACING[fee] ?? 60;
  const aIsCanonicalToken0 = tokenA.address.toLowerCase() < tokenB.address.toLowerCase();
  const canonicalToken0 = aIsCanonicalToken0 ? tokenA : tokenB;
  const canonicalToken1 = aIsCanonicalToken0 ? tokenB : tokenA;

  // Inverting a range reverses its bounds: [lo, hi] -> [1 / hi, 1 / lo].
  const canonicalHumanLower = aIsCanonicalToken0 ? priceLower : 1 / priceUpper;
  const canonicalHumanUpper = aIsCanonicalToken0 ? priceUpper : 1 / priceLower;
  const baseUnitScale = 10 ** (canonicalToken1.decimals - canonicalToken0.decimals);
  const rawPriceLower = canonicalHumanLower * baseUnitScale;
  const rawPriceUpper = canonicalHumanUpper * baseUnitScale;

  const rawTickLower = priceToTick(rawPriceLower);
  const rawTickUpper = priceToTick(rawPriceUpper);
  return {
    tickLower: nearestUsableTick(rawTickLower, tickSpacing),
    tickUpper: nearestUsableTick(rawTickUpper, tickSpacing),
  };
}

export function sqrtPriceX96ToPrice(sqrtPriceX96: string | bigint): number {
  const sq = Number(sqrtPriceX96);
  return (sq / 2 ** 96) ** 2;
}

export function priceToSqrtPriceX96(price: number): bigint {
  return BigInt(Math.floor(Math.sqrt(price) * 2 ** 96));
}

export function isInRange(currentTick: number, tickLower: number, tickUpper: number): boolean {
  return currentTick >= tickLower && currentTick < tickUpper;
}

/** Widest tick range allowed for a pool with this spacing (aligned to MIN_TICK / MAX_TICK). */
export function maxRangeTicksForSpacing(tickSpacing: number): { tickLower: number; tickUpper: number } {
  const tickLower = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { tickLower, tickUpper };
}
