import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUnits } from 'viem';
import toast from 'react-hot-toast';
import {
  fetchATokenBalance, fetchUserAccountData,
  baseSepoliaClient, type ReserveInfo,
} from '../../services/lending/lendingService';
import { ERC20_ABI } from '../../contracts/lendingAbis';
import { useLendingActions } from '../../hooks/useLendingActions';
import { TokenIcon } from './TokenIcon';
import { Btn } from './Btn';
import { fmt, hfColor } from './lendingUtils';
import type { ActionMode } from './lendingTypes';
import { MODE_CFG } from './lendingTypes';

interface ActionModalProps {
  reserve: ReserveInfo;
  mode: ActionMode;
  userAddress: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ActionModal({ reserve, mode, userAddress, onClose, onSuccess }: ActionModalProps) {
  const [amount, setAmount]     = useState('');
  const [walletBal, setWalletBal] = useState('—');
  const [aBal, setABal]         = useState('—');
  const [hf, setHf]             = useState('—');
  const [riskAck, setRiskAck]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { supply, borrow, repay, withdraw, status, error, reset } = useLendingActions();
  const isPending = status === 'approving' || status === 'pending';
  const cfg = MODE_CFG[mode];

  useEffect(() => {
    if (!userAddress) return;
    const addr = userAddress as `0x${string}`;
    baseSepoliaClient
      .readContract({ address: reserve.asset, abi: ERC20_ABI, functionName: 'balanceOf', args: [addr] })
      .then(b => setWalletBal(parseFloat(formatUnits(b as bigint, reserve.decimals)).toFixed(4)))
      .catch(() => setWalletBal('—'));
    fetchATokenBalance(reserve.aTokenAddress, addr, reserve.decimals)
      .then(b => setABal(parseFloat(b).toFixed(4)))
      .catch(() => setABal('—'));
    fetchUserAccountData(addr)
      .then(d => setHf(d.healthFactor))
      .catch(() => setHf('—'));
  }, [reserve, userAddress]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const maxVal    = mode === 'repay' || mode === 'withdraw' ? aBal : walletBal;
  const amtNum    = parseFloat(amount || '0');
  const showRisk  = mode === 'borrow' && amtNum > 0;
  const canSubmit = !isPending && amtNum > 0 && !(showRisk && !riskAck);

  const handleSubmit = async () => {
    if (!amount || amtNum <= 0) return;
    const asset = reserve.asset as `0x${string}`;
    if (mode === 'supply')   await supply(asset, amount, reserve.decimals);
    if (mode === 'borrow')   await borrow(asset, amount, reserve.decimals);
    if (mode === 'repay')    await repay(asset, amount, reserve.decimals);
    if (mode === 'withdraw') await withdraw(asset, amount, reserve.decimals);
  };

  const addToWallet = async () => {
    try {
      const eth = (window as unknown as {
        ethereum?: { request?: (a: { method: string; params: unknown[] }) => Promise<unknown> };
      }).ethereum;
      if (!eth?.request) return;
      await eth.request({
        method: 'wallet_watchAsset',
        params: [{ type: 'ERC20', options: { address: reserve.asset, symbol: reserve.symbol, decimals: reserve.decimals } }],
      });
      toast.success(`${reserve.symbol} added to wallet`);
    } catch {
      toast.error('Could not add token');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 28, width: '100%', maxWidth: 440,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {cfg.label} <span style={{ color: cfg.color }}>{reserve.symbol}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Success screen ──────────────────────────────────────── */}
        {status === 'success' ? (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#46BC8C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 14px',
              }}>
                ✓
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                All done
              </div>
              <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
                You {mode === 'borrow' ? 'Borrowed' : mode === 'withdraw' ? 'Withdrew' : mode === 'repay' ? 'Repaid' : 'Supplied'}{' '}
                {fmt(amount, 4)} {reserve.symbol}
              </div>
            </div>

            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16, marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <TokenIcon symbol={reserve.symbol} size={36} />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Add {reserve.symbol} to wallet to track your balance.
                </div>
              </div>
              <button
                onClick={addToWallet}
                style={{
                  width: '100%', padding: '9px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}
              >
                Add to wallet
              </button>
            </div>

            <button
              onClick={() => { onSuccess(); onClose(); }}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                background: cfg.gradient, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}
            >
              Ok, Close
            </button>
          </>
        ) : (
          <>
            {/* ── Amount input ──────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Amount</span>
              <button
                onClick={() => setAmount(maxVal === '—' ? '' : maxVal)}
                style={{
                  background: 'rgba(99,102,241,0.12)', color: 'var(--color-accent-light)',
                  border: 'none', borderRadius: 6, padding: '3px 10px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {mode === 'repay' || mode === 'withdraw' ? 'Supplied' : 'Wallet'}:{' '}
                {maxVal === '—' ? '—' : fmt(parseFloat(maxVal), 4)} MAX
              </button>
            </div>

            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '4px 4px 4px 16px',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
            }}>
              <input
                ref={inputRef}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00" type="number" min="0"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, padding: '10px 0',
                }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-card)', borderRadius: 8, padding: '8px 12px',
              }}>
                <TokenIcon symbol={reserve.symbol} size={24} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                  {reserve.symbol}
                </span>
              </div>
            </div>

            {/* ── Transaction overview ──────────────────────────── */}
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 14,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Transaction overview
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {mode === 'borrow' ? 'Borrow APY, variable' : 'Supply APY'}
                </span>
                <span style={{ color: mode === 'borrow' ? '#F89F1A' : '#46BC8C', fontWeight: 700 }}>
                  {mode === 'borrow' ? reserve.borrowAPY : reserve.supplyAPY}%
                </span>
              </div>

              {(mode === 'supply' || mode === 'withdraw') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Collateralization</span>
                  <span style={{ color: '#46BC8C', fontWeight: 700 }}>Enabled</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Health factor</span>
                <span style={{ color: hfColor(hf), fontWeight: 700 }}>{hf}</span>
              </div>
            </div>

            <div style={{
              fontSize: 12, color: 'var(--text-muted)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              ⛽ &lt; $0.01
            </div>

            {/* ── Borrow risk ───────────────────────────────────── */}
            {showRisk && (
              <>
                <div style={{
                  background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 10,
                  color: '#F44336', fontSize: 13, display: 'flex', gap: 8,
                }}>
                  <span>⚠</span>
                  <span>Borrowing this amount will reduce your health factor and increase risk of liquidation.</span>
                </div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                  fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer',
                }}>
                  <input type="checkbox" checked={riskAck} onChange={e => setRiskAck(e.target.checked)} />
                  I acknowledge the risks involved.
                </label>
              </>
            )}

            {/* ── Status banners ────────────────────────────────── */}
            <AnimatePresence>
              {status === 'approving' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(248,159,26,0.1)', border: '1px solid rgba(248,159,26,0.3)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                    fontSize: 13, color: '#F89F1A',
                  }}
                >
                  ⏳ Approving token spend…
                </motion.div>
              )}
              {status === 'pending' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                    fontSize: 13, color: 'var(--color-accent-light)',
                  }}
                >
                  ⏳ Confirming transaction…
                </motion.div>
              )}
              {error && status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                    fontSize: 12, color: '#F44336', wordBreak: 'break-word',
                  }}
                >
                  ⚠ {error.slice(0, 200)}
                  <button
                    onClick={reset}
                    style={{
                      display: 'block', marginTop: 4, background: 'none', border: 'none',
                      color: '#F44336', cursor: 'pointer', fontSize: 12, padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Action buttons ────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 10,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <motion.button
                whileHover={canSubmit ? { opacity: 0.9 } : {}}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 2, padding: '13px 0', borderRadius: 10, border: 'none',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: canSubmit ? cfg.gradient : 'var(--bg-secondary)',
                  color: canSubmit ? 'white' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 15,
                }}
              >
                {isPending ? '⏳ Processing…' : `${cfg.label} ${reserve.symbol}`}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
