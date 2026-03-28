import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TiltCard from '../components/common/TiltCard';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import TokenInput from '../components/common/TokenInput';
import SlippageSettings from '../components/swap/SlippageSettings';
import type { Token, SwapQuote } from '../types';
import { useTokens } from '../context/TokensContext';
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
  const { tokens } = useTokens();

  const [tokenIn, setTokenIn] = useState<Token>(() => tokens[0]);
  const [tokenOut, setTokenOut] = useState<Token>(() => tokens[1]);

  useEffect(() => {
    setTokenIn(prev => tokens.find(t => t.address === prev.address) ?? tokens[0] ?? prev);
    setTokenOut(prev => tokens.find(t => t.address === prev.address) ?? tokens[1] ?? prev);
  }, [tokens]);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [fee, setFee] = useState(3000);
  const [slippage, setSlippage] = useState(2);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteHint, setQuoteHint] = useState<'no_pool' | 'error' | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingSwap, setLoadingSwap] = useState(false);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  /** Incremented after balances refetch post-swap — drives spring + glow on balance text. */
  const [balancePulseId, setBalancePulseId] = useState(0);
  // ── 2. track rotation state for the swap arrow ──
  const [arrowFlipped, setArrowFlipped] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    const [inB, outB] = await Promise.all([
      getTokenBalance(tokenIn.address, address),
      getTokenBalance(tokenOut.address, address),
    ]);
    setBalanceIn(inB);
    setBalanceOut(outB);
    setBalancePulseId(n => n + 1);
  }, [address, tokenIn.address, tokenOut.address]);

  useEffect(() => {
    if (isConnected && address) {
      getTokenBalance(tokenIn.address, address).then(setBalanceIn);
      getTokenBalance(tokenOut.address, address).then(setBalanceOut);
    }
  }, [isConnected, address, tokenIn, tokenOut]);

  const fetchQuote = useCallback(async (amount: string) => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      setQuote(null);
      setAmountOut('');
      setQuoteHint(null);
      return;
    }
    setLoadingQuote(true);
    setQuoteHint(null);
    try {
      const q = await getSwapQuote({ tokenIn, tokenOut, fee, amountIn: amount, slippage });
      if (q) {
        setQuote(q);
        setAmountOut(q.amountOut);
        setQuoteHint(null);
      } else {
        setQuote(null);
        setAmountOut('');
        setQuoteHint('no_pool');
      }
    } catch {
      setQuote(null);
      setAmountOut('');
      setQuoteHint('error');
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
    setQuoteHint(null);
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
      setAmountIn('');
      setAmountOut('');
      setQuote(null);
      setQuoteHint(null);
      await refreshBalances();
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
      <TiltCard maxTilt={7}>
      <motion.div
        className="card glow"
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        layout
        {...cardSpring}
      >
        <TokenInput
          label="You pay"
          token={tokenIn}
          amount={amountIn}
          balance={isConnected ? balanceIn : undefined}
          balancePulseId={balancePulseId}
          onTokenChange={t => {
            setTokenIn(t);
            setQuote(null);
            setQuoteHint(null);
            setAmountIn('');
          }}
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
          balancePulseId={balancePulseId}
          onTokenChange={t => {
            setTokenOut(t);
            setQuote(null);
            setQuoteHint(null);
            setAmountOut('');
          }}
          excludeToken={tokenIn}
          readonly
          loading={loadingQuote}
          placeholder={loadingQuote ? '…' : quoteHint === 'no_pool' ? 'No pool' : '—'}
        />

        {/* Fee tier — same pattern as Pool page for a clear, comparable UX */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
            Fee Tier
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {FEE_TIERS.map(tier => (
              <motion.button
                key={tier.fee}
                type="button"
                onClick={() => {
                  setFee(tier.fee);
                  setQuote(null);
                  setQuoteHint(null);
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  border: '1px solid',
                  textAlign: 'center',
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
                  1 {tokenIn.symbol} ={' '}
                  {Number.isFinite(quote.executionPrice)
                    ? formatNumber(quote.executionPrice, 4)
                    : '—'}{' '}
                  {tokenOut.symbol}
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
                  {quote.amountOutMinimum} {tokenOut.symbol}
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
          {quoteHint === 'no_pool' && amountIn && !loadingQuote && (
            <motion.div
              layout
              className="warning-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginTop: 8, textAlign: 'center', overflow: 'hidden' }}
            >
              No pool for {tokenIn.symbol}/{tokenOut.symbol} at this fee on the current factory. Add liquidity on
              the Pool page (or pick another fee tier).
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {quoteHint === 'error' && amountIn && !loadingQuote && (
            <motion.div
              layout
              className="warning-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginTop: 8, textAlign: 'center', overflow: 'hidden' }}
            >
              Could not estimate this amount (invalid number or RPC issue). Try a smaller value or refresh.
            </motion.div>
          )}
        </AnimatePresence>

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
      </TiltCard>
    </div>
  );
}
