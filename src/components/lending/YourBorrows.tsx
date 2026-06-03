import { useMemo } from 'react';
import type { ReserveInfo, UserAccountData } from '../../services/lending/lendingService';
import type { ActionMode } from './lendingTypes';
import { fmt } from './lendingUtils';
import { SectionCard } from './SectionCard';
import { TokenIcon } from './TokenIcon';
import { Btn } from './Btn';
import { InfoIcon } from './Tooltip';
import DataTable, { type ColumnConfig } from '../common/DataTable';

interface YourBorrowsProps {
  reserves: ReserveInfo[];
  debtBals: Record<string, string>;
  userData: UserAccountData | null;
  onAction: (r: ReserveInfo, m: ActionMode) => void;
}

export function YourBorrows({ reserves, debtBals, userData, onAction }: YourBorrowsProps) {
  const active    = reserves.filter(r => parseFloat(debtBals[r.asset] ?? '0') > 0.0001);
  const totalDebt = userData?.totalDebtUSD ?? '0';

  const borrowPct = userData
    ? (() => {
        const debt = parseFloat(userData.totalDebtUSD);
        const coll = parseFloat(userData.totalCollateralUSD);
        return coll > 0 ? fmt((debt / coll) * 100, 2) : '0.00';
      })()
    : '0.00';

  const borrowAPY = (() => {
    let cost = 0, total = 0;
    for (const r of active) {
      const d = parseFloat(debtBals[r.asset] ?? '0');
      cost  += d * (parseFloat(r.borrowAPY) / 100);
      total += d;
    }
    return total > 0 ? fmt((cost / total) * 100, 2) : '0.00';
  })();

  const data: Record<string, unknown>[] = useMemo(() => active.map(r => ({
    _rowKey: r.asset,
    asset: r.symbol,
    reserve: r as unknown,
  })), [active]);

  const columns: ColumnConfig[] = useMemo(() => [
    {
      key: 'asset',
      label: 'Asset',
      type: 'text',
      gridTrack: '1.3fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TokenIcon symbol={r.symbol} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.symbol}</span>
          </div>
        );
      },
    },
    {
      key: 'debt',
      label: 'Debt',
      type: 'text',
      gridTrack: '1.3fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        const debt    = parseFloat(debtBals[r.asset] ?? '0');
        const debtUSD = parseFloat(r.priceUSD) > 0 ? debt * parseFloat(r.priceUSD) : null;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              {fmt(debt, 6)}
            </div>
            {debtUSD !== null && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${fmt(debtUSD, 2)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'apy',
      label: 'APY, variable',
      labelNode: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          APY, variable
          <InfoIcon tooltip="Variable interest rate charged on your borrowed assets." />
        </span>
      ),
      type: 'text',
      gridTrack: '1fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        return (
          <span style={{ color: '#F89F1A', fontWeight: 700, fontSize: 14 }}>{r.borrowAPY}%</span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      type: 'text',
      noWrap: true,
      gridTrack: 'minmax(200px, auto)',
      align: 'right',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
            <Btn label="Borrow" color="#F89F1A" small onClick={() => onAction(r, 'borrow')} />
            <Btn label="Repay" color="#F89F1A" variant="outline" small onClick={() => onAction(r, 'repay')} />
          </div>
        );
      },
    },
  ], [debtBals, onAction]);

  return (
    <SectionCard
      title="Your borrows"
      headerMeta={
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>
            Balance{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              ${fmt(parseFloat(totalDebt), 2)}
            </strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            APY{' '}
            <strong style={{ color: '#F89F1A', marginLeft: 4 }}>{borrowAPY}%</strong>
            <InfoIcon tooltip="Weighted average APY of all your borrowed assets." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            Borrow power used{' '}
            <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>{borrowPct}%</strong>
            <InfoIcon tooltip="Percentage of your borrowing capacity currently utilized." />
          </span>
        </div>
      }
    >
      {active.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nothing borrowed yet. Supply collateral then borrow.
        </div>
      ) : (
        <DataTable bare columns={columns} data={data} emptyIcon="" emptyText="No data." />
      )}
    </SectionCard>
  );
}
