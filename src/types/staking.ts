export interface StakingStats {
  apr: number;
  tvl: number;
  totalStakers: number;
}

export interface UserPosition {
  stakedAmount: number;
  tokenSymbol: string;
  pendingRewards: number;
  stakedSince: string;
  portfolioValue: number;
}

export interface RewardDataPoint {
  time: string; // 'YYYY-MM-DD'
  value: number;
}

export type TxType = 'STAKE' | 'UNSTAKE' | 'CLAIM';
export type TxStatus = 'CONFIRMED' | 'PENDING';

export interface StakingTransaction {
  id: string;
  date: string;
  type: TxType;
  token: string;
  amount: number;
  status: TxStatus;
  txHash: string;
}
