import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAppKitAccount } from '@reown/appkit/react';
import { getUserPosition, getStakingStats, postClaim, postUnstake } from '../services/api/stakingService';
import RewardsChart from '../components/staking/RewardsChart';

export default function DashboardPage() {
  const { address } = useAppKitAccount();
  const qc = useQueryClient();

  const { data: position, isLoading: posLoading } = useQuery({
    queryKey: ['userPosition', address],
    queryFn: () => getUserPosition(address ?? ''),
  });

  const { data: stats } = useQuery({
    queryKey: ['stakingStats'],
    queryFn: getStakingStats,
  });

  const claimMut = useMutation({
    mutationFn: () => postClaim(address ?? ''),
    onSuccess: (d) => {
      toast.success(`Claimed ${d.amount.toFixed(4)} ${position?.tokenSymbol ?? ''}`);
      qc.invalidateQueries({ queryKey: ['userPosition'] });
    },
    onError: () => toast.error('Claim failed.'),
  });

  const unstakeMut = useMutation({
    mutationFn: () => postUnstake(address ?? '', position?.stakedAmount ?? 0),
    onSuccess: () => {
      toast.success('Unstaked successfully!');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
    },
    onError: () => toast.error('Unstake failed.'),
  });

  const positions = position
    ? [
        { token: 'TKA', apr: 12.0, staked: position.stakedAmount, since: position.stakedSince, rewards: position.pendingRewards },
        { token: 'TKB', apr: 8.5,  staked: 1200,                 since: '2026-03-20',          rewards: 4.23 },
      ]
    : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--stake-bg)', paddingBottom: 60 }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1c2128', color: '#e6edf3', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, fontSize: 14 },
        }}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>Your staking portfolio at a glance</p>

        {/* Summary row */}
        <div className="grid-3col" style={{ marginBottom: 32 }}>
          {[
            { label: 'Portfolio Value', value: posLoading ? '...' : `$${position?.portfolioValue.toLocaleString()}`, color: 'var(--text-primary)' },
            { label: 'Total Rewards Earned', value: posLoading ? '...' : `${(position?.pendingRewards ?? 0 + 4.23).toFixed(4)} TKA`, color: 'var(--stake-green)' },
            { label: 'Active Positions', value: '2', color: 'var(--text-primary)' },
          ].map((s) => (
            <div className="stat-glass-card" key={s.label}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Positions */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Your Staking Positions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {posLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="stake-card skeleton" style={{ height: 90 }} />
                ))
              : positions.map((pos) => (
                  <div key={pos.token} className="stake-card position-row" style={{ padding: '18px 24px', gap: 16 }}>
                    <div style={{ display: 'flex', flex: 1, gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Token */}
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Token</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{pos.token}</div>
                      </div>
                      {/* APR chip */}
                      <span style={{
                        background: 'rgba(16,185,129,0.12)', color: 'var(--stake-green)',
                        border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20,
                        padding: '3px 10px', fontSize: 12, fontWeight: 700,
                      }}>
                        {pos.apr.toFixed(2)}% APR
                      </span>
                      {/* Staked */}
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Staked</div>
                        <div style={{ fontWeight: 600 }}>{pos.staked.toFixed(2)} {pos.token}</div>
                      </div>
                      {/* Since */}
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Since</div>
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>{pos.since}</div>
                      </div>
                      {/* Rewards */}
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Pending Rewards</div>
                        <div style={{ fontWeight: 700, color: 'var(--stake-green)' }}>{pos.rewards.toFixed(4)} {pos.token}</div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="position-actions" style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <button
                        className="btn-stake"
                        style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}
                        onClick={() => claimMut.mutate()}
                        disabled={claimMut.isPending}
                      >
                        Claim Rewards
                      </button>
                      <button
                        className="btn-outline-stake"
                        onClick={() => unstakeMut.mutate()}
                        disabled={unstakeMut.isPending}
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Rewards chart */}
        <RewardsChart />

        {/* APR info */}
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Platform APR: <strong style={{ color: 'var(--stake-green)' }}>{stats?.apr.toFixed(2) ?? '12.00'}%</strong>
          &nbsp;·&nbsp; Total stakers: <strong>{stats?.totalStakers.toLocaleString() ?? '1,420'}</strong>
        </div>
      </div>
    </div>
  );
}
