import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import TokenInput from '../components/common/TokenInput';
import SlippageSettings from '../components/swap/SlippageSettings';
import type { Token, SwapQuote } from '../types';
import { DEFAULT_TOKEN_IN, DEFAULT_TOKEN_OUT } from '../config/tokens';
import { FEE_TIERS, CONTRACT_ERRORS } from '../config/contracts';
import { getSwapQuote, getTokenBalance, executeSwap } from '../services/api/poolService';
import { useToast } from '../context/ToastContext';
import { formatNumber, formatPercent, shortenTxHash } from '../utils/formatUtils';
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
    || (err as { message?: string })?.message
    || 'Transaction failed';
  for (const [code, friendly] of Object.entries(CONTRACT_ERRORS)) {
    if (msg.includes(code)) return friendly;
  }
  return msg;
}

export default function SwapPage() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();
  const { showToast } = useToast();

  const [tokenIn, setTokenIn] = useState<Token>(DEFAULT_TOKEN_IN);
  const [tokenOut, setTokenOut] = useState<Token>(DEFAULT_TOKEN_OUT);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [fee, setFee] = useState(3000);
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingSwap, setLoadingSwap] = useState(false);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  // ── 2. track rotation state for the swap arrow ──
  const [arrowFlipped, setArrowFlipped] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      getTokenBalance(tokenIn.address, address).then(setBalanceIn);
      getTokenBalance(tokenOut.address, address).then(setBalanceOut);
    }
  }, [isConnected, address, tokenIn, tokenOut]);

  const fetchQuote = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null); setAmountOut(''); return;
    }
    setLoadingQuote(true);
    try {
      const q = await getSwapQuote({ tokenIn, tokenOut, fee, amountIn: amount, slippage });
      if (q) { setQuote(q); setAmountOut(q.amountOut); }
      else { setQuote(null); setAmountOut(''); }
    } finally {
      setLoadingQuote(false);
    }
  }, [tokenIn, tokenOut, fee, slippage]);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuote(amountIn), 400);
    return () => clearTimeout(timer);
  }, [amountIn, fetchQuote]);

  const handleSwapTokens = () => {
    setArrowFlipped(f => !f);
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
    setQuote(null);
  };

  const handleSwap = async () => {
    if (!isConnected) { open(); return; }
    if (!amountIn || !quote) return;
    setLoadingSwap(true);
    try {
      showToast('info', 'Transaction submitted...');
      const result = await executeSwap({ tokenIn, tokenOut, fee, amountIn, slippage });
      if (address) {
        recordTxHistory(address, {
          hash: result.hash,
          kind: 'swap',
          summary: `Swapped ${amountIn} ${tokenIn.symbol} → ~${quote.amountOut} ${tokenOut.symbol}`,
        });
      }
      showToast('success', `Swapped successfully! Tx: ${shortenTxHash(result.hash)}`);
      setAmountIn(''); setAmountOut(''); setQuote(null);
    } catch (err) {
      showToast('error', resolveError(err));
    } finally {
      setLoadingSwap(false);
    }
  };

  const insufficientBalance = parseFloat(amountIn || '0') > parseFloat(balanceIn || '0');

  const btnDisabled = isConnected && (
    !amountIn || parseFloat(amountIn) === 0 || insufficientBalance || loadingSwap || loadingQuote
  );

  const btnLabel = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!amountIn || parseFloat(amountIn) === 0) return 'Enter an amount';
    if (insufficientBalance) return `Insufficient ${tokenIn.symbol} balance`;
    return `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`;
  };

  return (
    <div className="page-narrow">
      <motion.div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Swap</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Flux Swap
          </p>
        </div>
      </motion.div>

      {/* ── 1. Card entrance with spring ── */}
      <motion.div
        className="card glow"
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        layout
        {...cardSpring}
      >
        <TokenInput
          label="You pay"
          token={tokenIn}
          amount={amountIn}
          balance={isConnected ? balanceIn : undefined}
          onTokenChange={t => { setTokenIn(t); setQuote(null); setAmountIn(''); }}
          onAmountChange={setAmountIn}
          excludeToken={tokenOut}
        />

        {/* ── 2. Swap arrow with persistent rotation state ── */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
          <motion.button
            className="swap-arrow-btn"
            onClick={handleSwapTokens}
            title="Swap tokens"
            whileTap={{ scale: 0.88 }}
            animate={{ rotate: arrowFlipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            style={{ fontSize: 18 }}
          >
            ↕
          </motion.button>
        </div>

        <TokenInput
          label="You receive"
          token={tokenOut}
          amount={amountOut}
          balance={isConnected ? balanceOut : undefined}
          onTokenChange={t => { setTokenOut(t); setQuote(null); setAmountOut(''); }}
          excludeToken={tokenIn}
          readonly
          loading={loadingQuote}
        />

        {/* Fee tier chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {FEE_TIERS.map(tier => (
            <motion.button
              key={tier.fee}
              type="button"
              className={`fee-chip${fee === tier.fee ? ' selected' : ''}`}
              onClick={() => { setFee(tier.fee); setQuote(null); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tier.label}
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <SlippageSettings
            slippage={slippage}
            onChange={setSlippage}
            onClose={() => {}}
          />
        </div>

        {/* ── Quote Details — layout shift handled by `layout` prop ── */}
        <AnimatePresence>
          {quote && !loadingQuote && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{ marginTop: 8, overflow: 'hidden' }}
            >
              <div className="divider" />
              <div className="stat-row">
                <span className="stat-label">Exchange Rate</span>
                <span className="stat-value">
                  1 {tokenIn.symbol} = {formatNumber(quote.executionPrice, 4)} {tokenOut.symbol}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Price Impact</span>
                <span
                  className="stat-value"
                  style={{
                    color: quote.priceImpact > 3
                      ? 'var(--accent-danger)'
                      : quote.priceImpact > 1
                      ? 'var(--accent-warning)'
                      : 'var(--accent-secondary)',
                  }}
                >
                  {formatPercent(-quote.priceImpact)}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Min. Received ({slippage}% slippage)</span>
                <span className="stat-value">
                  {formatNumber(parseFloat(quote.amountOutMinimum), 4)} {tokenOut.symbol}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Est. Gas Fee</span>
                <span className="stat-value">~{quote.gasFee} ETH</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Fee Tier</span>
                <span className="stat-value">{FEE_TIERS.find(f => f.fee === fee)?.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 4. Primary action button ── */}
        <motion.button
          layout
          className="btn-primary"
          style={{ marginTop: 12 }}
          onClick={handleSwap}
          disabled={!!btnDisabled}
          whileHover={!btnDisabled ? { scale: 1.015, y: -1 } : {}}
          whileTap={!btnDisabled ? { scale: 0.985 } : {}}
          animate={
            loadingSwap
              ? { opacity: [0.4, 1, 0.4] }
              : { opacity: 1 }
          }
          transition={
            loadingSwap
              ? { opacity: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' } }
              : { type: 'spring', stiffness: 400, damping: 20 }
          }
        >
          {loadingSwap ? <span className="spinner" /> : btnLabel()}
        </motion.button>

        {/* ── Warning box animated in/out with layout ── */}
        <AnimatePresence>
          {insufficientBalance && isConnected && (
            <motion.div
              layout
              className="warning-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginTop: 8, textAlign: 'center', overflow: 'hidden' }}
            >
              Insufficient {tokenIn.symbol} balance
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
