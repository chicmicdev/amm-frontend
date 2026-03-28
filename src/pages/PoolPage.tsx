import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKit } from '@reown/appkit/react';
import TokenInput from '../components/common/TokenInput';
import type { Token, Pool, PoolStats } from '../types';
import { DEFAULT_TOKEN_IN, DEFAULT_TOKEN_OUT } from '../config/tokens';
import { FEE_TIERS } from '../config/contracts';
import { getPool, getPoolStats, getTokenBalance } from '../services/api/poolService';
import { addLiquidity } from '../services/api/positionService';
import { useToast } from '../context/ToastContext';
import { getTickRange } from '../utils/tickUtils';
import { formatCompactUSD, formatNumber, shortenTxHash } from '../utils/formatUtils';
import { CONTRACT_ERRORS } from '../config/contracts';
import { recordTxHistory } from '../services/history/txHistoryStorage';

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

const FULL_RANGE_MULTIPLIER = 10;

export default function PoolPage() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();
  const { showToast } = useToast();

  const [token0, setToken0] = useState<Token>(DEFAULT_TOKEN_IN);
  const [token1, setToken1] = useState<Token>(DEFAULT_TOKEN_OUT);
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

  useEffect(() => {
    setLoadingPool(true);
    Promise.all([
      getPool(token0.address, token1.address, fee),
      getPoolStats(token0.address, token1.address, fee),
    ]).then(([p, s]) => {
      setPool(p);
      setStats(s);
      if (p) {
        const currentPrice = p.price;
        setPriceLower((currentPrice * 0.9).toFixed(4));
        setPriceUpper((currentPrice * 1.1).toFixed(4));
      }
    }).finally(() => setLoadingPool(false));
  }, [token0, token1, fee]);

  useEffect(() => {
    if (isConnected && address) {
      getTokenBalance(token0.address, address).then(setBalance0);
      getTokenBalance(token1.address, address).then(setBalance1);
    }
  }, [isConnected, address, token0, token1]);

  const handleAmount0Change = (val: string) => {
    setAmount0(val);
    if (pool && val && parseFloat(val) > 0)
      setAmount1((parseFloat(val) * pool.price).toFixed(6));
  };

  const handleAmount1Change = (val: string) => {
    setAmount1(val);
    if (pool && val && parseFloat(val) > 0)
      setAmount0((parseFloat(val) / pool.price).toFixed(6));
  };

  const handleSetFullRange = () => {
    if (pool) {
      setPriceLower((pool.price / FULL_RANGE_MULTIPLIER).toFixed(6));
      setPriceUpper((pool.price * FULL_RANGE_MULTIPLIER).toFixed(6));
    }
  };

  const { tickLower, tickUpper } = pool
    ? getTickRange(fee, parseFloat(priceLower) || 0.001, parseFloat(priceUpper) || 1000)
    : { tickLower: -887220, tickUpper: 887220 };

  const currentPrice = pool?.price ?? 1;
  const inRange = parseFloat(priceLower) <= currentPrice && currentPrice <= parseFloat(priceUpper);

  const handleAddLiquidity = async () => {
    if (!isConnected) { open(); return; }
    if (!amount0 || !amount1) return;
    setLoadingTx(true);
    try {
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

  const isButtonDisabled = isConnected && (!amount0 || !amount1 || loadingTx || !pool);

  const getButtonLabel = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!pool && !loadingPool) return 'Pool does not exist';
    if (!amount0 || !amount1) return 'Enter amounts';
    return 'Add Liquidity';
  };

  const tickSpacing = FEE_TIERS.find(f => f.fee === fee)?.tickSpacing ?? 60;
  const validTickLower = Math.round(tickLower / tickSpacing) * tickSpacing;
  const validTickUpper = Math.round(tickUpper / tickSpacing) * tickSpacing;

  return (
    <div className="page-narrow">
      <motion.div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Add Liquidity</h1>
      </motion.div>

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

        {/* Pool Stats — animated in when pool loads */}
        <AnimatePresence>
          {pool && stats && (
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
                  1 {token0.symbol} = {formatNumber(stats.price, 4)} {token1.symbol}
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

        {/* No pool warning */}
        <AnimatePresence>
          {!pool && !loadingPool && (
            <motion.div
              layout
              className="warning-box"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              ⚠ No pool found for this pair and fee. You may be the first LP.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price Range */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Price Range</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {pool && (
                <span className={`badge ${inRange ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                  {inRange ? '● In Range' : '○ Out of Range'}
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
                  onChange={e => onChange(e.target.value)}
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
              <div style={{ fontSize: 13, fontWeight: 600 }}>{validTickLower}</div>
            </div>
            <div className="price-display" style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tick Upper</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{validTickUpper}</div>
            </div>
          </div>

          {/* ── Out-of-range warning animates in/out without layout jump ── */}
          <AnimatePresence>
            {!inRange && pool && (
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
              onTokenChange={() => {}} onAmountChange={handleAmount0Change}
            />
            <TokenInput
              label={token1.symbol} token={token1} amount={amount1}
              balance={isConnected ? balance1 : undefined}
              onTokenChange={() => {}} onAmountChange={handleAmount1Change}
            />
          </div>
        </div>

        {/* Summary — slides in when both amounts are entered */}
        <AnimatePresence>
          {amount0 && amount1 && pool && (
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
    </div>
  );
}
