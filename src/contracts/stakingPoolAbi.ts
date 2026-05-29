import type { Abi } from 'viem';
import StakingPoolArtifact from './StakingPool.json';

export const stakingPoolAbi = StakingPoolArtifact.abi as Abi;
