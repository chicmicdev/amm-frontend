import { FEE_TO_TICK_SPACING, MAX_TICK, MIN_TICK } from '../config/contracts';

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

export function getTickRange(fee: number, priceLower: number, priceUpper: number) {
  const tickSpacing = FEE_TO_TICK_SPACING[fee] ?? 60;
  const rawTickLower = priceToTick(priceLower);
  const rawTickUpper = priceToTick(priceUpper);
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
