import { useMemo, useState, useCallback, useEffect } from 'react';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import type { TxHistoryKind } from '../types';
import { getTxHistory, clearTxHistory } from '../services/history/txHistoryStorage';
import { formatRelativeTime, shortenTxHash } from '../utils/formatUtils';
import { getTxExplorerUrl } from '../utils/explorer';
import { useToast } from '../context/ToastContext';

const FILTERS: { key: 'all' | TxHistoryKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'swap', label: 'Swaps' },
  { key: 'add_liquidity', label: 'Add liquidity' },
  { key: 'remove_liquidity', label: 'Remove' },
  { key: 'collect_fees', label: 'Collect fees' },
];

function kindBadgeClass(kind: TxHistoryKind): string {
  switch (kind) {
    case 'swap':
      return 'badge';
    case 'add_liquidity':
      return 'badge badge-green';
    case 'remove_liquidity':
      return 'badge badge-red';
    case 'collect_fees':
      return 'badge badge-yellow';
    default:
      return 'badge';
  }
}

function kindLabel(kind: TxHistoryKind): string {
  switch (kind) {
    case 'swap':
      return 'Swap';
    case 'add_liquidity':
      return 'Add LP';
    case 'remove_liquidity':
      return 'Remove LP';
    case 'collect_fees':
      return 'Collect';
    default:
      return kind;
  }
}

export default function HistoryPage() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | TxHistoryKind>('all');
  const [tick, setTick] = useState(0);

  const entries = useMemo(() => {
    if (!address) return [];
    return getTxHistory(address);
  }, [address, tick]);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.kind === filter);
  }, [entries, filter]);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener('flux-swap-history', onUpdate);
    return () => window.removeEventListener('flux-swap-history', onUpdate);
  }, [refresh]);

  const handleCopy = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      showToast('success', 'Transaction hash copied');
    } catch {
      showToast('error', 'Could not copy');
    }
  };

  const handleClear = () => {
    if (!address) return;
    clearTxHistory(address);
    refresh();
    showToast('info', 'Activity cleared for this wallet');
  };

  if (!isConnected || !address) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Connect Your Wallet</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 15 }}>
          Your Flux Swap activity will appear here after you swap or manage liquidity.
        </p>
        <button type="button" className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => open()}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Activity</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Flux Swap
          </p>
        </div>
        {entries.length > 0 && (
          <button type="button" className="btn-secondary" style={{ flexShrink: 0 }} onClick={handleClear}>
            Clear all
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
        Recent transactions from this browser are saved locally. They are not synced across devices.
      </p>

      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`tab${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
              style={{ flex: 1, fontSize: 12, padding: '6px 4px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {entries.length === 0 ? 'No activity yet' : 'Nothing in this filter'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
            {entries.length === 0
              ? 'Execute a swap or add liquidity to build your history.'
              : 'Try another tab above.'}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(entry => {
            const explorerUrl = getTxExplorerUrl(entry.hash);
            return (
              <div
                key={entry.id}
                className="position-card"
                style={{ marginBottom: 12, cursor: 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span className={kindBadgeClass(entry.kind)} style={{ fontSize: 11 }}>
                        {kindLabel(entry.kind)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
                      {entry.summary}
                    </p>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <code
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-secondary)',
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                        }}
                        title={entry.hash}
                      >
                        {shortenTxHash(entry.hash)}
                      </code>
                      <button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '4px 8px' }} onClick={() => handleCopy(entry.hash)}>
                        Copy
                      </button>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost"
                          style={{ fontSize: 13, padding: '4px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                        >
                          View ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
