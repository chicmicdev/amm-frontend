import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date' | 'badge' | 'status' | 'hash';

export interface ColumnConfig {
  key: string;
  label: string;
  type: ColumnType;
  sortable?: boolean;
  /** For 'badge' type: map value → CSS class suffix (e.g. { STAKE: 'stake', CLAIM: 'claim' }) */
  badgeMap?: Record<string, string>;
  /** Custom cell renderer — overrides type-based rendering */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
}

export interface TableEvents {
  onSearch?: (query: string) => void;
  onPageChange?: (page: number, totalPages: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilterChange?: (key: string) => void;
  onClear?: () => void;
}

interface DataTableProps extends TableEvents {
  columns: ColumnConfig[];
  data: Record<string, unknown>[];
  loading?: boolean;
  pageSize?: number;
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  filters?: FilterOption[];
  activeFilter?: string;
  emptyText?: string;
  emptyIcon?: string;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const DEFAULT_BADGE_MAP: Record<string, string> = {
  STAKE: 'tx-badge tx-badge-stake',
  UNSTAKE: 'tx-badge tx-badge-unstake',
  CLAIM: 'tx-badge tx-badge-claim',
};

function resolveBadgeClass(value: string, badgeMap?: Record<string, string>): string {
  if (badgeMap) {
    const key = Object.keys(badgeMap).find(k => k === value);
    return key ? badgeMap[key] : 'tx-badge';
  }
  return DEFAULT_BADGE_MAP[value] ?? 'tx-badge';
}

// ── Cell Renderer ─────────────────────────────────────────────────────────────

function Cell({ col, value, row }: { col: ColumnConfig; value: unknown; row: Record<string, unknown> }) {
  if (col.render) return <>{col.render(value, row)}</>;

  const str = value == null ? '—' : String(value);

  switch (col.type) {
    case 'badge':
      return <span className={resolveBadgeClass(str, col.badgeMap)}>{str}</span>;

    case 'status': {
      const confirmed = str === 'CONFIRMED';
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: confirmed ? 'var(--stake-green)' : 'var(--stake-amber)',
          }} />
          <span style={{ fontSize: 12, color: confirmed ? 'var(--stake-green)' : 'var(--stake-amber)' }}>
            {confirmed ? 'Confirmed' : 'Pending'}
          </span>
        </span>
      );
    }

    case 'hash':
      return (
        <button
          onClick={() => navigator.clipboard.writeText(str).then(() => toast.success('Copied!'))}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#818cf8', fontSize: 13, fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', gap: 4, padding: 0,
          }}
          title={str}
        >
          {str.slice(0, 6)}…{str.slice(-4)}
          <span style={{ fontSize: 11 }}>📋</span>
        </button>
      );

    case 'number':
      return <span style={{ fontWeight: 600 }}>{str}</span>;

    default:
      return <span>{str}</span>;
  }
}

// ── Sort Icon ─────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.35, fontSize: 11, display: 'inline-block', lineHeight: 1 }}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────

