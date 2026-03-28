import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import toast from 'react-hot-toast';
import { getTransactionHistory } from '../../services/api/stakingService';
import type { TxType } from '../../types/staking';

type Filter = TxType | 'ALL';
const FILTERS: Filter[] = ['ALL', 'STAKE', 'UNSTAKE', 'CLAIM'];
const PAGE_SIZE = 5;

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Tx hash copied!'));
}

export default function TransactionTable() {
  const { address } = useAppKitAccount();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['txHistory', address, filter],
    queryFn: () => getTransactionHistory(address ?? '', filter),
  });

  const totalPages = Math.ceil(txs.length / PAGE_SIZE);
  const paginated = txs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const badgeClass = (type: TxType) => {
    if (type === 'STAKE') return 'tx-badge tx-badge-stake';
    if (type === 'UNSTAKE') return 'tx-badge tx-badge-unstake';
    return 'tx-badge tx-badge-claim';
  };

  return (
    <div className="stake-card" style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Transaction History</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>All your staking activity</div>
        </div>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-chip${filter === f ? ' active' : ''}`}
              onClick={() => { setFilter(f); setPage(1); }}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as object}>
        {/* Table header */}
        <div className="tx-row-header" style={{ minWidth: 560 }}>
          <span>Date</span>
          <span>Type</span>
          <span>Token</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Tx Hash</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(31,41,55,0.4)', margin: '0 24px' }} />

        {/* Rows */}
        {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: '14px 24px' }}>
            <div className="skeleton" style={{ height: 14, width: '100%' }} />
          </div>
        ))
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div>No transactions found</div>
        </div>
      ) : (
        paginated.map((tx, i) => (
          <div
            key={tx.id}
            className="tx-row"
            style={{
              margin: '0 8px',
              minWidth: 560,
              background: i % 2 === 0 ? 'rgba(17,24,39,0.3)' : 'transparent',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>{tx.date}</span>
            <span><span className={badgeClass(tx.type)}>{tx.type}</span></span>
            <span style={{ fontWeight: 600 }}>{tx.token}</span>
            <span style={{ fontWeight: 600 }}>{tx.amount.toFixed(2)}</span>
            <span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: tx.status === 'CONFIRMED' ? 'var(--stake-green)' : 'var(--stake-amber)',
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 12, color: tx.status === 'CONFIRMED' ? 'var(--stake-green)' : 'var(--stake-amber)' }}>
                  {tx.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                </span>
              </span>
            </span>
            <span>
              <button
                onClick={() => copyToClipboard(tx.txHash)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#818cf8', fontSize: 13, fontFamily: 'monospace',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                <span title="Copy" style={{ fontSize: 11 }}>📋</span>
              </button>
            </span>
          </div>
        ))
      )}
      </div>{/* end scroll wrapper */}

      {/* Pagination */}
      {txs.length > PAGE_SIZE && (
        <div style={{
          padding: '16px 24px 0',
          borderTop: '1px solid rgba(31,41,55,0.4)',
          marginTop: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, txs.length)} of {txs.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-outline-stake"
              style={{ padding: '5px 14px', fontSize: 13 }}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            <button
              className="btn-outline-stake"
              style={{ padding: '5px 14px', fontSize: 13 }}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
