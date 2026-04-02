import { useMemo } from 'react';
import type { ReserveInfo, UserAccountData } from '../../services/lending/lendingService';
import type { ActionMode } from './lendingTypes';
import { fmt } from './lendingUtils';
import { SectionCard } from './SectionCard';
import { TokenIcon } from './TokenIcon';
import { Btn } from './Btn';
import { InfoIcon } from './Tooltip';
import DataTable, { type ColumnConfig } from '../common/DataTable';

interface AssetsToBorrowProps {
  reserves: ReserveInfo[];
  userData: UserAccountData | null;
  onAction: (r: ReserveInfo, m: ActionMode) => void;
}

function availableForUser(
  r: ReserveInfo,
  userData: UserAccountData | null,
): { tokens: number; usd: number } {
  const poolTokens = parseFloat(r.availableLiquidity);
  const price      = parseFloat(r.priceUSD);

  if (!userData || price <= 0) {
    return { tokens: poolTokens, usd: poolTokens * price };
  }

  const userBorrowUSD    = parseFloat(userData.availableBorrowsUSD);
  const userBorrowTokens = userBorrowUSD / price;
  const tokens           = Math.min(poolTokens, userBorrowTokens);
  return { tokens, usd: tokens * price };
}

export function AssetsToBorrow({ reserves, userData, onAction }: AssetsToBorrowProps) {
  const data: Record<string, unknown>[] = useMemo(() => reserves.map(r => ({
    _rowKey: r.asset,
    asset: r.symbol,
    reserve: r as unknown,
  })), [reserves]);

  const columns: ColumnConfig[] = useMemo(() => [
    {
      key: 'asset',
      label: 'Asset',
      type: 'text',
      gridTrack: '1.4fr',
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
      key: 'available',
      label: 'Available',
      labelNode: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Available
          <InfoIcon tooltip="The amount of this asset you can borrow, limited by your collateral and pool liquidity." />
        </span>
      ),
      type: 'text',
      gridTrack: '1.4fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        const { tokens, usd } = availableForUser(r, userData);
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              {fmt(tokens, 2)}
            </div>
            {usd > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${fmt(usd, 2)}</div>
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
          <InfoIcon tooltip="Variable interest rate that fluctuates based on supply and demand." />
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
      gridTrack: 'minmax(100px, auto)',
      align: 'right',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        return (
          <Btn label="Borrow" color="#F89F1A" small onClick={() => onAction(r, 'borrow')} />
        );
      },
    },
  ], [userData, onAction]);

  return (
    <SectionCard title="Assets to borrow">
      <DataTable bare columns={columns} data={data} emptyIcon="" emptyText="No assets to borrow." />
    </SectionCard>
  );
}