export default function DataTable({
  columns,
  data,
  loading = false,
  pageSize = 5,
  title,
  subtitle,
  searchable = false,
  filters,
  activeFilter,
  emptyText = 'No data found',
  emptyIcon = '📭',
  onSearch,
  onPageChange,
  onSort,
  onFilterChange,
  onClear,
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Reset page when filter or search changes
  useEffect(() => { setPage(1); }, [activeFilter, searchQuery]);

  // Client-side search
  const searched = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row =>
      columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
    );
  }, [data, searchQuery, columns]);

  // Client-side sort
  const sorted = useMemo(() => {
    if (!sortKey) return searched;
    return [...searched].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const aStr = String(av ?? ''), bStr = String(bv ?? '');
      const aNum = parseFloat(aStr), bNum = parseFloat(bStr);
      const cmp = !isNaN(aNum) && !isNaN(bNum)
        ? aNum - bNum
        : aStr.localeCompare(bStr);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [searched, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearch?.(q);
  };

  const handlePage = (p: number) => {
    setPage(p);
    onPageChange?.(p, totalPages);
  };

  const handleClear = () => {
    setSearchQuery('');
    setPage(1);
    setSortKey(null);
    setSortDir('asc');
    onClear?.();
  };

  const showFrom = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showTo = Math.min(page * pageSize, sorted.length);

  return (
    <div className="stake-card" style={{ padding: '24px 0', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          {title && <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          {searchable && (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  background: 'rgba(13,17,23,0.6)',
                  border: '1px solid var(--stake-border)',
                  borderRadius: 8,
                  padding: '6px 10px 6px 28px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  width: 180,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--stake-indigo)')}
                onBlur={e => (e.target.style.borderColor = 'var(--stake-border)')}
              />
            </div>
          )}

          {/* Filter chips */}
          {filters && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filters.map(f => (
                <button
                  key={f.key}
                  className={`filter-chip${activeFilter === f.key ? ' active' : ''}`}
                  onClick={() => onFilterChange?.(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Clear */}
          {onClear && (searchQuery || sortKey || (activeFilter && activeFilter !== filters?.[0]?.key)) && (
            <button
              onClick={handleClear}
              style={{
                background: 'none', border: '1px solid var(--stake-border)', borderRadius: 8,
                padding: '5px 10px', fontSize: 12, color: 'var(--text-secondary)',
                cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--accent-danger)'; (e.target as HTMLButtonElement).style.color = 'var(--accent-danger)'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--stake-border)'; (e.target as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as object}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          {/* Head */}
          <thead>
            <tr style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              padding: '8px 24px',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--text-secondary)',
            }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{
                    textAlign: 'left', fontWeight: 700, padding: 0,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                    color: sortKey === col.key ? 'var(--text-primary)' : undefined,
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && (
                    <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : 'asc'} />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Divider */}
          <tbody>
            <tr><td colSpan={columns.length} style={{ padding: 0 }}>
              <div style={{ borderTop: '1px solid rgba(31,41,55,0.4)', margin: '0 24px' }} />
            </td></tr>

            {/* Rows */}
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={columns.length} style={{ padding: '12px 24px' }}>
                  <div className="skeleton" style={{ height: 14, width: '100%' }} />
                </td></tr>
              ))
            ) : paginated.length === 0 ? (
              <tr><td colSpan={columns.length}>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{emptyIcon}</div>
                  <div style={{ fontSize: 14 }}>{emptyText}</div>
                </div>
              </td></tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                    padding: '14px 24px',
                    fontSize: 13,
                    background: i % 2 === 0 ? 'rgba(17,24,39,0.3)' : 'transparent',
                    transition: 'background 0.15s',
                    margin: '0 8px',
                    borderRadius: 8,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(31,41,55,0.5)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'rgba(17,24,39,0.3)' : 'transparent')}
                >
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: 0, display: 'flex', alignItems: 'center' }}>
                      <Cell col={col} value={row[col.key]} row={row} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {sorted.length > pageSize && (
        <div style={{
          padding: '16px 24px 0',
          borderTop: '1px solid rgba(31,41,55,0.4)',
          marginTop: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <span>Showing {showFrom}–{showTo} of {sorted.length}</span>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="btn-outline-stake"
              style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => handlePage(1)}
              disabled={page === 1}
            >
              «
            </button>
            <button
              className="btn-outline-stake"
              style={{ padding: '5px 14px', fontSize: 12 }}
              onClick={() => handlePage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePage(p as number)}
                    style={{
                      padding: '5px 10px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
                      border: '1px solid',
                      background: page === p ? 'linear-gradient(135deg, var(--stake-indigo), var(--stake-violet))' : 'transparent',
                      borderColor: page === p ? 'transparent' : 'var(--stake-border)',
                      color: page === p ? 'white' : 'var(--text-secondary)',
                      minWidth: 32, fontWeight: page === p ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              className="btn-outline-stake"
              style={{ padding: '5px 14px', fontSize: 12 }}
              onClick={() => handlePage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
            <button
              className="btn-outline-stake"
              style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => handlePage(totalPages)}
              disabled={page === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
