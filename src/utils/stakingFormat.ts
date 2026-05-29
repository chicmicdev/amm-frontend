/** ~2s average block time on Polygon Amoy — used only for staking reward previews. */
export const STAKING_BLOCKS_PER_DAY = 43_200;

/**
 * `StakingPool.RewardMode`: value the contract uses for APR (basis points) scheduling.
 * If reward previews look inverted vs on-chain behavior, toggle this to `1`.
 */
export const STAKING_REWARD_MODE_APR = 0;

/** Minimum pending reward (human units of the pool reward token) before claim is allowed. */
export const STAKING_MIN_CLAIM_REWARD_HUMAN = 100;

export function canClaimStakingRewards(pendingHuman: number): boolean {
  return Number.isFinite(pendingHuman) && pendingHuman >= STAKING_MIN_CLAIM_REWARD_HUMAN;
}

export function formatStakingNumber(n: number, maxFractionDigits = 8): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}
