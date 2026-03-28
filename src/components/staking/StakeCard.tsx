import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppKitAccount } from '@reown/appkit/react';
import { getStakingStats, getUserPosition, postStake, postUnstake } from '../../services/api/stakingService';
import { useTokens } from '../../context/TokensContext';
import TokenSelector from '../common/TokenSelector';
import TokenIcon from '../common/TokenIcon';
import type { Token } from '../../types';

const APR = 12;

export default function StakeCard() {
  const { address } = useAppKitAccount();
  const qc = useQueryClient();
  const { tokens } = useTokens();
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token | undefined>(undefined);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (tokens.length === 0) return;
    setSelectedToken(prev =>
      prev ? (tokens.find(t => t.address.toLowerCase() === prev.address.toLowerCase()) ?? tokens[0]) : tokens[0]
    );
  }, [tokens]);

  const token = selectedToken?.symbol ?? '';

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
        <motion.button
          className="token-badge"
          onClick={() => setShowSelector(true)}
          whileHover={{ scale: 1.04, borderColor: 'var(--accent-primary)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '13px 16px', borderRadius: 'var(--radius-md)', gap: 12 }}
        >
          {selectedToken && <TokenIcon token={selectedToken} size="md" />}
          <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedToken?.symbol ?? 'Select token'}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>▼</span>
        </motion.button>

        {showSelector && selectedToken && (
          <TokenSelector
            selected={selectedToken}
            onSelect={t => { setSelectedToken(t); setAmount(''); }}
            onClose={() => setShowSelector(false)}
          />
        )}
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
