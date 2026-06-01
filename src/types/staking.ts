export interface StakingStats {
  apr: number;
  /** Total staked amount in staking-token units (not USD). */
  tvl: number;
  totalStakers: number;
  stakingTokenSymbol: string;
  rewardTokenSymbol: string;
  stakingTokenAddress: string;
  rewardTokenAddress: string;
  /** Raw `rewardMode` from the pool contract. */
  rewardMode: number;
  /** Whether the pool uses APR (basis points) for the reward preview. */
  isAprMode: boolean;
  /** Reward token amount per block (human), for per-block mode. */
  rewardPerBlockHuman: number;
}

export interface UserPosition {
  /** Parsed stake (may lose precision); prefer `stakedAmountDisplay` for UI. */
  stakedAmount: number;
  /** Exact stake from chain (`formatUnits`), safe for MAX / inputs. */
  stakedAmountDisplay: string;
  tokenSymbol: string;
  /** Symbol for `pendingRewards` (reward token from the pool). */
  rewardSymbol: string;
  pendingRewards: number;
  pendingRewardsDisplay: string;
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
