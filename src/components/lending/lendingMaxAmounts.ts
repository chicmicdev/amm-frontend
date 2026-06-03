import { parseUnits, formatUnits } from 'viem';
import type { ReserveInfo, UserAccountData } from '../../services/lending/lendingService';

/**
 * Maximum amount a user can safely withdraw for a given reserve while keeping
 * their health factor above a 1.05 safety buffer.
 *
 * Formula (from Aave V3 risk model):
 *   HF = (totalCollateralUSD × liqThreshold) / totalDebtUSD
 *   After withdrawing X USD: newHF = ((col - X) × liqThreshold) / debt ≥ 1.05
 *   → X ≤ col - 1.05 × debt / liqThreshold
 *
 * If there is no debt the full aToken balance is safe to withdraw.
 */
export function maxSafeWithdrawWei(
  aTokenWei: bigint,
  poolLiquidityWei: bigint,
  userData: UserAccountData | null,
  reserve: Pick<ReserveInfo, 'priceUSD' | 'decimals'>,
): bigint {
  const baseMax = minBigint(aTokenWei, poolLiquidityWei);

  if (!userData) return baseMax;

  // Use full-precision values so tiny debts (e.g. $0.002273 → "0.00" at 2dp)
  // are never mistaken for zero, which would let a full-collateral withdrawal
  // through and cause HealthFactorLowerThanLiquidationThreshold on-chain.
  const totalDebt       = parseFloat(userData.totalDebtUSDFull ?? userData.totalDebtUSD);
  if (!totalDebt || totalDebt <= 0) return baseMax; // genuinely no debt

  const totalCollateral = parseFloat(userData.totalCollateralUSDFull ?? userData.totalCollateralUSD);
  const liqThreshold    = userData.liquidationThresholdRaw;
  const priceUSD        = parseFloat(reserve.priceUSD);

  if (!liqThreshold || !priceUSD || !totalCollateral) return baseMax;

  const SAFETY_HF = 1.05;
  const maxWithdrawUSD = totalCollateral - (SAFETY_HF * totalDebt) / liqThreshold;

  if (maxWithdrawUSD <= 0) return 0n; // already at/below safe threshold

  const maxWithdrawTokens = maxWithdrawUSD / priceUSD;
  const maxWithdrawStr    = maxWithdrawTokens.toFixed(reserve.decimals);

  let debtAdjustedWei: bigint;
  try {
    debtAdjustedWei = parseUnits(maxWithdrawStr as `${number}`, reserve.decimals);
  } catch {
    return baseMax;
  }

  // Subtract 2 wei as a dust buffer: aToken balances grow per-block so by
  // the time the tx mines the exact cap may be 1–2 wei too high.
  const safeWei = debtAdjustedWei > 2n ? debtAdjustedWei - 2n : debtAdjustedWei;
  return minBigint(baseMax, safeWei);
}

export function minBigint(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function safeParseUnitsDecimal(s: string, decimals: number): bigint {
  const t = s.trim() || '0';
  try {
    return parseUnits(t as `${number}`, decimals);
  } catch {
    return 0n;
  }
}

/** Max variable debt / wallet underlying the user can repay (underlying token). */
export function maxRepayWei(walletWei: bigint, debtWei: bigint): bigint {
  return minBigint(walletWei, debtWei);
}

/** Max aToken redeem: cannot exceed pool liquidity for this asset. */
export function maxWithdrawWei(suppliedWei: bigint, poolLiquidityWei: bigint): bigint {
  return minBigint(suppliedWei, poolLiquidityWei);
}

/**
 * Borrow capacity in token wei from USD borrow power and oracle USD price per token.
 */
export function borrowCapacityWei(
  availableBorrowsUsd: string,
  priceUsdPerToken: string,
  decimals: number,
): bigint {
  const usd = parseFloat(availableBorrowsUsd);
  const px = parseFloat(priceUsdPerToken);
  if (!Number.isFinite(usd) || !Number.isFinite(px) || px <= 0 || usd <= 0) return 0n;
  const tokens = usd / px;
  const s = tokens.toFixed(decimals);
  try {
    return parseUnits(s as `${number}`, decimals);
  } catch {
    return 0n;
  }
}

/** Min(pool liquidity, user borrow capacity) for this reserve. */
export function maxBorrowWei(
  reserve: ReserveInfo,
  userData: UserAccountData | null,
): bigint {
  const dec = reserve.decimals;
  const pool = safeParseUnitsDecimal(reserve.availableLiquidity, dec);
  if (!userData) return pool;
  const cap = borrowCapacityWei(userData.availableBorrowsUSD, reserve.priceUSD, dec);
  return minBigint(pool, cap);
}

/** Format wei for input fields (trim trailing zeros after decimal). */
export function formatWeiForAmountInput(wei: bigint, decimals: number): string {
  let s = formatUnits(wei, decimals);
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return s || '0';
}

/** Clamp typed amount so parsed wei never exceeds maxWei. */
export function clampAmountStringToMax(
  raw: string,
  maxWei: bigint,
  decimals: number,
): string {
  const cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
  if (cleaned === '' || cleaned === '.') return cleaned;
  if (maxWei <= 0n) return cleaned;
  try {
    const w = parseUnits(cleaned as `${number}`, decimals);
    if (w <= maxWei) return cleaned;
    return formatWeiForAmountInput(maxWei, decimals);
  } catch {
    return cleaned;
  }
}
