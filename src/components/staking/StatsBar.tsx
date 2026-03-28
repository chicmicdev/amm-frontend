import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';
import toast from 'react-hot-toast';
import { getStakingStats, getUserPosition, postClaim } from '../../services/api/stakingService';

function formatTVL(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function SkeletonCard() {
  return (
    <div className="stat-glass-card">
      <div className="skeleton" style={{ width: 60, height: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 100, height: 28 }} />
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

  const statCards = [
    {
      label: 'Current APR',
      value: loading ? null : `${stats?.apr.toFixed(2)}%`,
      valueColor: 'var(--stake-green)',
      icon: '⚡',
    },
    {
      label: 'Total Value Locked',
      value: loading ? null : formatTVL(stats?.tvl ?? 0),
      valueColor: 'var(--text-primary)',
      icon: '🔒',
    },
    {
      label: 'Your Staked',
      value: loading ? null : `${position?.stakedAmount.toFixed(2)} ${position?.tokenSymbol}`,
      valueColor: 'var(--text-primary)',
      icon: '💎',
    },
    {
      label: 'Rewards Earned',
      value: loading ? null : `${position?.pendingRewards.toFixed(4)} ${position?.tokenSymbol}`,
      valueColor: 'var(--stake-green)',
      icon: '🎁',
      action: (
        <button
          className="btn-claim"
          onClick={() => {
            if (!address) { toast.error('Connect wallet first'); return; }
            claimMut.mutate();
          }}
          disabled={claimMut.isPending}
          style={{ marginTop: 10 }}
        >
          {claimMut.isPending ? '...' : 'Claim'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {statCards.map((card) =>
        loading ? (
          <SkeletonCard key={card.label} />
        ) : (
          <div className="stat-glass-card" key={card.label}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              {card.icon} {card.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.valueColor }}>
              {card.value}
            </div>
            {card.action}
          </div>
        )
      )}
    </div>
  );
}
