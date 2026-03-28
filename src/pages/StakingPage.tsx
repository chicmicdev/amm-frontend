import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAppKitAccount } from '@reown/appkit/react';
import StakeCard from '../components/staking/StakeCard';
import StatsBar from '../components/staking/StatsBar';
import RewardsChart from '../components/staking/RewardsChart';
import TransactionTable from '../components/staking/TransactionTable';
import { getUserPosition, getStakingStats, postClaim, postUnstake } from '../services/api/stakingService';

type SubTab = 'stake' | 'portfolio' | 'history';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'stake',     label: 'Stake Tokens'         },
  { key: 'portfolio', label: 'Current Portfolio'     },
  { key: 'history',   label: 'Transaction History'   },
];

export default function StakingPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('stake');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--color-accent-border)',
            borderRadius: 12,
            fontSize: 14,
          },
        }}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Page header ── */}
        <div style={{ paddingTop: 52, paddingBottom: 28 }}>
          <h1 className="page-heading">Stake</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
            Earn rewards by staking your tokens on Flux Swap.
          </p>
        </div>

        {/* ── Sub-nav ── */}
        <div className="stake-subnav">
          {SUB_TABS.map(tab => (
            <button
              key={tab.key}
              className={`stake-subnav-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ marginTop: 40 }}>
          {activeTab === 'stake'     && <StakeTokensTab />}
          {activeTab === 'portfolio' && <PortfolioTab />}
          {activeTab === 'history'   && <HistoryTab />}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared section header ───────────────────────────────────────────────── */
function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h3 className="section-heading" style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h3>
        {subtitle && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ─── Tab 1: Stake Tokens ─────────────────────────────────────────────────── */
function StakeTokensTab() {
  return (
    <>
      {/* Hero */}

      {/* 2-col: stake card + stats */}
      <div className="stake-tokens-grid">
        <StakeCard />
        <StatsBar />
      </div>
    </>
  );
}

/* ─── Tab 2: Current Portfolio ────────────────────────────────────────────── */
function PortfolioTab() {
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
        { token: 'TKA', color: 'var(--color-accent-light)', apr: 12.0, staked: position.stakedAmount, since: 'Mar 15, 2026', rewards: position.pendingRewards },
        { token: 'TKB', color: 'var(--color-accent-alt)',   apr: 8.5,  staked: 1200,                  since: 'Mar 20, 2026', rewards: 4.23 },
      ]
    : [];

  const summaryCards = [
    {
      label: 'Portfolio Value',
      value: posLoading ? '—' : `$${position?.portfolioValue.toLocaleString() ?? '0'}`,
      valueColor: 'var(--text-primary)',
    },
    {
      label: 'Total Rewards Earned',
      value: posLoading ? '—' : `${((position?.pendingRewards ?? 0) + 4.23).toFixed(4)}`,
      unit: 'TKA',
      valueColor: 'var(--color-success)',
    },
    {
      label: 'Active Positions',
      value: '2',
      valueColor: 'var(--color-accent-light)',
    },
  ];

  return (
    <>
      {/* Summary cards */}
      <div className="grid-3col" style={{ marginBottom: 40 }}>
        {summaryCards.map((c) => (
          <div key={c.label} className="portfolio-glass-card">
            <span className="portfolio-card-label">{c.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="portfolio-card-value" style={{ color: c.valueColor }}>{c.value}</span>
              {c.unit && <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Staking positions */}
      <section style={{ marginBottom: 40 }}>
        <SectionHeader
          title="Your Staking Positions"
          right={
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              APR: <strong style={{ color: 'var(--color-success)' }}>{stats?.apr.toFixed(2) ?? '12.00'}%</strong>
              &nbsp;·&nbsp;
              Stakers: <strong style={{ color: 'var(--text-primary)' }}>{stats?.totalStakers.toLocaleString() ?? '1,420'}</strong>
            </span>
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
              ))
            : positions.map((pos) => (
                <div key={pos.token} className="position-row-card">

                  {/* Token icon + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                    <div
                      className="position-token-icon"
                      style={{ background: `${pos.color}18`, border: `1px solid ${pos.color}30` }}
                    >
                      <span style={{ fontSize: 20, color: pos.color }}>⬡</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 17, fontWeight: 700 }}>{pos.token}</span>
                        <span className="apr-chip">{pos.apr.toFixed(2)}% APR</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                        Staked since {pos.since}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="position-stats-grid">
                    <div>
                      <p className="position-stat-label">Staked Amount</p>
                      <p className="position-stat-value">{pos.staked.toFixed(2)} {pos.token}</p>
                    </div>
                    <div>
                      <p className="position-stat-label">Pending Rewards</p>
                      <p className="position-stat-value" style={{ color: 'var(--color-success)' }}>
                        {pos.rewards.toFixed(4)} {pos.token}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    <button
                      className="btn-stake"
                      style={{ width: 'auto', padding: '9px 20px', fontSize: 13, borderRadius: 10 }}
                      onClick={() => claimMut.mutate()}
                      disabled={claimMut.isPending}
                    >
                      Claim Rewards
                    </button>
                    <button
                      className="btn-outline-stake"
                      style={{ padding: '9px 20px', fontSize: 13, borderRadius: 10 }}
                      onClick={() => unstakeMut.mutate()}
                      disabled={unstakeMut.isPending}
                    >
                      Unstake
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* Rewards chart */}
      <section>
        <SectionHeader title="Rewards Over Time" subtitle="Cumulative rewards over the last 30 days" />
        <RewardsChart />
      </section>
    </>
  );
}

/* ─── Tab 3: Transaction History ─────────────────────────────────────────── */
function HistoryTab() {
  return (
    <>

      <TransactionTable />
    </>
  );
}
