import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { parseUnits } from 'viem';
import { useAppKitAccount } from '@reown/appkit/react';
import { CHAIN_ID } from '../../config/contracts';
import { getStakingStats, getUserPosition, postStake, postUnstake } from '../../services/api/stakingService';
import { fetchStakingPoolMeta } from '../../services/api/stakingChainService';
import { getTokenBalance } from '../../services/api/poolService';
import type { StakingPoolMeta } from '../../services/api/stakingChainService';
import { STAKING_BLOCKS_PER_DAY, formatStakingNumber } from '../../utils/stakingFormat';

function rewardPreviewApr(parsed: number, aprPercent: number): { daily: string; monthly: string } {
  if (parsed <= 0 || !Number.isFinite(parsed)) return { daily: '0', monthly: '0' };
  const daily = (parsed * aprPercent) / 100 / 365;
  const monthly = (parsed * aprPercent) / 100 / 12;
  return {
    daily: formatStakingNumber(daily, 10),
    monthly: formatStakingNumber(monthly, 10),
  };
}

function rewardPreviewPerBlock(meta: StakingPoolMeta, parsed: number): { daily: string; monthly: string } | null {
  if (parsed <= 0 || !Number.isFinite(parsed) || meta.rewardPerBlockHuman <= 0) return null;
  const poolDaily = meta.rewardPerBlockHuman * STAKING_BLOCKS_PER_DAY;
  const tvl = meta.totalStakedHuman;
  const share = tvl <= 0 ? 1 : parsed / (tvl + parsed);
  const daily = poolDaily * share;
  return {
    daily: formatStakingNumber(daily, 10),
    monthly: formatStakingNumber(daily * 30, 10),
  };
}

