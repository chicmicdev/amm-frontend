import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAppKitAccount } from '@reown/appkit/react';
import {
  getUserPosition,
  getStakingStats,
  postClaim,
  postUnstakeAll,
} from '../services/api/stakingService';
import { formatStakingNumber } from '../utils/stakingFormat';
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
      toast.success(`Claimed ${formatStakingNumber(d.amount, 12)} ${position?.rewardSymbol ?? ''}`.trim());
      qc.invalidateQueries({ queryKey: ['userPosition'] });
      qc.invalidateQueries({ queryKey: ['stakingStats'] });
      qc.invalidateQueries({ queryKey: ['stakingPoolMeta'] });
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Claim failed.'),
  });

  const unstakeMut = useMutation({
    mutationFn: () => postUnstakeAll(address ?? ''),
    onSuccess: () => {
      toast.success('Unstaked full balance.');
      qc.invalidateQueries({ queryKey: ['userPosition'] });
      qc.invalidateQueries({ queryKey: ['stakingStats'] });
      qc.invalidateQueries({ queryKey: ['stakingPoolMeta'] });
      qc.invalidateQueries({ queryKey: ['stakingTokenBalance'] });
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Unstake failed.'),
  });

  const positions = position && (position.stakedAmount > 0 || position.pendingRewards > 0)
    ? [
        {
          token: position.tokenSymbol,
          apr: stats?.apr ?? 0,
          stakedDisplay: position.stakedAmountDisplay,
          since: position.stakedSince,
          rewardDisplay: position.pendingRewardsDisplay,
          rewardSym: position.rewardSymbol,
        },
      ]
    : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--stake-bg)', paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>Your staking portfolio at a glance</p>

        <div className="grid-3col" style={{ marginBottom: 32 }}>
          {[
            {
              label: 'Staked',
              value: posLoading ? '...' : (position?.stakedAmountDisplay ?? '0'),
              sub: position?.tokenSymbol ?? '',
              color: 'var(--text-primary)',
            },
            {
              label: 'Pending rewards',
              value: posLoading ? '...' : (position?.pendingRewardsDisplay ?? '0'),
              sub: position?.rewardSymbol ?? '',
              color: 'var(--stake-green)',
            },
            {
              label: 'Active positions',
              value: posLoading ? '...' : String(position && position.stakedAmount > 0 ? 1 : 0),
              sub: '',
              color: 'var(--text-primary)',
            },
          ].map((s) => (
            <div className="stat-glass-card" key={s.label}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>
                {s.value}
                {s.sub ? <span style={{ fontSize: 16, marginLeft: 8, color: 'var(--text-secondary)' }}>{s.sub}</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Your Staking Positions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {posLoading
              ? Array.from({ length: 1 }).map((_, i) => (
                  <div key={i} className="stake-card skeleton" style={{ height: 90 }} />
                ))
              : positions.length === 0
                ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No staking position yet.</p>
                  )
                : positions.map((pos) => (
                    <div key={pos.token} className="stake-card position-row" style={{ padding: '18px 24px', gap: 16 }}>
                      <div style={{ display: 'flex', flex: 1, gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Token</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{pos.token}</div>
                        </div>
                        <span style={{
                          background: 'rgba(16,185,129,0.12)', color: 'var(--stake-green)',
                          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20,
                          padding: '3px 10px', fontSize: 12, fontWeight: 700,
                        }}>
                          {pos.apr.toFixed(2)}% APR
                        </span>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Staked</div>
                          <div style={{ fontWeight: 600 }}>{pos.stakedDisplay} {pos.token}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Since</div>
                          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>{pos.since}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Pending Rewards</div>
                          <div style={{ fontWeight: 700, color: 'var(--stake-green)' }}>
                            {pos.rewardDisplay} {pos.rewardSym}
                          </div>
                        </div>
                      </div>
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
                          disabled={unstakeMut.isPending || !position?.stakedAmount}
                        >
                          Unstake all
                        </button>
                      </div>
                    </div>
                  ))}
          </div>
        </div>

        <RewardsChart />

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Pool APR: <strong style={{ color: 'var(--stake-green)' }}>{stats?.apr.toFixed(2) ?? '—'}%</strong>
          &nbsp;·&nbsp; Total staked:{' '}
          <strong>
            {(stats?.tvl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {stats?.stakingTokenSymbol ?? ''}
          </strong>
        </div>
      </div>
    </div>
  );
}
