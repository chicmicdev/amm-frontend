import type { ReserveInfo } from '../../services/lending/lendingService';

export type ActionMode = 'supply' | 'borrow' | 'repay' | 'withdraw';

export interface ModalState {
  reserve: ReserveInfo;
  mode: ActionMode;
}

export const MODE_CFG: Record<ActionMode, { label: string; color: string; gradient: string }> = {
  supply:   { label: 'Supply',   color: '#46BC8C', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  borrow:   { label: 'Borrow',   color: '#F89F1A', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  repay:    { label: 'Repay',    color: '#7B6FE8', gradient: 'var(--gradient-brand)' },
  withdraw: { label: 'Withdraw', color: '#7B6FE8', gradient: 'var(--gradient-brand)' },
};
