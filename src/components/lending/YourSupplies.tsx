import { useMemo } from 'react';
import type { ReserveInfo, UserAccountData } from '../../services/lending/lendingService';
import type { ActionMode } from './lendingTypes';
import { fmt } from './lendingUtils';
import { SectionCard } from './SectionCard';
import { TokenIcon } from './TokenIcon';
import { Btn } from './Btn';
import { InfoIcon } from './Tooltip';
import DataTable, { type ColumnConfig } from '../common/DataTable';

interface YourSuppliesProps {
  reserves: ReserveInfo[];
  balances: Record<string, string>;
  userData: UserAccountData | null;
  onAction: (r: ReserveInfo, m: ActionMode) => void;
}

export function YourSupplies({ reserves, balances, userData, onAction }: YourSuppliesProps) {
  const active = reserves.filter(r => parseFloat(balances[r.asset] ?? '0') > 0.0001);

  const totalBal = userData ? fmt(parseFloat(userData.totalCollateralUSD), 2) : '0.00';

  const weightedAPY = (() => {
    let inc = 0, total = 0;
    for (const r of active) {
      const b = parseFloat(balances[r.asset] ?? '0');
      inc   += b * (parseFloat(r.supplyAPY) / 100);
      total += b;
    }
    return total > 0 ? fmt((inc / total) * 100, 2) : '0.00';
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
      gridTrack: '1.2fr',
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
      key: 'balance',
      label: 'Balance',
      type: 'text',
      gridTrack: '1.2fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        const bal    = parseFloat(balances[r.asset] ?? '0');
        const balUSD = parseFloat(r.priceUSD) > 0 ? bal * parseFloat(r.priceUSD) : null;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              {fmt(bal, 4)}
            </div>
            {balUSD !== null && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${fmt(balUSD, 2)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'apy',
      label: 'APY',
      labelNode: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          APY
          <InfoIcon tooltip="Annual percentage yield earned on this supplied asset." />
        </span>
      ),
      type: 'text',
      gridTrack: '0.9fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        return (
          <span style={{ color: '#46BC8C', fontWeight: 700, fontSize: 14 }}>{r.supplyAPY}%</span>
        );
      },
    },
    {
      key: 'collateral',
      label: 'Collateral',
      labelNode: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Collateral
          <InfoIcon tooltip="Indicates whether this asset is enabled as collateral. Assets used as collateral can be liquidated if your health factor drops below 1." />
        </span>
      ),
      type: 'text',
      gridTrack: '1fr',
      render: () => (
        <div
          style={{
            width: 36, height: 20, borderRadius: 10, background: '#46BC8C',
            display: 'flex', alignItems: 'center', paddingLeft: 18, cursor: 'pointer',
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white' }} />
        </div>
      ),
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
            <Btn label="Supply" color="#46BC8C" small onClick={() => onAction(r, 'supply')} />
            <Btn label="Withdraw" color="#46BC8C" variant="outline" small onClick={() => onAction(r, 'withdraw')} />
          </div>
        );
      },
    },
  ], [balances, onAction]);

  return (
    <SectionCard
      title="Your supplies"
      headerMeta={
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>
            Balance <strong style={{ color: 'var(--text-primary)' }}>${totalBal}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            APY{' '}
            <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>{weightedAPY}%</strong>
            <InfoIcon tooltip="Weighted average APY of all your supplied assets." />
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            Collateral{' '}
            <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>${totalBal}</strong>
            <InfoIcon tooltip="This is the total amount of your assets used as collateral. You can borrow against it." />
          </span>
        </div>
      }
    >
      {active.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nothing supplied yet. Supply assets to earn yield.
        </div>
      ) : (
        <DataTable bare columns={columns} data={data} emptyIcon="" emptyText="No data." />
      )}
    </SectionCard>
  );
}
