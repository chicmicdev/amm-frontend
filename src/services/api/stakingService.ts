import type {
  StakingStats,
  UserPosition,
  RewardDataPoint,
  StakingTransaction,
  TxType,
} from '../../types/staking';
import {
  mockStats,
  mockUserPosition,
  mockRewardsHistory,
  mockTransactions,
} from '../mock/stakingMockData';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getStakingStats(): Promise<StakingStats> {
  await delay(400);
  return { ...mockStats };
}

export async function getUserPosition(_address: string): Promise<UserPosition> {
  await delay(400);
  return { ...mockUserPosition };
}

export async function getRewardsHistory(_address: string): Promise<RewardDataPoint[]> {
  await delay(400);
  return [...mockRewardsHistory];
}

export async function getTransactionHistory(
  _address: string,
  filter: TxType | 'ALL'
): Promise<StakingTransaction[]> {
  await delay(400);
  if (filter === 'ALL') return [...mockTransactions];
  return mockTransactions.filter((tx) => tx.type === filter);
}

export async function postStake(
  _address: string,
  _amount: number,
  _token: string
): Promise<{ success: boolean; txHash: string }> {
  await delay(600);
  return { success: true, txHash: `0x${Math.random().toString(16).slice(2, 10)}` };
}

export async function postUnstake(
  _address: string,
  _amount: number
): Promise<{ success: boolean; txHash: string }> {
  await delay(600);
  return { success: true, txHash: `0x${Math.random().toString(16).slice(2, 10)}` };
}

export async function postClaim(
  _address: string
): Promise<{ success: boolean; txHash: string; amount: number }> {
  await delay(600);
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).slice(2, 10)}`,
    amount: mockUserPosition.pendingRewards,
  };
}
