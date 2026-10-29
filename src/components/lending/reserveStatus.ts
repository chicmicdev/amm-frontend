import { parseUnits } from 'viem';
import type { ReserveInfo } from '../../services/lending/lendingService';

/** Tokens still allowed under a cap, in wei. `null` means the reserve has no cap. */
function roomUnderCapWei(cap: string, total: string, decimals: number): bigint | null {
  try {
    if (!cap || cap === '0') return null;
    const room = parseUnits(cap as `${number}`, decimals) - parseUnits(total as `${number}`, decimals);
    return room > 0n ? room : 0n;
  } catch {
    return null;
  }
}

export function supplyRoomWei(r: ReserveInfo): bigint | null {
  return roomUnderCapWei(r.supplyCap, r.totalSupplied, r.decimals);
}

export function borrowRoomWei(r: ReserveInfo): bigint | null {
  return roomUnderCapWei(r.borrowCap, r.totalBorrowed, r.decimals);
}

/** Why supplying this reserve is currently impossible, or `null` if it is allowed. */
export function supplyDisabledReason(r: ReserveInfo): string | null {
  if (!r.isActive) return 'Reserve is inactive';
  if (r.isPaused) return 'Reserve is paused';
  if (r.isFrozen) return 'Reserve is frozen';
  if (supplyRoomWei(r) === 0n) return 'Supply cap reached';
  return null;
}

/** Why borrowing this reserve is currently impossible, or `null` if it is allowed. */
export function borrowDisabledReason(r: ReserveInfo): string | null {
  if (!r.isActive) return 'Reserve is inactive';
  if (r.isPaused) return 'Reserve is paused';
  if (r.isFrozen) return 'Reserve is frozen';
  if (!r.borrowingEnabled) return 'Borrowing is disabled for this asset';
  if (borrowRoomWei(r) === 0n) return 'Borrow cap reached';
  return null;
}
