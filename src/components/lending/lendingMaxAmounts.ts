import { parseUnits, formatUnits } from 'viem';
import type { ReserveInfo, UserAccountData } from '../../services/lending/lendingService';

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
