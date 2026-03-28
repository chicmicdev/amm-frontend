import type {
  StakingStats,
  UserPosition,
  RewardDataPoint,
  StakingTransaction,
} from '../../types/staking';

export const mockStats: StakingStats = {
  apr: 12.0,
  tvl: 2400000,
  totalStakers: 1420,
};

export const mockUserPosition: UserPosition = {
  stakedAmount: 500,
  tokenSymbol: 'TKA',
  pendingRewards: 8.22,
  stakedSince: '2026-03-15',
  portfolioValue: 12450,
};

// 30 days of progressively growing rewards (Mar 1 – Mar 30 2026)
// Using UTC methods to avoid timezone-shift bugs (e.g. new Date('2026-03-01') is
// UTC midnight, so local getDate()/getMonth() roll back a day in UTC− timezones).
export const mockRewardsHistory: RewardDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 2, 1 + i)); // month is 0-indexed
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return {
    time: `${yyyy}-${mm}-${dd}`,
    value: parseFloat(((62.45 / 29) * i).toFixed(4)),
  };
});

export const mockTransactions: StakingTransaction[] = [
  { id: '1', date: 'Mar 28, 2026', type: 'STAKE',   token: 'TKA', amount: 500,    status: 'CONFIRMED', txHash: '0x3f2a8b1c' },
  { id: '2', date: 'Mar 25, 2026', type: 'CLAIM',   token: 'TKA', amount: 8.22,   status: 'CONFIRMED', txHash: '0x7d4e2a9f' },
  { id: '3', date: 'Mar 22, 2026', type: 'UNSTAKE', token: 'TKB', amount: 200,    status: 'CONFIRMED', txHash: '0x1c8b5e3d' },
  { id: '4', date: 'Mar 20, 2026', type: 'STAKE',   token: 'TKB', amount: 1200,   status: 'CONFIRMED', txHash: '0x9a2f7c1e' },
  { id: '5', date: 'Mar 15, 2026', type: 'STAKE',   token: 'TKA', amount: 500,    status: 'CONFIRMED', txHash: '0x4b7d3f8a' },
  { id: '6', date: 'Mar 12, 2026', type: 'CLAIM',   token: 'TKA', amount: 4.10,   status: 'CONFIRMED', txHash: '0x2e9c6d1b' },
  { id: '7', date: 'Mar 10, 2026', type: 'STAKE',   token: 'TKA', amount: 250,    status: 'CONFIRMED', txHash: '0x8f3a1e5c' },
  { id: '8', date: 'Mar 05, 2026', type: 'UNSTAKE', token: 'TKB', amount: 100,    status: 'PENDING',   txHash: '0x5d7b2c4a' },
];
