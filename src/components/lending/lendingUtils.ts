import type { ReserveInfo } from '../../services/lending/lendingService';

export function fmt(n: string | number, dec = 2): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v);
}

export function hfColor(hf: string): string {
  if (hf === '∞') return '#46BC8C';
  const n = parseFloat(hf);
  if (n >= 2) return '#46BC8C';
  if (n >= 1.3) return '#F89F1A';
  return '#F44336';
}

export const TOKEN_COLORS: Record<string, string> = {
  USDC: '#2775ca', WETH: '#627eea', DAI: '#f5ac37',
  LINK: '#375bd2', WBTC: '#f7931a', USDT: '#26a17b',
  cbBTC: '#f7931a', ETH: '#627eea',
};

export const tokenColor = (sym: string): string => TOKEN_COLORS[sym] ?? '#7B6FE8';

/** Weighted Net APY = (Σ supplyBal×supplyAPY − Σ debtBal×borrowAPY) / totalSupply */
export function calcNetAPY(
  reserves: ReserveInfo[],
  supplyBals: Record<string, string>,
  debtBals: Record<string, string>,
): string {
  let supplyIncome = 0, borrowCost = 0, totalSupply = 0;
  for (const r of reserves) {
    const s = parseFloat(supplyBals[r.asset] ?? '0');
    const d = parseFloat(debtBals[r.asset] ?? '0');
    supplyIncome += s * (parseFloat(r.supplyAPY) / 100);
    borrowCost += d * (parseFloat(r.borrowAPY) / 100);
    totalSupply += s;
  }
  if (totalSupply === 0) return fmt(0, 2);
  return fmt(((supplyIncome - borrowCost) / totalSupply) * 100, 2);
}
