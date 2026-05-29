import type {
  StakingStats,
  UserPosition,
  RewardDataPoint,
  StakingTransaction,
  TxType,
} from '../../types/staking';
import {
  mockRewardsHistory,
  mockTransactions,
} from '../mock/stakingMockData';
import {
  claimOnChain,
  fetchStakingPoolMeta,
  fetchStakingUserRaw,
  stakeOnChain,
  withdrawAllOnChain,
  withdrawOnChain,
} from './stakingChainService';
import { formatUnits } from 'viem';
import { formatBigintTokenAmount } from '../../utils/formatUtils';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function emptyPosition(meta?: { stakeSymbol: string; rewardSymbol: string }): UserPosition {
  return {
    stakedAmount: 0,
    stakedAmountDisplay: '0',
    tokenSymbol: meta?.stakeSymbol ?? '—',
    rewardSymbol: meta?.rewardSymbol ?? '—',
    pendingRewards: 0,
    pendingRewardsDisplay: '0',
    stakedSince: '—',
    portfolioValue: 0,
  };
}

export async function getStakingStats(): Promise<StakingStats> {
  const meta = await fetchStakingPoolMeta();
  return {
    apr: meta.aprPercent,
    tvl: meta.totalStakedHuman,
    totalStakers: 0,
    stakingTokenSymbol: meta.stakeSymbol,
    rewardTokenSymbol: meta.rewardSymbol,
    stakingTokenAddress: meta.stakingToken,
    rewardTokenAddress: meta.rewardToken,
    rewardMode: meta.rewardMode,
    isAprMode: meta.isAprMode,
    rewardPerBlockHuman: meta.rewardPerBlockHuman,
  };
}

export async function getUserPosition(address: string): Promise<UserPosition> {
  const meta = await fetchStakingPoolMeta();
  if (!address) return emptyPosition(meta);

  const raw = await fetchStakingUserRaw(address);
  const stakedAmountDisplay = formatBigintTokenAmount(raw.stakedWei, meta.stakeDecimals, 18);
  const pendingRewardsDisplay = formatBigintTokenAmount(raw.pendingWei, meta.rewardDecimals, 18);
  const stakedAmount = Number.parseFloat(formatUnits(raw.stakedWei, meta.stakeDecimals));
  const pendingRewards = Number.parseFloat(formatUnits(raw.pendingWei, meta.rewardDecimals));
  const ts = raw.lastRewardTs;
  const stakedSince =
    ts > 0n
      ? new Date(Number(ts) * 1000).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';

  return {
    stakedAmount,
    stakedAmountDisplay,
    tokenSymbol: meta.stakeSymbol,
    rewardSymbol: meta.rewardSymbol,
    pendingRewards,
    pendingRewardsDisplay,
    stakedSince,
    portfolioValue: stakedAmount,
  };
}

export async function getRewardsHistory(_address: string): Promise<RewardDataPoint[]> {
  await delay(200);
  return [...mockRewardsHistory];
}

export async function getTransactionHistory(
  _address: string,
  filter: TxType | 'ALL'
): Promise<StakingTransaction[]> {
  await delay(200);
  if (filter === 'ALL') return [...mockTransactions];
  return mockTransactions.filter((tx) => tx.type === filter);
}

export async function postStake(
  _address: string,
  amountHuman: string,
  _token: string,
): Promise<{ success: boolean; txHash: string }> {
  const { txHash } = await stakeOnChain(amountHuman);
  return { success: true, txHash };
}

export async function postUnstake(
  _address: string,
  amountHuman: string
): Promise<{ success: boolean; txHash: string }> {
  const { txHash } = await withdrawOnChain(amountHuman);
  return { success: true, txHash };
}

/** Withdraw full staked balance (exact wei from `userInfo`). */
export async function postUnstakeAll(
  _address: string
): Promise<{ success: boolean; txHash: string }> {
  const { txHash } = await withdrawAllOnChain();
  return { success: true, txHash };
}

export async function postClaim(
  _address: string
): Promise<{ success: boolean; txHash: string; amount: number }> {
  const { txHash, paidHuman } = await claimOnChain();
  return { success: true, txHash, amount: paidHuman };
}
