import { useState, useEffect } from 'react';
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

  // Load pool info when pair/fee changes
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

  // Sync amount1 based on amount0 and current price ratio
  const handleAmount0Change = (val: string) => {
    setAmount0(val);
    if (pool && val && parseFloat(val) > 0) {
      setAmount1((parseFloat(val) * pool.price).toFixed(6));
    }
  };

  const handleAmount1Change = (val: string) => {
    setAmount1(val);
    if (pool && val && parseFloat(val) > 0) {
      setAmount0((parseFloat(val) / pool.price).toFixed(6));
    }
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
    if (loadingTx) return <span className="spinner" />;
    return 'Add Liquidity';
  };

  const tickSpacing = FEE_TIERS.find(f => f.fee === fee)?.tickSpacing ?? 60;
  const validTickLower = Math.round(tickLower / tickSpacing) * tickSpacing;
  const validTickUpper = Math.round(tickUpper / tickSpacing) * tickSpacing;

  return (
    <div className="page-narrow">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Add Liquidity</h1>
      </div>

      <div className="card glow" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Token Pair */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
            Select Pair
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <TokenInput
              label="Token A"
              token={token0}
              amount=""
              onTokenChange={t => { setToken0(t); setAmount0(''); setAmount1(''); }}
              excludeToken={token1}
              readonly
            />
            <TokenInput
              label="Token B"
              token={token1}
              amount=""
              onTokenChange={t => { setToken1(t); setAmount0(''); setAmount1(''); }}
              excludeToken={token0}
              readonly
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
              <button
                key={tier.fee}
                onClick={() => setFee(tier.fee)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, fontWeight: 600,
                  fontSize: 13, cursor: 'pointer', border: '1px solid', textAlign: 'center',
                  background: fee === tier.fee ? 'rgba(88,166,255,0.15)' : 'var(--bg-secondary)',
                  borderColor: fee === tier.fee ? 'var(--accent-primary)' : 'var(--border)',
                  color: fee === tier.fee ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <div>{tier.label}</div>
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>{tier.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Pool Stats */}
        {pool && stats && (
          <div className="info-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Current Price</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                1 {token0.symbol} = {formatNumber(stats.price, 4)} {token1.symbol}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>TVL</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatCompactUSD(stats.tvl)}</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>24h Volume</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatCompactUSD(stats.volume24h)}</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>24h Fees</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatCompactUSD(stats.fees24h)}</div>
              </div>
            </div>
          </div>
        )}

        {!pool && !loadingPool && (
          <div className="warning-box">
            ⚠ No pool found for this pair and fee. You may be the first LP.
          </div>
        )}

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
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={handleSetFullRange}>
                Full Range
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="range-input">
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Min Price</div>
              <input
                type="number"
                value={priceLower}
                onChange={e => setPriceLower(e.target.value)}
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
            <div className="range-input">
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Max Price</div>
              <input
                type="number"
                value={priceUpper}
                onChange={e => setPriceUpper(e.target.value)}
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
          </div>

          {/* Tick display */}
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

          {!inRange && pool && (
            <div className="warning-box" style={{ marginTop: 10 }}>
              ⚠ Your position will not earn fees at the current price of {formatNumber(currentPrice, 4)}.
            </div>
          )}
        </div>

        {/* Deposit Amounts */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
            Deposit Amounts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TokenInput
              label={token0.symbol}
              token={token0}
              amount={amount0}
              balance={isConnected ? balance0 : undefined}
              onTokenChange={() => {}}
              onAmountChange={handleAmount0Change}
            />
            <TokenInput
              label={token1.symbol}
              token={token1}
              amount={amount1}
              balance={isConnected ? balance1 : undefined}
              onTokenChange={() => {}}
              onAmountChange={handleAmount1Change}
            />
          </div>
        </div>

        {/* Summary */}
        {amount0 && amount1 && pool && (
          <div>
            <div className="divider" />
            <div className="stat-row">
              <span className="stat-label">Pooled {token0.symbol}</span>
              <span className="stat-value">{formatNumber(parseFloat(amount0), 4)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Pooled {token1.symbol}</span>
              <span className="stat-value">{formatNumber(parseFloat(amount1), 4)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Price Range</span>
              <span className="stat-value">{priceLower} – {priceUpper}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Fee Tier</span>
              <span className="stat-value">{FEE_TIERS.find(f => f.fee === fee)?.label}</span>
            </div>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleAddLiquidity}
          disabled={!!isButtonDisabled}
        >
          {getButtonLabel()}
        </button>
      </div>
    </div>
  );
}