export default function StakeCard() {
  const { address } = useAppKitAccount();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');

  const { data: stats } = useQuery({ queryKey: ['stakingStats'], queryFn: getStakingStats });
  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['stakingPoolMeta'],
    queryFn: fetchStakingPoolMeta,
    staleTime: 30_000,
  });
  const { data: position } = useQuery({
    queryKey: ['userPosition', address],
    queryFn: () => getUserPosition(address ?? ''),
  });

  const { data: walletBalanceStr } = useQuery({
    queryKey: ['stakingTokenBalance', address, meta?.stakingToken],
    queryFn: () => getTokenBalance(meta!.stakingToken, address!),
    enabled: !!address && !!meta?.stakingToken,
  });

  const symbol = meta?.stakeSymbol ?? stats?.stakingTokenSymbol ?? '—';
  const rewardSym = meta?.rewardSymbol ?? stats?.rewardTokenSymbol ?? symbol;

  const { amountValid, insufficient } = useMemo(() => {
    if (!meta?.stakeDecimals) {
      return { amountValid: false, insufficient: false };
    }
    const trimmed = amount.trim();
    if (!trimmed) return { amountValid: false, insufficient: false };
    try {
      const a = parseUnits(trimmed, meta.stakeDecimals);
      if (a <= 0n) return { amountValid: false, insufficient: false };
      const capStr =
        mode === 'stake'
          ? (walletBalanceStr ?? '0').trim()
          : (position?.stakedAmountDisplay ?? '0').trim();
      const cap = parseUnits(capStr || '0', meta.stakeDecimals);
      return { amountValid: true, insufficient: a > cap };
    } catch {
      return { amountValid: false, insufficient: true };
    }
  }, [amount, meta?.stakeDecimals, mode, walletBalanceStr, position?.stakedAmountDisplay]);

  const parsedPreview = Number.parseFloat(amount.replace(/,/g, '')) || 0;
  const apr = stats?.apr ?? meta?.aprPercent ?? 0;
  const isAprMode = meta?.isAprMode ?? stats?.isAprMode ?? true;

  const preview = useMemo(() => {
    if (!meta) return rewardPreviewApr(parsedPreview, apr);
    if (meta.isAprMode) return rewardPreviewApr(parsedPreview, apr);
    const pb = rewardPreviewPerBlock(meta, parsedPreview);
    return pb ?? { daily: '—', monthly: '—' };
  }, [meta, parsedPreview, apr]);

  const stakeMut = useMutation({
    mutationFn: () => postStake(address ?? '', amount.trim(), ''),
    onSuccess: () => {
      toast.success(`Staked ${amount.trim()} ${symbol}`);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
      qc.invalidateQueries({ queryKey: ['stakingStats'] });
      qc.invalidateQueries({ queryKey: ['stakingPoolMeta'] });
      qc.invalidateQueries({ queryKey: ['stakingTokenBalance'] });
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Stake failed.'),
  });

  const unstakeMut = useMutation({
    mutationFn: () => postUnstake(address ?? '', amount.trim()),
    onSuccess: () => {
      toast.success(`Unstaked ${amount.trim()} ${symbol}`);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
      qc.invalidateQueries({ queryKey: ['stakingStats'] });
      qc.invalidateQueries({ queryKey: ['stakingPoolMeta'] });
      qc.invalidateQueries({ queryKey: ['stakingTokenBalance'] });
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Unstake failed.'),
  });

  const isLoading = stakeMut.isPending || unstakeMut.isPending;
  const canSubmit = !!address && amountValid && !insufficient && !isLoading;

  const handleMax = () => {
    if (mode === 'stake') {
      setAmount((walletBalanceStr ?? '0').trim() || '0');
    } else {
      setAmount((position?.stakedAmountDisplay ?? '0').trim() || '0');
    }
  };

  const handleSubmit = () => {
    if (!address) {
      toast.error('Connect your wallet first.');
      return;
    }
    if (mode === 'stake') stakeMut.mutate();
    else unstakeMut.mutate();
  };

  return (
    <div className="stake-card" style={{ height: 'fit-content' }}>

      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--bg-input)',
        borderRadius: 10, padding: 4, marginBottom: 28,
      }}>
        {(['stake', 'unstake'] as const).map(m => (
          <button
            key={m}
            type="button"
            className={`stake-tab${mode === m ? ' active' : ''}`}
            onClick={() => { setMode(m); setAmount(''); }}
            style={{ textTransform: 'capitalize' }}
          >
            {m === 'stake' ? 'Stake' : 'Unstake'}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Staking token
        </label>
        <div style={{
          padding: '13px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--text-primary)',
        }}>
          {metaLoading ? '…' : symbol}
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Rewards: {metaLoading ? '…' : rewardSym}
          </span>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>
            {meta?.stakingToken ? `${meta.stakingToken.slice(0, 10)}…` : ''} · chain {CHAIN_ID}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          {mode === 'stake' ? 'Amount to stake' : 'Amount to unstake'}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            className="stake-input"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ paddingRight: 60 }}
          />
          <button
            type="button"
            onClick={handleMax}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {mode === 'stake' ? 'Wallet' : 'Staked'}:{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {mode === 'stake'
                ? (walletBalanceStr ?? '—')
                : (position?.stakedAmountDisplay ?? '—')}{' '}
              {symbol}
            </span>
          </span>
          {mode === 'stake' && (
            <span style={{
              background: 'var(--color-success-dim)', color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              ERC-20
            </span>
          )}
          {insufficient && amount.trim() !== '' && (
            <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Exceeds balance</span>
          )}
        </div>
      </div>

      {mode === 'stake' && (
        <div style={{
          background: 'var(--color-accent-dim)',
          border: '1px solid var(--color-accent-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
            {isAprMode ? 'Rewards preview (APR)' : 'Rewards preview (per-block pool share)'}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Est. daily:{' '}
              <strong style={{ color: 'var(--color-success)' }}>{preview.daily} {rewardSym}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              ~30d:{' '}
              <strong style={{ color: 'var(--color-success)' }}>{preview.monthly} {rewardSym}</strong>
            </span>
          </div>
          {!isAprMode && meta && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Pool emits ~{formatStakingNumber(meta.rewardPerBlockHuman * STAKING_BLOCKS_PER_DAY, 8)} {rewardSym}/day total (share scales with TVL).
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 20 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{isAprMode ? 'Pool APR' : 'APR (inactive in per-block mode)'}</span>
        <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 15 }}>
          {apr.toFixed(2)}%
        </span>
      </div>

      <button type="button" className="btn-stake" onClick={handleSubmit} disabled={!canSubmit}>
        {isLoading
          ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="spinner" />
              {mode === 'stake' ? 'Staking…' : 'Unstaking…'}
            </span>
            )
          : mode === 'stake' ? 'Stake tokens' : 'Unstake tokens'}
      </button>
    </div>
  );
}
