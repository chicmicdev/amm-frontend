import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TiltCard from '../components/common/TiltCard';
import DataTable from '../components/common/DataTable';
import type { ColumnConfig } from '../components/common/DataTable';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKit } from '@reown/appkit/react';
import TokenInput from '../components/common/TokenInput';
import type { Token, Pool, PoolStats } from '../types';
import { useTokens } from '../context/TokensContext';
import { FEE_TIERS, CONTRACT_ERRORS } from '../config/contracts';
import { listPoolsFromIndex } from '../services/api/poolsListApi';
import {
  ensurePoolCreatedAndInitialized,
  getPool,
  getPoolStats,
  getTokenBalance,
} from '../services/api/poolService';
import { humanPriceToken1PerToken0ToSqrtPriceX96 } from '../utils/liquidityAmounts';
import { addLiquidity } from '../services/api/positionService';
import { useToast } from '../context/ToastContext';
import { formatCompactUSD, formatNumber, shortenTxHash } from '../utils/formatUtils';
import { recordTxHistory } from '../services/history/txHistoryStorage';
import { getTickRange, maxRangeTicksForSpacing } from '../utils/tickUtils';

// ─── spring variants ────────────────────────────────────────────────────────
const cardSpring = {
  initial: { opacity: 0, scale: 0.95, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  whileInView: { opacity: 1, scale: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
};

function resolveError(err: unknown): string {
  const msg = (err as { reason?: string; message?: string })?.reason
    || (err as { message?: string })?.message || 'Transaction failed';
  for (const [code, friendly] of Object.entries(CONTRACT_ERRORS)) {
    if (msg.includes(code)) return friendly;
  }
  return msg;
}

const POOLS_INDEX_PAGE_SIZE = 10;

function symbolForAddress(addr: string, registry: Token[]): string {
  const hit = registry.find(t => t.address.toLowerCase() === addr.toLowerCase());
  return hit?.symbol ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function feeBpsLabel(bps: number): string {
  const tier = FEE_TIERS.find(f => f.fee === bps);
  return tier?.label ?? `${bps / 10_000}%`;
}

/** Enough fractional digits so small spot prices (e.g. WETH per USDC) do not collapse to 0.0000. */
function decimalsForSpotRange(spot: number): number {
  if (!Number.isFinite(spot) || spot <= 0) return 8;
  const log10 = Math.log10(spot);
  if (log10 >= -2) return 4;
  if (log10 >= -6) return 8;
  return Math.min(18, Math.ceil(-log10) + 2);
}

function spotToRangeStrings(uiSpot: number): { lower: string; upper: string } {
  const d = decimalsForSpotRange(uiSpot);
  return {
    lower: (uiSpot * 0.9).toFixed(d),
    upper: (uiSpot * 1.1).toFixed(d),
  };
}

/** Avoid `toFixed(6)` wiping tiny linked amounts for token1-heavy pairs. */
function formatLinkedDepositAmount(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';
  const a = Math.abs(value);
  const frac = a >= 1 ? 6 : a >= 0.01 ? 8 : a >= 1e-6 ? 12 : 18;
  let s = value.toFixed(frac);
  s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return s;
}

export default function PoolPage() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();
  const { showToast } = useToast();
  const { tokens } = useTokens();

  const [token0, setToken0] = useState<Token>(() => tokens[0]);
  const [token1, setToken1] = useState<Token>(() => tokens[1]);

  useEffect(() => {
    setToken0(prev => tokens.find(t => t.address === prev.address) ?? tokens[0] ?? prev);
    setToken1(prev => tokens.find(t => t.address === prev.address) ?? tokens[1] ?? prev);
  }, [tokens]);
  const [fee, setFee] = useState(3000);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [priceLower, setPriceLower] = useState('0.9');
  const [priceUpper, setPriceUpper] = useState('1.1');
  const [pool, setPool] = useState<Pool | null>(null);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loadingPool, setLoadingPool] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [balance0, setBalance0] = useState('0');
  const [balance1, setBalance1] = useState('0');
  /** When true, mint uses max usable ticks for this fee tier (matches common "full range"). */
  const [fullRange, setFullRange] = useState(false);
  const [poolMode, setPoolMode] = useState<'existing' | 'new'>('existing');
  /** Human: Token B per Token A (same convention as min/max range inputs). Used when creating or initializing a pool. */
  const [initialPrice, setInitialPrice] = useState('1');

  const [indexRows, setIndexRows] = useState<Record<string, unknown>[]>([]);
  const [indexTotal, setIndexTotal] = useState(0);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [indexPage, setIndexPage] = useState(1);
  /** API only accepts sortKey=createdAt for /pools */
  const [indexCreatedDir, setIndexCreatedDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (poolMode !== 'existing') return;
    let cancelled = false;
    (async () => {
      setIndexLoading(true);
      setIndexError(null);
      try {
        const skip = (indexPage - 1) * POOLS_INDEX_PAGE_SIZE;
        const sortDirection = indexCreatedDir === 'asc' ? 1 : -1;
        const { pools, total } = await listPoolsFromIndex({
          skip,
          limit: POOLS_INDEX_PAGE_SIZE,
          sortKey: 'createdAt',
          sortDirection,
        });
        if (cancelled) return;
        const rows = pools.map(p => {
          const feeNum = Number.parseInt(p.fee, 10);
          return {
            _rowKey: p.poolAddress,
            pair: `${symbolForAddress(p.token0, tokens)} / ${symbolForAddress(p.token1, tokens)}`,
            feeLabel: feeBpsLabel(Number.isFinite(feeNum) ? feeNum : 0),
            poolAddress: p.poolAddress,
            createdAt: new Date(p.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          };
        });
        setIndexRows(rows);
        setIndexTotal(total);
      } catch (e) {
        if (!cancelled) {
          setIndexError((e as Error)?.message ?? 'Failed to load pools');
          setIndexRows([]);
          setIndexTotal(0);
        }
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poolMode, indexPage, indexCreatedDir, tokens]);

  useEffect(() => {
    setIndexPage(1);
  }, [poolMode]);

  /** Invalidate range when fee tier changes so we never keep the previous pool's ticks/prices. */
  useEffect(() => {
    setPriceLower('0.9');
    setPriceUpper('1.1');
    setFullRange(false);
  }, [fee]);

  useEffect(() => {
    setLoadingPool(true);
    Promise.all([
      getPool(token0.address, token1.address, fee),
      getPoolStats(token0.address, token1.address, fee),
    ]).then(([p, s]) => {
      setPool(p);
      setStats(s);
      if (p && BigInt(p.sqrtPriceX96) !== 0n) {
        const uiP =
          p.token0.address.toLowerCase() === token0.address.toLowerCase()
            ? p.price
            : 1 / p.price;
        const { lower, upper } = spotToRangeStrings(uiP);
        setPriceLower(lower);
        setPriceUpper(upper);
      }
    }).finally(() => setLoadingPool(false));
  }, [token0, token1, fee]);

  const poolInitialized = pool !== null && BigInt(pool.sqrtPriceX96) !== 0n;
  const needBootstrap = poolMode === 'new' && !poolInitialized;

  useEffect(() => {
    if (loadingPool) return;
    if (poolMode !== 'new' || poolInitialized) return;
    const p = Number.parseFloat(initialPrice);
    if (!Number.isFinite(p) || p <= 0) return;
    const { lower, upper } = spotToRangeStrings(p);
    setPriceLower(lower);
    setPriceUpper(upper);
  }, [pool, loadingPool, initialPrice, poolMode, poolInitialized, token0.address, token1.address]);

  useEffect(() => {
    if (isConnected && address) {
      getTokenBalance(token0.address, address).then(setBalance0);
      getTokenBalance(token1.address, address).then(setBalance1);
    }
  }, [isConnected, address, token0, token1]);

  useEffect(() => {
    setFullRange(false);
  }, [token0.address, token1.address, fee]);

  const linkPrice = useMemo(() => {
    if (poolInitialized && pool) {
      const match = pool.token0.address.toLowerCase() === token0.address.toLowerCase();
      const p = match ? pool.price : 1 / pool.price;
      return Number.isFinite(p) && p > 0 ? p : null;
    }
    if (poolMode === 'existing' && !poolInitialized) {
      const pl = Number.parseFloat(priceLower);
      const pu = Number.parseFloat(priceUpper);
      if (Number.isFinite(pl) && Number.isFinite(pu) && pl > 0 && pu > 0 && pl < pu) {
        return Math.sqrt(pl * pu);
      }
    }
    const ip = Number.parseFloat(initialPrice);
    if (!Number.isFinite(ip) || ip <= 0) return null;
    if (poolMode === 'new') return ip;
    if (poolMode === 'existing') return ip;
    return null;
  }, [pool, poolInitialized, token0.address, initialPrice, poolMode, priceLower, priceUpper]);

  const amount0Ref = useRef(amount0);
  amount0Ref.current = amount0;

  /** If amount0 was entered while pool/linkPrice was loading, fill amount1 once price is known. */
  useEffect(() => {
    if (linkPrice === null) return;
    const raw = amount0Ref.current.trim();
    if (!raw) return;
    const a0 = Number.parseFloat(raw);
    if (!Number.isFinite(a0) || a0 <= 0) return;
    setAmount1(formatLinkedDepositAmount(a0 * linkPrice));
  }, [linkPrice, fee, pool?.address]);

  const handleAmount0Change = (val: string) => {
    setAmount0(val);
    if (linkPrice !== null && val) {
      const a0 = Number.parseFloat(val);
      if (Number.isFinite(a0) && a0 > 0) {
        setAmount1(formatLinkedDepositAmount(a0 * linkPrice));
      }
    }
  };

  const handleAmount1Change = (val: string) => {
    setAmount1(val);
    if (linkPrice !== null && val) {
      const a1 = Number.parseFloat(val);
      if (Number.isFinite(a1) && a1 > 0) {
        setAmount0(formatLinkedDepositAmount(a1 / linkPrice));
      }
    }
  };

  const tickSpacing = FEE_TIERS.find(f => f.fee === fee)?.tickSpacing ?? 60;

  const { tickLower, tickUpper, ticksReady } = useMemo(() => {
    if (fullRange) return { ...maxRangeTicksForSpacing(tickSpacing), ticksReady: true as const };
    const lo = parseFloat(priceLower);
    const hi = parseFloat(priceUpper);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= 0 || lo >= hi) {
      return { tickLower: 0, tickUpper: 0, ticksReady: false as const };
    }
    const r = getTickRange(fee, lo, hi);
    return { tickLower: r.tickLower, tickUpper: r.tickUpper, ticksReady: true as const };
  }, [fullRange, tickSpacing, fee, priceLower, priceUpper]);

  const currentPrice = linkPrice ?? 1;
  const pl = parseFloat(priceLower);
  const pu = parseFloat(priceUpper);
  const rangePricesValid =
    fullRange || (Number.isFinite(pl) && Number.isFinite(pu) && pl > 0 && pu > 0 && pl < pu);
  const inRange =
    fullRange
    || (linkPrice !== null
      && Number.isFinite(pl)
      && Number.isFinite(pu)
      && pl <= currentPrice
      && currentPrice <= pu);

  const handleSetFullRange = () => {
    setFullRange(true);
  };

  const handleAddLiquidity = async () => {
    if (!isConnected) { open(); return; }
    if (!amount0 || !amount1) return;
    if (!rangePricesValid) {
      showToast('error', 'Set a valid price range (min must be below max) or tap Full range.');
      return;
    }
    if (!(tickLower < tickUpper)) {
      showToast('error', 'Invalid ticks for this range. Widen min/max price or use Full range.');
      return;
    }
    setLoadingTx(true);
    try {
      if (needBootstrap) {
        const ip = parseFloat(initialPrice);
        if (!Number.isFinite(ip) || ip <= 0) {
          showToast('error', 'Set a valid starting price (Token B per Token A).');
          setLoadingTx(false);
          return;
        }
        const lo =
          token0.address.toLowerCase() < token1.address.toLowerCase() ? token0 : token1;
        const hi =
          token0.address.toLowerCase() < token1.address.toLowerCase() ? token1 : token0;
        const aIsLo = token0.address.toLowerCase() === lo.address.toLowerCase();
        const chainHuman1Per0 = aIsLo ? ip : 1 / ip;
        const sqrtX96 = humanPriceToken1PerToken0ToSqrtPriceX96(
          chainHuman1Per0,
          lo.decimals,
          hi.decimals,
        );
        if (sqrtX96 === 0n) {
          showToast('error', 'Could not derive starting price — try a different value.');
          setLoadingTx(false);
          return;
        }
        showToast('info', 'Creating or initializing pool...');
        await ensurePoolCreatedAndInitialized(token0.address, token1.address, fee, sqrtX96);
        const [freshPool, freshStats] = await Promise.all([
          getPool(token0.address, token1.address, fee),
          getPoolStats(token0.address, token1.address, fee),
        ]);
        setPool(freshPool);
        setStats(freshStats);
      }
      showToast('info', 'Adding liquidity...');
      const result = await addLiquidity({
        token0, token1, fee, tickLower, tickUpper,
        amount0Desired: amount0, amount1Desired: amount1,
      });
      if (address) {
        recordTxHistory(address, {
          hash: result.hash,
          kind: 'add_liquidity',
          summary: `Added liquidity ${token0.symbol}/${token1.symbol} · NFT #${result.tokenId}`,
        });
      }
      showToast('success', `Liquidity added! Token ID: #${result.tokenId}. Tx: ${shortenTxHash(result.hash)}`);
      setAmount0(''); setAmount1('');
    } catch (err) {
      showToast('error', resolveError(err));
    } finally {
      setLoadingTx(false);
    }
  };

  const initialValid = Number.isFinite(parseFloat(initialPrice)) && parseFloat(initialPrice) > 0;

  const isButtonDisabled =
    isConnected
    && (
      !amount0
      || !amount1
      || loadingTx
      || !rangePricesValid
      || (poolMode === 'existing' && (!pool || !poolInitialized))
      || (needBootstrap && !initialValid)
    );

  const getButtonLabel = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!amount0 || !amount1) return 'Enter amounts';
    if (!rangePricesValid) return 'Set price range';
    if (poolMode === 'existing' && !pool && !loadingPool) return 'Pool does not exist';
    if (poolMode === 'existing' && pool && !poolInitialized) return 'Pool not initialized — use New pool';
    if (needBootstrap && !initialValid) return 'Set starting price';
    if (needBootstrap) return 'Create pool & add liquidity';
    return 'Add Liquidity';
  };

  const poolsIndexColumns = useMemo<ColumnConfig[]>(
    () => [
      { key: 'pair', label: 'Pair', type: 'text' },
      { key: 'feeLabel', label: 'Fee', type: 'text' },
      { key: 'poolAddress', label: 'Pool contract', type: 'hash' },
      { key: 'createdAt', label: 'Created', type: 'text', sortable: true },
    ],
    [],
  );

  const onPoolsTableSort = useCallback((key: string, dir: 'asc' | 'desc') => {
    if (key !== 'createdAt') return;
    setIndexPage(1);
    setIndexCreatedDir(dir);
  }, []);

  return (
    <div className="page-narrow">
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Add Liquidity</h1>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['existing', 'new'] as const).map(m => (
            <motion.button
              key={m}
              type="button"
              onClick={() => setPoolMode(m)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                border: '1px solid',
                background: poolMode === m ? 'rgba(88,166,255,0.15)' : 'var(--bg-secondary)',
                borderColor: poolMode === m ? 'var(--accent-primary)' : 'var(--border)',
                color: poolMode === m ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              {m === 'existing' ? 'Existing pool' : 'New pool'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {poolMode === 'existing' ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ marginBottom: 20 }}
        >
          {indexError && (
            <div className="warning-box" style={{ marginBottom: 12 }}>
              Could not load pool list: {indexError}
            </div>
          )}
          <DataTable
            title="Pools on index"
            subtitle="Registered pools from the indexer API (add liquidity below for a specific pair)."
            columns={poolsIndexColumns}
            data={indexRows}
            loading={indexLoading}
            pageSize={POOLS_INDEX_PAGE_SIZE}
            serverPaginated
            totalRowCount={indexTotal}
            currentPage={indexPage}
            initialSort={{ key: 'createdAt', dir: 'desc' }}
            onSort={onPoolsTableSort}
            onPageChange={p => setIndexPage(p)}
            emptyText="No pools returned from the API"
          />
        </motion.div>
      ) : <>
        {/* ── 1. Card entrance with spring ── */}
          <motion.div
            className="card glow"
            layout
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            {...cardSpring}
          >
            {/* Token Pair */}
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
                Select Pair
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <TokenInput
                  label="Token A" token={token0} amount=""
                  onTokenChange={t => { setToken0(t); setAmount0(''); setAmount1(''); }}
                  excludeToken={token1} readonly
                />
                <TokenInput
                  label="Token B" token={token1} amount=""
                  onTokenChange={t => { setToken1(t); setAmount0(''); setAmount1(''); }}
                  excludeToken={token0} readonly
                />
              </div>
            </div>

            {/* Fee Tier */}
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
                Fee Tier
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {FEE_TIERS.map(tier => (
                  <motion.button
                    key={tier.fee}
                    onClick={() => setFee(tier.fee)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10, fontWeight: 600,
                      fontSize: 13, cursor: 'pointer', border: '1px solid', textAlign: 'center',
                      background: fee === tier.fee ? 'rgba(88,166,255,0.15)' : 'var(--bg-secondary)',
                      borderColor: fee === tier.fee ? 'var(--accent-primary)' : 'var(--border)',
                      color: fee === tier.fee ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                    }}
                  >
                    <div>{tier.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>{tier.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {needBootstrap && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
                  Starting price
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                  Used when the pool is missing or not initialized yet. Same units as the range below:{' '}
                  <strong>
                    1 {token0.symbol} = ? {token1.symbol}
                  </strong>
                  .
                </div>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={initialPrice}
                  onChange={e => setInitialPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                />
              </div>
            )}

            {/* Pool Stats — animated in when pool loads */}
            <AnimatePresence>
              {pool && stats && poolInitialized && (
                <motion.div
                  layout
                  className="info-box"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Current Price</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      1 {token0.symbol} ={' '}
                      {formatNumber(
                        pool.token0.address.toLowerCase() === token0.address.toLowerCase()
                          ? pool.price
                          : 1 / pool.price,
                        4,
                      )}{' '}
                      {token1.symbol}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: 'TVL', value: formatCompactUSD(stats.tvl) },
                      { label: '24h Volume', value: formatCompactUSD(stats.volume24h) },
                      { label: '24h Fees', value: formatCompactUSD(stats.fees24h) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {pool && !poolInitialized && (
                <motion.div
                  layout
                  className="warning-box"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  Pool contract exists but has no starting price yet. Use <strong>New pool</strong>, set starting
                  price, then add liquidity (or initialize first).
                </motion.div>
              )}
            </AnimatePresence>

            {/* No pool warning */}
            <AnimatePresence>
              {poolMode === 'existing' && !pool && !loadingPool && (
                <motion.div
                  layout
                  className="warning-box"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  ⚠ No pool found for this pair and fee. Switch to <strong>New pool</strong> to deploy and seed it.
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {poolMode === 'new' && !pool && !loadingPool && (
                <motion.div
                  layout
                  className="info-box"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  No pool yet for this pair
                </motion.div>
              )}
            </AnimatePresence>

            {/* Price Range */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Price Range</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {poolInitialized && (
                    <span className={`badge ${inRange ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                      {inRange ? '● In Range' : '○ Out of Range'}
                    </span>
                  )}
                  {fullRange && (
                    <span className="badge" style={{ fontSize: 11 }}>
                      Max tick range
                    </span>
                  )}
                  <motion.button
                    className="btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={handleSetFullRange}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Full Range
                  </motion.button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Min Price', value: priceLower, onChange: setPriceLower },
                  { label: 'Max Price', value: priceUpper, onChange: setPriceUpper },
                ].map(({ label, value, onChange }) => (
                  <div key={label} className="range-input">
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
                    <input
                      type="number"
                      value={value}
                      onChange={e => {
                        setFullRange(false);
                        onChange(e.target.value);
                      }}
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
                        width: '100%', textAlign: 'center',
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {token1.symbol} per {token0.symbol}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div className="price-display" style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tick Lower</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ticksReady ? tickLower : '—'}</div>
                </div>
                <div className="price-display" style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tick Upper</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ticksReady ? tickUpper : '—'}</div>
                </div>
              </div>

              {/* ── Out-of-range warning animates in/out without layout jump ── */}
              <AnimatePresence>
                {!inRange && poolInitialized && pool && (
                  <motion.div
                    layout
                    className="warning-box"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    ⚠ Your position will not earn fees at the current price of {formatNumber(currentPrice, 4)}.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Deposit Amounts */}
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
                Deposit Amounts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <TokenInput
                  label={token0.symbol} token={token0} amount={amount0}
                  balance={isConnected ? balance0 : undefined}
                  onTokenChange={() => { }} onAmountChange={handleAmount0Change}
                />
                <TokenInput
                  label={token1.symbol} token={token1} amount={amount1}
                  balance={isConnected ? balance1 : undefined}
                  onTokenChange={() => { }} onAmountChange={handleAmount1Change}
                />
              </div>
            </div>

            {/* Summary — slides in when both amounts are entered */}
            <AnimatePresence>
              {amount0 && amount1 && (poolInitialized || poolMode === 'new') && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="divider" />
                  {[
                    { label: `Pooled ${token0.symbol}`, value: formatNumber(parseFloat(amount0), 4) },
                    { label: `Pooled ${token1.symbol}`, value: formatNumber(parseFloat(amount1), 4) },
                    { label: 'Price Range', value: `${priceLower} – ${priceUpper}` },
                    { label: 'Fee Tier', value: FEE_TIERS.find(f => f.fee === fee)?.label },
                  ].map(({ label, value }) => (
                    <div key={label} className="stat-row">
                      <span className="stat-label">{label}</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 4. Primary action button with hover / tap / loading pulse ── */}
            <motion.button
              layout
              className="btn-primary"
              onClick={handleAddLiquidity}
              disabled={!!isButtonDisabled}
              whileHover={!isButtonDisabled ? { scale: 1.015, y: -1 } : {}}
              whileTap={!isButtonDisabled ? { scale: 0.985 } : {}}
              animate={
                loadingTx
                  ? { opacity: [0.4, 1, 0.4] }
                  : { opacity: 1 }
              }
              transition={
                loadingTx
                  ? { opacity: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' } }
                  : { type: 'spring', stiffness: 400, damping: 20 }
              }
            >
              {loadingTx ? <span className="spinner" /> : getButtonLabel()}
            </motion.button>
          </motion.div>
        </>}
    </div>
  );
}
