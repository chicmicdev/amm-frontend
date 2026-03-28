import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';
import toast from 'react-hot-toast';
import { getStakingStats, getUserPosition, postClaim } from '../../services/api/stakingService';

function formatTVL(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: 'var(--color-accent-dim)',
      border: '1px solid var(--color-accent-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 70, height: 10, borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: 110, height: 32, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 140, height: 10, borderRadius: 4 }} />
    </div>
  );
}

export default function StatsBar() {
  const { address } = useAppKitAccount();
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stakingStats'],
    queryFn: getStakingStats,
  });

  const { data: position, isLoading: posLoading } = useQuery({
    queryKey: ['userPosition', address],
    queryFn: () => getUserPosition(address ?? ''),
  });

  const claimMut = useMutation({
    mutationFn: () => postClaim(address ?? ''),
    onSuccess: (data) => {
      toast.success(`Claimed ${data.amount.toFixed(4)} ${position?.tokenSymbol ?? ''} rewards!`);
      qc.invalidateQueries({ queryKey: ['userPosition'] });
    },
    onError: () => toast.error('Claim failed. Try again.'),
  });

  const loading = statsLoading || posLoading;

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Current APR */}
      <div className="stat-glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <StatIcon>⚡</StatIcon>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Current APR
          </span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {stats?.apr.toFixed(2)}%
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Dynamic rewards based on TVL
        </p>
      </div>

      {/* Total Locked */}
      <div className="stat-glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <StatIcon>🔒</StatIcon>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Total Locked
          </span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {formatTVL(stats?.tvl ?? 0)}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Liquidity at quality pace
        </p>
      </div>

      {/* Your Staked */}
      <div className="stat-glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <StatIcon>💎</StatIcon>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Your Staked
          </span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {position?.stakedAmount.toFixed(2)}{' '}
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>{position?.tokenSymbol}</span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Stake more to increase share
        </p>
      </div>

      {/* Earned */}
      <div className="stat-glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <StatIcon>🎁</StatIcon>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Earned
          </span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {position?.pendingRewards.toFixed(2)}{' '}
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>{position?.tokenSymbol}</span>
        </div>
        <button
          onClick={() => {
            if (!address) { toast.error('Connect wallet first'); return; }
            claimMut.mutate();
          }}
          disabled={claimMut.isPending}
          style={{
            background: 'var(--color-success)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 18px',
            fontSize: 12,
            fontWeight: 700,
            cursor: claimMut.isPending ? 'not-allowed' : 'pointer',
            opacity: claimMut.isPending ? 0.7 : 1,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {claimMut.isPending ? '...' : 'Claim'}
        </button>
      </div>

    </div>
  );
}
