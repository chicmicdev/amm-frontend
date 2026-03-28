import { Toaster } from 'react-hot-toast';
import StakeCard from '../components/staking/StakeCard';
import StatsBar from '../components/staking/StatsBar';
import RewardsChart from '../components/staking/RewardsChart';
import TransactionTable from '../components/staking/TransactionTable';

export default function StakingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--stake-bg)', paddingBottom: 60 }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c2128',
            color: '#e6edf3',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12,
            fontSize: 14,
          },
        }}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Hero */}
        <div className="hero-section">
          <h1 className="hero-title" style={{ fontWeight: 800, margin: '0 0 12px', lineHeight: 1.1 }}>
            Stake Your Tokens.{' '}
            <span className="gradient-text">Earn Rewards.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: 0, maxWidth: 520, marginInline: 'auto' }}>
            Earn up to 12% APR with FLUX SWAP's secure, transparent staking platform.
          </p>
        </div>

        {/* Main 2-column layout */}
        <div className="grid-2col" style={{ marginBottom: 24 }}>
          <StakeCard />
          <StatsBar />
        </div>

        {/* Rewards chart */}
        <div style={{ marginBottom: 24 }}>
          <RewardsChart />
        </div>

        {/* Transaction history */}
        <TransactionTable />
      </div>
    </div>
  );
}
