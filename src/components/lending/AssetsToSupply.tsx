import { useState, useMemo } from 'react';
import type { ReserveInfo } from '../../services/lending/lendingService';
import type { ActionMode } from './lendingTypes';
import { fmt } from './lendingUtils';
import { SectionCard } from './SectionCard';
import { TokenIcon } from './TokenIcon';
import { Btn } from './Btn';
import { InfoIcon } from './Tooltip';
import DataTable, { type ColumnConfig } from '../common/DataTable';

interface AssetsToSupplyProps {
  reserves: ReserveInfo[];
  walletBals: Record<string, string>;
  onAction: (r: ReserveInfo, m: ActionMode) => void;
}

export function AssetsToSupply({ reserves, walletBals, onAction }: AssetsToSupplyProps) {
  const [showZero, setShowZero] = useState(false);
  const visible = showZero
    ? reserves
    : reserves.filter(r => parseFloat(walletBals[r.asset] ?? '0') > 0);

  const data: Record<string, unknown>[] = useMemo(() => visible.map(r => ({
    _rowKey: r.asset,
    asset: r.symbol,
    reserve: r as unknown,
  })), [visible]);

  const columns: ColumnConfig[] = useMemo(() => [
    {
      key: 'asset',
      label: 'Assets',
      type: 'text',
      gridTrack: '1.5fr',
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
      key: 'wallet',
      label: 'Wallet balance',
      type: 'text',
      gridTrack: '1.3fr',
      render: (_, row) => {
        const r = row.reserve as ReserveInfo;
        const wBal = parseFloat(walletBals[r.asset] ?? '0');
        const wUSD = parseFloat(r.priceUSD) > 0 ? wBal * parseFloat(r.priceUSD) : null;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              {fmt(wBal, 4)}
            </div>
            {wUSD !== null && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${fmt(wUSD, 2)}</div>
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
          <InfoIcon tooltip="Annual percentage yield earned by supplying this asset." />
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
      label: 'Can be collateral',
      labelNode: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Can be collateral
          <InfoIcon tooltip="Whether this asset can be used as collateral to borrow against." />
        </span>
      ),
      type: 'text',
      noWrap: true,
      gridTrack: 'minmax(148px, 1fr)',
      render: () => (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
          <span style={{ color: '#46BC8C', fontSize: 16 }}>✓</span>
        </div>
      ),
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
          <Btn label="Supply" color="#46BC8C" small onClick={() => onAction(r, 'supply')} />
        );
      },
    },
  ], [walletBals, onAction]);

  return (
    <SectionCard
      title="Assets to supply"
      headerRight={
        <a
          href="https://docs.base.org/docs/tools/network-faucets"
          target="_blank" rel="noreferrer"
          style={{
            fontSize: 12, color: 'var(--color-accent-light)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          BASE SEPOLIA FAUCET ↗
        </a>
      }
    >
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <input
          type="checkbox" id="showZeroSupply"
          checked={showZero} onChange={e => setShowZero(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor="showZeroSupply" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          Show assets with 0 balance
        </label>
      </div>

      <DataTable
        bare
        columns={columns}
        data={data}
        emptyText='No assets with balance. Enable "Show assets with 0 balance" or get faucet tokens.'
        emptyIcon=""
      />
    </SectionCard>
  );
}
