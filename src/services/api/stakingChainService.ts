/**
 * On-chain StakingPool: stake / withdraw / claim + pool reads.
 */
import { formatUnits, maxUint256, parseEventLogs, parseUnits, type Address } from 'viem';
import { readContract, writeContract } from 'viem/actions';
import { getWalletClient, waitForTransactionReceipt, getAccount } from 'wagmi/actions';
import { CHAIN_ID, CONTRACTS } from '../../config/contracts';
import { erc20Abi } from '../../contracts/abis';
import { stakingPoolAbi } from '../../contracts/stakingPoolAbi';
import { collectViemErrorText } from '../../utils/viemErrors';
import { ammWagmiConfig, getAmmPublicClient } from './ammClient';
import { STAKING_REWARD_MODE_APR } from '../../utils/stakingFormat';
import { fetchTokenDecimals, fetchTokenSymbol } from './tokenMetadata';

const config = ammWagmiConfig;
const poolAddr = CONTRACTS.StakingPool as Address;

export interface StakingPoolMeta {
  stakingToken: Address;
  rewardToken: Address;
  stakeDecimals: number;
  rewardDecimals: number;
  stakeSymbol: string;
  rewardSymbol: string;
  /** `aprBps / 100` e.g. 1200 → 12% */
  aprPercent: number;
  totalStakedHuman: number;
  rewardMode: number;
  isAprMode: boolean;
  rewardPerBlockHuman: number;
}

type UserInfoTuple = readonly [bigint, bigint, bigint, bigint];

export async function fetchStakingPoolMeta(): Promise<StakingPoolMeta> {
  const pc = getAmmPublicClient();
  const [stakingToken, rewardToken, aprBps, totalStaked, rewardMode, rewardPerBlock] = await Promise.all([
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'stakingToken',
    }) as Promise<Address>,
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'rewardToken',
    }) as Promise<Address>,
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'aprBps',
    }) as Promise<bigint>,
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'totalStaked',
    }) as Promise<bigint>,
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'rewardMode',
    }) as Promise<number>,
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'rewardPerBlock',
    }) as Promise<bigint>,
  ]);
  const [stakeDecimals, rewardDecimals, stakeSymbol, rewardSymbol] = await Promise.all([
    fetchTokenDecimals(stakingToken),
    fetchTokenDecimals(rewardToken),
    fetchTokenSymbol(stakingToken),
    fetchTokenSymbol(rewardToken),
  ]);
  const modeN = Number(rewardMode);
  const isAprMode = modeN === STAKING_REWARD_MODE_APR;
  return {
    stakingToken,
    rewardToken,
    stakeDecimals,
    rewardDecimals,
    stakeSymbol,
    rewardSymbol,
    aprPercent: Number(aprBps) / 100,
    totalStakedHuman: Number.parseFloat(formatUnits(totalStaked, stakeDecimals)),
    rewardMode: modeN,
    isAprMode,
    rewardPerBlockHuman: Number.parseFloat(formatUnits(rewardPerBlock, rewardDecimals)),
  };
}

export async function fetchStakingUserRaw(walletAddress: string): Promise<{
  stakedWei: bigint;
  pendingWei: bigint;
  lastRewardTs: bigint;
}> {
  const pc = getAmmPublicClient();
  const a = walletAddress as Address;
  const [info, pending] = await Promise.all([
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'userInfo',
      args: [a],
    }) as Promise<UserInfoTuple>,
    readContract(pc, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'pendingRewards',
      args: [a],
    }) as Promise<bigint>,
  ]);
  return {
    stakedWei: info[0],
    pendingWei: pending,
    lastRewardTs: info[1],
  };
}

function normalizeTxError(err: unknown): Error {
  const text = collectViemErrorText(err);
  if (/User rejected|User denied|denied transaction/i.test(text)) {
    return new Error('Transaction was rejected in your wallet.');
  }
  if (err instanceof Error) return new Error(text || err.message);
  return new Error(text || 'Transaction failed');
}

