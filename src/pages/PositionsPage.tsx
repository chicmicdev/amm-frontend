import { useState, useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKit } from '@reown/appkit/react';
import type { Position } from '../types';
import { getUserPositions, collectFees, removeLiquidity } from '../services/api/positionService';
import { useToast } from '../context/ToastContext';
import { formatNumber, shortenTxHash } from '../utils/formatUtils';
import { FEE_TIERS } from '../config/contracts';
import { useNavigate } from 'react-router-dom';

function PositionCard({
  position,
  onCollect,
  onRemove,
}: {
  position: Position;
  onCollect: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const feeLabel = FEE_TIERS.find(f => f.fee === position.fee)?.label ?? `${position.fee / 10000}%`;
  const hasFees = position.unclaimedFees0 > 0 || position.unclaimedFees1 > 0;

  return (
    <div
      className="position-card"
      onClick={() => setExpanded(e => !e)}
      style={{ marginBottom: 12 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Token icons overlapping */}
          <div style={{ position: 'relative', width: 44, height: 28 }}>
            <div
              className="token-icon"
              style={{
                background: position.token0.logoColor, width: 28, height: 28,
                fontSize: 10, position: 'absolute', left: 0, border: '2px solid var(--bg-card)'
              }}
            >
              {position.token0.symbol.slice(0, 3)}
            </div>
            <div
              className="token-icon"
              style={{
                background: position.token1.logoColor, width: 28, height: 28,
                fontSize: 10, position: 'absolute', left: 16, border: '2px solid var(--bg-card)'
              }}
            >
              {position.token1.symbol.slice(0, 3)}
            </div>
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              {position.token0.symbol}/{position.token1.symbol}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
              {feeLabel}
            </span>
          </div>
          <span className="badge" style={{ fontSize: 11 }}>#{position.tokenId}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${position.inRange ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
            {position.inRange ? '● In Range' : '○ Out of Range'}
          </span>
          <span style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Price Range Summary */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <div className="price-display" style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Min Price</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {formatNumber(position.priceLower, 4)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>↔</div>
        <div className="price-display" style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Max Price</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {formatNumber(position.priceUpper, 4)}
          </div>
        </div>
        <div className="price-display" style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Current</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {formatNumber(position.currentPrice, 4)}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div onClick={e => e.stopPropagation()}>
          <div className="divider" style={{ marginTop: 16 }} />

          {/* Liquidity amounts */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
              Pooled Tokens
            </div>
            <div className="stat-row">
              <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="token-icon"
                  style={{ background: position.token0.logoColor, width: 18, height: 18, fontSize: 8 }}
                >
                  {position.token0.symbol.slice(0, 3)}
                </span>
                {position.token0.symbol}
              </span>
              <span className="stat-value">{formatNumber(position.amount0, 4)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="token-icon"
                  style={{ background: position.token1.logoColor, width: 18, height: 18, fontSize: 8 }}
                >
                  {position.token1.symbol.slice(0, 3)}
                </span>
                {position.token1.symbol}
              </span>
              <span className="stat-value">{formatNumber(position.amount1, 4)}</span>
            </div>
          </div>

          {/* Unclaimed Fees */}
          <div
            style={{
              background: hasFees ? 'rgba(63,185,80,0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${hasFees ? 'rgba(63,185,80,0.25)' : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 14,
            }}
          >
            <div style={{
              fontSize: 12, color: hasFees ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              marginBottom: 8, fontWeight: 500,
            }}>
              Unclaimed Fees {hasFees ? '🎉' : ''}
            </div>
            <div className="stat-row">
              <span className="stat-label">{position.token0.symbol}</span>
              <span className="stat-value">{formatNumber(position.unclaimedFees0, 6)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{position.token1.symbol}</span>
              <span className="stat-value">{formatNumber(position.unclaimedFees1, 6)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => onCollect(position.tokenId)}
              disabled={!hasFees}
            >
              Collect Fees
            </button>
            <button
              className="btn-secondary"
              style={{ flex: 1, borderColor: 'rgba(248,81,73,0.4)', color: 'var(--accent-danger)' }}
              onClick={() => onRemove(position.tokenId)}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PositionsPage() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'inRange' | 'outRange'>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isConnected || !address) { setPositions([]); return; }
    setLoading(true);
    getUserPositions(address).then(setPositions).finally(() => setLoading(false));
  }, [isConnected, address]);

  const handleCollect = async (tokenId: number) => {
    if (!address) return;
    setActionLoading(tokenId);
    try {
      showToast('info', 'Collecting fees...');
      const result = await collectFees(tokenId, address);
      showToast('success', `Fees collected! Tx: ${shortenTxHash(result.hash)}`);
      // Refresh
      const updated = await getUserPositions(address);
      setPositions(updated);
    } catch (err) {
      showToast('error', (err as Error)?.message ?? 'Failed to collect fees');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (tokenId: number) => {
    setActionLoading(tokenId);
    try {
      showToast('info', 'Removing liquidity...');
      const result = await removeLiquidity(tokenId, 100);
      showToast('success', `Liquidity removed! Tx: ${shortenTxHash(result.hash)}`);
      setPositions(prev => prev.filter(p => p.tokenId !== tokenId));
    } catch (err) {
      showToast('error', (err as Error)?.message ?? 'Failed to remove liquidity');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = positions.filter(p => {
    if (filter === 'inRange') return p.inRange;
    if (filter === 'outRange') return !p.inRange;
    return true;
  });

  const inRangeCount = positions.filter(p => p.inRange).length;
  const totalUnclaimedFees0 = positions.reduce((sum, p) => sum + p.unclaimedFees0, 0);
  const totalUnclaimedFees1 = positions.reduce((sum, p) => sum + p.unclaimedFees1, 0);

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Connect Your Wallet</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 15 }}>
          Connect your wallet to view your liquidity positions.
        </p>
        <button className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => open()}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Positions</h1>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
          onClick={() => navigate('/pool')}
        >
          + New Position
        </button>
      </div>

      {/* Summary Bar */}
      {positions.length > 0 && (
        <div className="info-box" style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Positions</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{positions.length}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>In Range</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-secondary)' }}>{inRangeCount}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Unclaimed Fees</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)' }}>
              {formatNumber(totalUnclaimedFees0, 2)} / {formatNumber(totalUnclaimedFees1, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {positions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10 }}>
          {(['all', 'inRange', 'outRange'] as const).map(f => (
            <button
              key={f}
              className={`tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ flex: 1 }}
            >
              {f === 'all' ? 'All' : f === 'inRange' ? 'In Range' : 'Out of Range'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ marginTop: 12 }}>Loading positions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💧</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {positions.length === 0 ? 'No positions yet' : 'No positions match this filter'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
            {positions.length === 0
              ? 'Add liquidity to start earning fees from swaps.'
              : 'Try a different filter.'}
          </p>
          {positions.length === 0 && (
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '12px 32px' }}
              onClick={() => navigate('/pool')}
            >
              Add Liquidity
            </button>
          )}
        </div>
      ) : (
        <div>
          {filtered.map(position => (
            <PositionCard
              key={position.tokenId}
              position={position}
              onCollect={actionLoading === position.tokenId ? () => {} : handleCollect}
              onRemove={actionLoading === position.tokenId ? () => {} : handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
