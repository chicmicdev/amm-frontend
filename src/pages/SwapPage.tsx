import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import TokenInput from '../components/common/TokenInput';
import SlippageSettings from '../components/swap/SlippageSettings';
import type { Token, SwapQuote } from '../types';
import { DEFAULT_TOKEN_IN, DEFAULT_TOKEN_OUT } from '../config/tokens';
import { FEE_TIERS, CONTRACT_ERRORS } from '../config/contracts';
import { getSwapQuote, getTokenBalance, executeSwap } from '../services/api/poolService';
import { useToast } from '../context/ToastContext';
import { formatNumber, formatPercent, shortenTxHash } from '../utils/formatUtils';

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
  const [showSettings, setShowSettings] = useState(false);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');

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
      if (q) {
        setQuote(q);
        setAmountOut(q.amountOut);
      } else {
        setQuote(null); setAmountOut('');
      }
    } finally {
      setLoadingQuote(false);
    }
  }, [tokenIn, tokenOut, fee, slippage]);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuote(amountIn), 400);
    return () => clearTimeout(timer);
  }, [amountIn, fetchQuote]);

  const handleSwapTokens = () => {
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
      showToast('success', `Swapped successfully! Tx: ${shortenTxHash(result.hash)}`);
      setAmountIn('');
      setAmountOut('');
      setQuote(null);
    } catch (err) {
      showToast('error', resolveError(err));
    } finally {
      setLoadingSwap(false);
    }
  };

  const insufficientBalance = parseFloat(amountIn || '0') > parseFloat(balanceIn || '0');

  const getButtonLabel = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!amountIn || parseFloat(amountIn) === 0) return 'Enter an amount';
    if (insufficientBalance) return `Insufficient ${tokenIn.symbol} balance`;
    if (loadingSwap) return <span className="spinner" />;
    return `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`;
  };

  const isButtonDisabled = isConnected && (
    !amountIn || parseFloat(amountIn) === 0 || insufficientBalance || loadingSwap || loadingQuote
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Swap</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            UniLite Pro
          </p>
        </div>
        {/* <button
          type="button"
          className="btn-ghost"
          onClick={() => setShowSettings(true)}
          title="Transaction settings"
          aria-label="Transaction settings"
          style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button> */}
      </div>

      <div className="card glow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <TokenInput
          label="You pay"
          token={tokenIn}
          amount={amountIn}
          balance={isConnected ? balanceIn : undefined}
          onTokenChange={t => { setTokenIn(t); setQuote(null); setAmountIn(''); }}
          onAmountChange={setAmountIn}
          excludeToken={tokenOut}
        />

        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
          <button className="swap-arrow-btn" onClick={handleSwapTokens} title="Swap tokens">
            ↕
          </button>
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
          {/* Fee Tier */}
        <div className='d-flex mt-2'>
        {/* {FEE_TIERS.map(tier => (
          <button
            key={tier.fee}
            className={`fee-chip${fee === tier.fee ? ' selected' : ''}`}
            onClick={() => { setFee(tier.fee); setQuote(null); }}
          >
            {tier.label}
          </button>
        ))} */}

        <SlippageSettings
          slippage={slippage}
          onChange={setSlippage}
          onClose={() => setShowSettings(false)}
        />
      </div>

        {/* Quote Details */}
        {quote && !loadingQuote && (
          <div style={{ marginTop: 8 }}>
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
              <span className="stat-value">{formatNumber(parseFloat(quote.amountOutMinimum), 4)} {tokenOut.symbol}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Est. Gas Fee</span>
              <span className="stat-value">~{quote.gasFee} ETH</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Fee Tier</span>
              <span className="stat-value">{FEE_TIERS.find(f => f.fee === fee)?.label}</span>
            </div>
          </div>
        )}

        <button
          className="btn-primary"
          style={{ marginTop: 12 }}
          onClick={handleSwap}
          disabled={!!isButtonDisabled}
        >
          {getButtonLabel()}
        </button>

        {insufficientBalance && isConnected && (
          <div className="warning-box" style={{ marginTop: 8, textAlign: 'center' }}>
            Insufficient {tokenIn.symbol} balance
          </div>
        )}
      </div>
    </div>
  );
}