async function ensureStakeAllowance(
  wallet: NonNullable<Awaited<ReturnType<typeof getWalletClient>>>,
  user: Address,
  stakingToken: Address,
  need: bigint,
): Promise<void> {
  const pc = getAmmPublicClient();
  const allowance = (await readContract(pc, {
    address: stakingToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [user, poolAddr],
  })) as bigint;
  if (allowance >= need) return;
  const hash = await writeContract(wallet, {
    address: stakingToken,
    abi: erc20Abi,
    functionName: 'approve',
    args: [poolAddr, maxUint256],
  });
  const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  if (receipt.status !== 'success') throw new Error('Approve transaction failed.');
}

export async function stakeOnChain(amountHuman: string): Promise<{ txHash: `0x${string}` }> {
  const wallet = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!wallet || !user) throw new Error(`Connect a wallet on chain ${CHAIN_ID}.`);
  try {
    const meta = await fetchStakingPoolMeta();
    const amountWei = parseUnits(amountHuman.trim(), meta.stakeDecimals);
    if (amountWei <= 0n) throw new Error('Amount must be greater than zero.');
    await ensureStakeAllowance(wallet, user, meta.stakingToken, amountWei);
    const hash = await writeContract(wallet, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'stake',
      args: [amountWei],
    });
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    if (receipt.status !== 'success') throw new Error('Stake transaction reverted.');
    return { txHash: hash };
  } catch (e) {
    throw normalizeTxError(e);
  }
}

export async function withdrawOnChain(amountHuman: string): Promise<{ txHash: `0x${string}` }> {
  const wallet = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!wallet || !user) throw new Error(`Connect a wallet on chain ${CHAIN_ID}.`);
  try {
    const meta = await fetchStakingPoolMeta();
    const amountWei = parseUnits(amountHuman.trim(), meta.stakeDecimals);
    if (amountWei <= 0n) throw new Error('Amount must be greater than zero.');
    const hash = await writeContract(wallet, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'withdraw',
      args: [amountWei],
    });
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    if (receipt.status !== 'success') throw new Error('Unstake transaction reverted.');
    return { txHash: hash };
  } catch (e) {
    throw normalizeTxError(e);
  }
}

export async function withdrawAllOnChain(): Promise<{ txHash: `0x${string}` }> {
  const wallet = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!wallet || !user) throw new Error(`Connect a wallet on chain ${CHAIN_ID}.`);
  try {
    const raw = await fetchStakingUserRaw(user);
    if (raw.stakedWei <= 0n) throw new Error('Nothing staked to withdraw.');
    const hash = await writeContract(wallet, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'withdraw',
      args: [raw.stakedWei],
    });
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    if (receipt.status !== 'success') throw new Error('Unstake transaction reverted.');
    return { txHash: hash };
  } catch (e) {
    throw normalizeTxError(e);
  }
}

export async function claimOnChain(): Promise<{ txHash: `0x${string}`; paidHuman: number }> {
  const wallet = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!wallet || !user) throw new Error(`Connect a wallet on chain ${CHAIN_ID}.`);
  try {
    const meta = await fetchStakingPoolMeta();
    const hash = await writeContract(wallet, {
      address: poolAddr,
      abi: stakingPoolAbi,
      functionName: 'claim',
    });
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    if (receipt.status !== 'success') throw new Error('Claim transaction reverted.');
    let paidWei = 0n;
    try {
      const evs = parseEventLogs({
        abi: stakingPoolAbi,
        logs: receipt.logs,
        eventName: 'RewardPaid',
      });
      const last = evs[evs.length - 1];
      if (last?.args && typeof last.args === 'object' && 'reward' in last.args) {
        paidWei = last.args.reward as bigint;
      }
    } catch {
      paidWei = 0n;
    }
    const paidHuman = Number.parseFloat(formatUnits(paidWei, meta.rewardDecimals));
    return { txHash: hash, paidHuman };
  } catch (e) {
    throw normalizeTxError(e);
  }
}
