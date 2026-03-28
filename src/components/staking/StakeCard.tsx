import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppKitAccount } from '@reown/appkit/react';
import { getStakingStats, getUserPosition, postStake, postUnstake } from '../../services/api/stakingService';

const TOKENS = [
  { symbol: 'TKA', color: 'var(--color-accent-light)' },
  { symbol: 'TKB', color: 'var(--color-accent-alt)' },
];
const APR = 12;

function TokenDropdown({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = TOKENS.find(t => t.symbol === selected) ?? TOKENS[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-input)',
          border: `1px solid ${open ? 'var(--color-accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '13px 16px',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `${current.color}22`,
            border: `1px solid ${current.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: current.color,
          }}>
            {current.symbol.slice(0, 2)}
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{current.symbol}</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          zIndex: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          {TOKENS.map(t => (
            <button
              key={t.symbol}
              onClick={() => { onChange(t.symbol); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: `${t.color}22`, border: `1px solid ${t.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: t.color,
              }}>
                {t.symbol.slice(0, 2)}
              </div>
              {t.symbol}
              {t.symbol === selected && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 'auto' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StakeCard() {
  const { address } = useAppKitAccount();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('TKA');

  const { data: stats } = useQuery({ queryKey: ['stakingStats'], queryFn: getStakingStats });
  const { data: position } = useQuery({
    queryKey: ['userPosition', address],
    queryFn: () => getUserPosition(address ?? ''),
  });

  const balance = mode === 'stake' ? 1000 : (position?.stakedAmount ?? 0);
  const parsed = parseFloat(amount) || 0;
  const estDaily   = parsed > 0 ? ((parsed * APR) / 365).toFixed(4) : '0.0000';
  const estMonthly = parsed > 0 ? ((parsed * APR) / 12).toFixed(4)  : '0.0000';
  const insufficient = parsed > balance;

  const stakeMut = useMutation({
    mutationFn: () => postStake(address ?? '', parsed, token),
    onSuccess: () => {
      toast.success(`Successfully staked ${amount} ${token}!`);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
      qc.invalidateQueries({ queryKey: ['stakingStats'] });
    },
    onError: () => toast.error('Stake failed. Please try again.'),
  });

  const unstakeMut = useMutation({
    mutationFn: () => postUnstake(address ?? '', parsed),
    onSuccess: () => {
      toast.success(`Successfully unstaked ${amount} ${token}!`);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
    },
    onError: () => toast.error('Unstake failed. Please try again.'),
  });

  const isLoading = stakeMut.isPending || unstakeMut.isPending;
  const canSubmit  = parsed > 0 && !insufficient && !isLoading;

  const handleSubmit = () => {
    if (!address) { toast.error('Please connect your wallet first.'); return; }
    if (mode === 'stake') stakeMut.mutate();
    else unstakeMut.mutate();
  };

  return (
    <div className="stake-card" style={{ height: 'fit-content' }}>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--bg-input)',
        borderRadius: 10, padding: 4, marginBottom: 28,
      }}>
        {(['stake', 'unstake'] as const).map(m => (
          <button
            key={m}
            className={`stake-tab${mode === m ? ' active' : ''}`}
            onClick={() => { setMode(m); setAmount(''); }}
            style={{ textTransform: 'capitalize' }}
          >
            {m === 'stake' ? 'Stake' : 'Unstake'}
          </button>
        ))}
      </div>

      {/* Select Asset */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Select Asset
        </label>
        <TokenDropdown selected={token} onChange={t => { setToken(t); setAmount(''); }} />
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Amount to Stake
        </label>
        <div style={{ position: 'relative' }}>
          <input
            className="stake-input"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="any"
            style={{ paddingRight: 60 }}
          />
          <button
            onClick={() => setAmount(String(balance))}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)',
              border: '1px solid var(--color-accent-border)', borderRadius: 6,
              padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            MAX
          </button>
        </div>

        {/* Balance row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Balance: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{balance.toFixed(2)} {token}</span>
          </span>
          {mode === 'stake' && (
            <span style={{
              background: 'var(--color-success-dim)', color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              New Stake Available
            </span>
          )}
          {insufficient && (
            <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Insufficient balance</span>
          )}
        </div>
      </div>

      {/* Rewards Preview — always visible */}
      {mode === 'stake' && (
        <div style={{
          background: 'var(--color-accent-dim)',
          border: '1px solid var(--color-accent-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Rewards Preview
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Est. Daily:{' '}
              <strong style={{ color: 'var(--color-success)' }}>{estDaily} {token}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Monthly:{' '}
              <strong style={{ color: 'var(--color-success)' }}>{estMonthly} {token}</strong>
            </span>
          </div>
        </div>
      )}

      {/* APR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 20 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Current APR</span>
        <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 15 }}>
          {stats?.apr.toFixed(2) ?? '12.00'}%
        </span>
      </div>

      {/* CTA */}
      <button className="btn-stake" onClick={handleSubmit} disabled={!canSubmit}>
        {isLoading
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner" />{mode === 'stake' ? 'Staking…' : 'Unstaking…'}</span>
          : mode === 'stake' ? 'Stake Tokens' : 'Unstake Tokens'
        }
      </button>
    </div>
  );
}
