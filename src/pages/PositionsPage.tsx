import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKit } from '@reown/appkit/react';
import type { Position } from '../types';
import { getUserPositions, collectFees, removeLiquidity } from '../services/api/positionService';
import { useToast } from '../context/ToastContext';
import { formatNumber, shortenTxHash } from '../utils/formatUtils';
import { FEE_TIERS } from '../config/contracts';
import { useNavigate } from 'react-router-dom';
import { recordTxHistory } from '../services/history/txHistoryStorage';
import TokenIcon from '../components/common/TokenIcon';

// ─── stagger container for the list ─────────────────────────────────────────
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
  },
  exit: { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.18 } },
};

function PositionCard({
  position, onCollect, onRemove,
}: {
  position: Position;
  onCollect: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const feeLabel = FEE_TIERS.find(f => f.fee === position.fee)?.label ?? `${position.fee / 10000}%`;
  const hasFees = position.unclaimedFees0 > 0 || position.unclaimedFees1 > 0;

  return (
    <motion.div
      layout
      className="position-card"
      onClick={() => setExpanded(e => !e)}
      style={{ marginBottom: 12 }}
      whileHover={{ borderColor: 'var(--accent-primary)', boxShadow: '0 0 20px rgba(88,166,255,0.12)' }}
      transition={{ duration: 0.18 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="relative h-7 w-11 shrink-0">
            <TokenIcon
              token={position.token0}
              size="md"
              className="absolute left-0 top-0 border-2 border-[var(--bg-card)]"
            />
            <TokenIcon
              token={position.token1}
              size="md"
              className="absolute left-4 top-0 border-2 border-[var(--bg-card)]"
            />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              {position.token0.symbol}/{position.token1.symbol}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{feeLabel}</span>
          </div>
          <span className="badge" style={{ fontSize: 11 }}>#{position.tokenId}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${position.inRange ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
            {position.inRange ? '● In Range' : '○ Out of Range'}
          </span>
          {/* Animated chevron */}
          <motion.span
            style={{ color: 'var(--text-secondary)', display: 'inline-block' }}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            ▼
          </motion.span>
        </div>
      </div>

      {/* Price Range Summary */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {[
          { label: 'Min Price', value: formatNumber(position.priceLower, 4) },
          null, // separator
          { label: 'Max Price', value: formatNumber(position.priceUpper, 4) },
          { label: 'Current', value: formatNumber(position.currentPrice, 4) },
        ].map((item, i) =>
          item === null ? (
            <div key={i} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>↔</div>
          ) : (
            <div key={item.label} className="price-display" style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</div>
            </div>
          )
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="divider" style={{ marginTop: 16 }} />

            {/* Liquidity amounts */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>Pooled Tokens</div>
              {[
                { token: position.token0, amount: position.amount0 },
                { token: position.token1, amount: position.amount1 },
              ].map(({ token, amount }) => (
                <div key={token.symbol} className="stat-row">
                  <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TokenIcon token={token} size="xs" />
                    {token.symbol}
                  </span>
                  <span className="stat-value">{formatNumber(amount, 4)}</span>
                </div>
              ))}
            </div>

            {/* Unclaimed Fees */}
            <div style={{
              background: hasFees ? 'rgba(63,185,80,0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${hasFees ? 'rgba(63,185,80,0.25)' : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 12, color: hasFees ? 'var(--accent-secondary)' : 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                Unclaimed Fees {hasFees ? '🎉' : ''}
              </div>
              {[
                { symbol: position.token0.symbol, fee: position.unclaimedFees0 },
                { symbol: position.token1.symbol, fee: position.unclaimedFees1 },
              ].map(({ symbol, fee }) => (
                <div key={symbol} className="stat-row">
                  <span className="stat-label">{symbol}</span>
                  <span className="stat-value">{formatNumber(fee, 6)}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => onCollect(position.tokenId)}
                disabled={!hasFees}
                whileHover={hasFees ? { scale: 1.03 } : {}}
                whileTap={hasFees ? { scale: 0.97 } : {}}
              >
                Collect Fees
              </motion.button>
              <motion.button
                className="btn-secondary"
                style={{ flex: 1, borderColor: 'rgba(248,81,73,0.4)', color: 'var(--accent-danger)' }}
                onClick={() => onRemove(position.tokenId)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Remove
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  const [positionPage, setPositionPage] = useState(0);
  const pageSize = 10;

  // Keep a stable reference to `showToast` so the fetch effect does not
  // re-run when the toast function identity changes (some contexts recreate it).
  const toastRef = useRef(showToast);
  useEffect(() => { toastRef.current = showToast }, [showToast]);

  useEffect(() => {
    if (!isConnected || !address) { setPositions([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await getUserPositions(address);
        if (cancelled) return;
        setPositions(res.positions);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load positions:', err);
          toastRef.current('error', (err as Error)?.message ?? 'Could not load positions');
          setPositions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true };
  }, [isConnected, address]);

  const handleCollect = async (tokenId: number) => {
    if (!address) return;
    setActionLoading(tokenId);
    try {
      showToast('info', 'Collecting fees...');
      const result = await collectFees(tokenId, address);
      const pos = positions.find(p => p.tokenId === tokenId);
      const pair = pos ? `${pos.token0.symbol}/${pos.token1.symbol}` : `position #${tokenId}`;
      recordTxHistory(address, { hash: result.hash, kind: 'collect_fees', summary: `Collected fees · ${pair}` });
      showToast('success', `Fees collected! Tx: ${shortenTxHash(result.hash)}`);
      const updated = await getUserPositions(address);
      setPositions(updated.positions);
    } catch (err) {
      showToast('error', (err as Error)?.message ?? 'Failed to collect fees');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (tokenId: number) => {
    if (!address) return;
    setActionLoading(tokenId);
    try {
      showToast('info', 'Removing liquidity...');
      const result = await removeLiquidity(tokenId, 100);
      const pos = positions.find(p => p.tokenId === tokenId);
      const pair = pos ? `${pos.token0.symbol}/${pos.token1.symbol}` : `position #${tokenId}`;
      if (address) {
        recordTxHistory(address, { hash: result.hash, kind: 'remove_liquidity', summary: `Removed liquidity · ${pair} · NFT #${tokenId}` });
      }
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            style={{ textAlign: 'center', padding: '60px 20px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Connect Your Wallet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 15 }}>
              Connect your wallet to view your liquidity positions.
            </p>
            <motion.button
              className="btn-primary"
              style={{ width: 'auto', padding: '12px 32px' }}
              onClick={() => open()}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
            >
              Connect Wallet
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <motion.div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 52, paddingBottom: 8 }}
          initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Positions</h1>
        <motion.button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
          onClick={() => navigate('/pool')}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
        >
          + New Position
        </motion.button>
      </motion.div>



      {/* Summary Bar */}
      <AnimatePresence>
        {positions.length > 0 && (
          <motion.div
            className="info-box"
            style={{ marginBottom: 16, display: 'flex', gap: 16 }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {[
              { label: 'Positions', value: positions.length, color: undefined },
              { label: 'In Range', value: inRangeCount, color: 'var(--accent-secondary)' },
              {
                label: 'Unclaimed Fees',
                value: `${formatNumber(totalUnclaimedFees0, 2)} / ${formatNumber(totalUnclaimedFees1, 2)}`,
                color: 'var(--accent-secondary)',
                small: true,
              },
            ].map(({ label, value, color, small }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
                <div style={{ fontSize: small ? 13 : 18, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      {positions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10 }}>
          {(['all', 'inRange', 'outRange'] as const).map(f => (
            <motion.button
              key={f}
              className={`tab${filter === f ? ' active' : ''}`}
              onClick={() => { setFilter(f); setPositionPage(0); }}
              style={{ flex: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {f === 'all' ? 'All' : f === 'inRange' ? 'In Range' : 'Out of Range'}
            </motion.button>
          ))}
        </div>
      )}

      {loading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                marginBottom: 12,
                overflow: 'hidden',
              }}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* Token icons skeleton */}
                <div style={{ display: 'flex', gap: -8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                    }}
                  />
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      marginLeft: -8,
                    }}
                  />
                </div>

                {/* Header info skeleton */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 16,
                      borderRadius: 4,
                      background: 'var(--bg-secondary)',
                      marginBottom: 8,
                      width: '40%',
                    }}
                  />
                  <div
                    style={{
                      height: 12,
                      borderRadius: 4,
                      background: 'var(--bg-secondary)',
                      width: '25%',
                    }}
                  />
                </div>

                {/* Badge skeleton */}
                <div
                  style={{
                    height: 20,
                    borderRadius: 4,
                    background: 'var(--bg-secondary)',
                    width: 80,
                  }}
                />

                {/* Chevron skeleton */}
                <div
                  style={{
                    height: 16,
                    width: 16,
                    borderRadius: 4,
                    background: 'var(--bg-secondary)',
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          style={{ textAlign: 'center', padding: '40px 20px' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>💧</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {positions.length === 0 ? 'No positions yet' : 'No positions match this filter'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
            {positions.length === 0 ? 'Add liquidity to start earning fees.' : 'Try a different filter.'}
          </p>
          {positions.length === 0 && (
            <motion.button
              className="btn-primary"
              style={{ width: 'auto', padding: '12px 32px' }}
              onClick={() => navigate('/pool')}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
            >
              Add Liquidity
            </motion.button>
          )}
        </motion.div>
      ) : (
        /* ── Staggered card list ── */
        <motion.div
          variants={listVariants}
          whileInView="visible"
        >
          <AnimatePresence>
            {filtered.slice(positionPage * pageSize, (positionPage + 1) * pageSize).map(position => (
              <motion.div key={position.tokenId} variants={cardVariants} exit={cardVariants.exit} layout>
                <PositionCard
                  position={position}
                  onCollect={actionLoading === position.tokenId ? () => { } : handleCollect}
                  onRemove={actionLoading === position.tokenId ? () => { } : handleRemove}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length > pageSize && (() => {
            const totalPages = Math.ceil(filtered.length / pageSize);
            const startIdx = positionPage * pageSize + 1;
            const endIdx = Math.min((positionPage + 1) * pageSize, filtered.length);

            return (
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing {startIdx}–{endIdx} of {filtered.length}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn-pagination"
                    onClick={() => setPositionPage(0)}
                    disabled={positionPage === 0}
                  >
                    «
                  </button>
                  <button
                    className="btn-pagination"
                    onClick={() => setPositionPage(p => Math.max(0, p - 1))}
                    disabled={positionPage === 0}
                  >
                    ← Prev
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`btn-pagination ${positionPage === i ? 'active' : ''}`}
                      onClick={() => setPositionPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    className="btn-pagination"
                    onClick={() => setPositionPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={positionPage === totalPages - 1}
                  >
                    Next →
                  </button>
                  <button
                    className="btn-pagination"
                    onClick={() => setPositionPage(totalPages - 1)}
                    disabled={positionPage === totalPages - 1}
                  >
                    »
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
      </div>
    </div>
  );
}
