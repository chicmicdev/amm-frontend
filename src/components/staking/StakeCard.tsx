import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppKitAccount } from '@reown/appkit/react';
import { getStakingStats, getUserPosition, postStake, postUnstake } from '../../services/api/stakingService';

const TOKENS = ['TKA', 'TKB'];
const APR = 12;

export default function StakeCard() {
  const { address } = useAppKitAccount();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('TKA');

  const { data: stats } = useQuery({
    queryKey: ['stakingStats'],
    queryFn: getStakingStats,
  });

  const { data: position } = useQuery({
    queryKey: ['userPosition', address],
    queryFn: () => getUserPosition(address ?? ''),
  });

  const balance = mode === 'stake' ? 1000 : (position?.stakedAmount ?? 0);

  const estDaily = amount
    ? ((parseFloat(amount) * APR) / 365).toFixed(4)
    : '0.0000';
  const estMonthly = amount
    ? ((parseFloat(amount) * APR) / 12).toFixed(4)
    : '0.0000';

  const stakeMut = useMutation({
    mutationFn: () => postStake(address ?? '', parseFloat(amount), token),
    onSuccess: () => {
      toast.success(`Successfully staked ${amount} ${token}!`);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
      qc.invalidateQueries({ queryKey: ['stakingStats'] });
    },
    onError: () => toast.error('Stake failed. Please try again.'),
  });

  const unstakeMut = useMutation({
    mutationFn: () => postUnstake(address ?? '', parseFloat(amount)),
    onSuccess: () => {
      toast.success(`Successfully unstaked ${amount} ${token}!`);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
    },
    onError: () => toast.error('Unstake failed. Please try again.'),
  });

  const isLoading = stakeMut.isPending || unstakeMut.isPending;
  const canSubmit = parseFloat(amount) > 0 && parseFloat(amount) <= balance && !isLoading;

  const handleSubmit = () => {
    if (!address) { toast.error('Please connect your wallet first.'); return; }
    if (mode === 'stake') stakeMut.mutate();
    else unstakeMut.mutate();
  };

  return (
    <div className="stake-card" style={{ height: 'fit-content' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6,
        background: 'rgba(13,17,23,0.5)',
        borderRadius: 12, padding: 4, marginBottom: 24,
      }}>
        <button className={`stake-tab${mode === 'stake' ? ' active' : ''}`} onClick={() => setMode('stake')}>
          Stake
        </button>
        <button className={`stake-tab${mode === 'unstake' ? ' active' : ''}`} onClick={() => setMode('unstake')}>
          Unstake
        </button>
      </div>

      {/* Token selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Select Token
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {TOKENS.map((t) => (
            <button
              key={t}
              onClick={() => setToken(t)}
              style={{
                padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: '1px solid',
                borderColor: token === t ? 'var(--stake-indigo)' : 'var(--stake-border)',
                background: token === t ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: token === t ? '#818cf8' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Amount
        </label>
        <div style={{ position: 'relative' }}>
          <input
            className="stake-input"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
            style={{ paddingRight: 64 }}
          />
          <button
            onClick={() => setAmount(String(balance))}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(99,102,241,0.15)', color: '#818cf8',
              border: 'none', borderRadius: 6, padding: '3px 8px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            MAX
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>Balance: {balance.toFixed(2)} {token}</span>
          {parseFloat(amount) > balance && <span style={{ color: 'var(--accent-danger)' }}>Insufficient balance</span>}
        </div>
      </div>

      {/* Rewards preview */}
      {mode === 'stake' && parseFloat(amount) > 0 && (
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <span style={{ marginRight: 16 }}>
            Est. Daily: <strong style={{ color: 'var(--stake-green)' }}>{estDaily} {token}</strong>
          </span>
          <span>
            Monthly: <strong style={{ color: 'var(--stake-green)' }}>{estMonthly} {token}</strong>
          </span>
        </div>
      )}

      {/* APR info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        <span>Current APR</span>
        <span style={{ color: 'var(--stake-green)', fontWeight: 700 }}>{stats?.apr.toFixed(2) ?? '12.00'}%</span>
      </div>

      {/* CTA */}
      <button className="btn-stake" onClick={handleSubmit} disabled={!canSubmit}>
        {isLoading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="spinner" />
            {mode === 'stake' ? 'Staking...' : 'Unstaking...'}
          </span>
        ) : (
          mode === 'stake' ? '⚡ Stake Tokens' : '↩ Unstake Tokens'
        )}
      </button>
    </div>
  );
}
