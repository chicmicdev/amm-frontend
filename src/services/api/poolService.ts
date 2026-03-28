/**
 * Pool & swap layer — reads/writes AMM_v3 UniswapV3Factory, Pool, SwapRouter, ERC20.
 */
import {
  formatUnits,
  maxUint256,
  parseUnits,
  zeroAddress,
  type Address,
} from 'viem';
import { readContract, writeContract } from 'viem/actions';
import { getPublicClient, getWalletClient, waitForTransactionReceipt, getAccount } from 'wagmi/actions';
import { wagmiAdapter } from '../../config/reown';
import { CHAIN_ID, CONTRACTS, FEE_TIERS } from '../../config/contracts';
import type { Pool, PoolStats, SwapParams, SwapQuote } from '../../types';
import { TOKENS, TOKEN_MAP } from '../../config/tokens';
import { factoryAbi, poolAbi, swapRouterAbi, erc20Abi } from '../../contracts/abis';
import { sqrtPriceX96ToPriceToken1PerToken0, getAmountsForLiquidity } from '../../utils/liquidityAmounts';
import { quoteExactInputSingleSpot } from '../../utils/v3Quote';
import { getSqrtRatioAtTick } from '../../utils/tickMath';

const config = wagmiAdapter.wagmiConfig;

/** Shared viem public client for chain 31337 (exported for position service). */
export function getAmmPublicClient() {
  const pc = getPublicClient(config, { chainId: CHAIN_ID });
  if (!pc) {
    throw new Error('No RPC for chain 31337. Run a local Hardhat node and select Hardhat in the wallet / AppKit.');
  }
  return pc;
}

function tokenFromAddress(addr: string): import('../../types').Token {
  const t = TOKEN_MAP[addr.toLowerCase()];
  if (t) return t;
  return {
    address: addr,
    symbol: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    name: 'Unknown token',
    decimals: 18,
    logoColor: '#8b949e',
  };
}

export async function getPool(
  tokenA: string,
  tokenB: string,
  fee: number
): Promise<Pool | null> {
  const pc = getAmmPublicClient();
  const poolAddr = await readContract(pc, {
    address: CONTRACTS.Factory as Address,
    abi: factoryAbi,
    functionName: 'getPool',
    args: [tokenA as Address, tokenB as Address, fee],
  });
  if (!poolAddr || poolAddr === zeroAddress) return null;

  const [t0, t1, liq, slot] = await Promise.all([
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'token0',
    }),
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'token1',
    }),
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'liquidity',
    }),
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'slot0',
    }),
  ]);

  const sqrtPriceX96 = slot[0];
  const tick = Number(slot[1]);
  const price = sqrtPriceX96ToPriceToken1PerToken0(sqrtPriceX96);

  return {
    address: poolAddr,
    token0: tokenFromAddress(t0),
    token1: tokenFromAddress(t1),
    fee,
    sqrtPriceX96: sqrtPriceX96.toString(),
    tick,
    liquidity: liq.toString(),
    price,
    tvl: 0,
    volume24h: 0,
    feesEarned24h: 0,
  };
}

export async function getAllPools(): Promise<Pool[]> {
  const pools: Pool[] = [];
  for (let i = 0; i < TOKENS.length; i++) {
    for (let j = i + 1; j < TOKENS.length; j++) {
      for (const tier of FEE_TIERS) {
        const p = await getPool(TOKENS[i].address, TOKENS[j].address, tier.fee);
        if (p) pools.push(p);
      }
    }
  }
  return pools;
}

export async function getPoolStats(
  token0Address: string,
  token1Address: string,
  fee: number
): Promise<PoolStats | null> {
  const pool = await getPool(token0Address, token1Address, fee);
  if (!pool) return null;
  return {
    price: pool.price,
    priceChange24h: 0,
    tvl: 0,
    volume24h: 0,
    fees24h: 0,
  };
}

export async function getSwapQuote(params: SwapParams): Promise<SwapQuote | null> {
  const pool = await getPool(params.tokenIn.address, params.tokenOut.address, params.fee);
  if (!pool) return null;

  const pc = getAmmPublicClient();
  const poolAddr = pool.address as Address;
  const [chainT0, sqrtPriceX96] = await Promise.all([
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'token0',
    }),
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'slot0',
    }).then(s => s[0]),
  ]);

  const tIn = params.tokenIn.address.toLowerCase();
  const zeroForOne = tIn === chainT0.toLowerCase();
  const amountInWei = parseUnits(params.amountIn, params.tokenIn.decimals);
  const amountOutWei = quoteExactInputSingleSpot(sqrtPriceX96, amountInWei, params.fee, zeroForOne);

  const amountOutHuman = Number(formatUnits(amountOutWei, params.tokenOut.decimals));
  const slippageBps = Math.round(params.slippage * 100);
  const amountOutMinWei = (amountOutWei * (10_000n - BigInt(Math.min(slippageBps, 9999)))) / 10_000n;
  const amountOutMinimumHuman = formatUnits(amountOutMinWei, params.tokenOut.decimals);

  const executionPrice =
    Number.parseFloat(params.amountIn) > 0 ? amountOutHuman / Number.parseFloat(params.amountIn) : pool.price;

  return {
    amountOut: amountOutHuman.toFixed(6),
    amountOutMinimum: amountOutMinimumHuman,
    priceImpact: 0,
    executionPrice,
    gasFee: '—',
  };
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  const pc = getAmmPublicClient();
  const bal = await readContract(pc, {
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress as Address],
  });
  let decimals = TOKEN_MAP[tokenAddress.toLowerCase()]?.decimals;
  if (decimals === undefined) {
    decimals = await readContract(pc, {
      address: tokenAddress as Address,
      abi: erc20Abi,
      functionName: 'decimals',
    });
  }
  return formatUnits(bal, decimals);
}

export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<string> {
  const pc = getAmmPublicClient();
  const a = await readContract(pc, {
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [ownerAddress as Address, spenderAddress as Address],
  });
  const decimals =
    TOKEN_MAP[tokenAddress.toLowerCase()]?.decimals ??
    (await readContract(pc, {
      address: tokenAddress as Address,
      abi: erc20Abi,
      functionName: 'decimals',
    }));
  return formatUnits(a, decimals);
}

export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  _amount: string
): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  if (!walletClient) throw new Error('Connect a wallet on the AMM network (chain 31337).');

  const hash = await writeContract(walletClient, {
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress as Address, maxUint256],
  });
  await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  return { hash };
}

export async function executeSwap(params: SwapParams): Promise<{ hash: string }> {
  const quote = await getSwapQuote(params);
  if (!quote) throw new Error('No pool for this pair and fee tier.');

  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user) throw new Error('Connect a wallet on the AMM network (chain 31337).');

  const amountInWei = parseUnits(params.amountIn, params.tokenIn.decimals);
  const amountOutMinWei = parseUnits(quote.amountOutMinimum, params.tokenOut.decimals);

  const allowance = await readContract(getAmmPublicClient(), {
    address: params.tokenIn.address as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [user, CONTRACTS.SwapRouter as Address],
  });

  if (allowance < amountInWei) {
    const approveHash = await writeContract(walletClient, {
      address: params.tokenIn.address as Address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CONTRACTS.SwapRouter as Address, maxUint256],
    });
    await waitForTransactionReceipt(config, { hash: approveHash, chainId: CHAIN_ID });
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const hash = await writeContract(walletClient, {
    address: CONTRACTS.SwapRouter as Address,
    abi: swapRouterAbi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: params.tokenIn.address as Address,
        tokenOut: params.tokenOut.address as Address,
        fee: params.fee,
        recipient: user,
        deadline,
        amountIn: amountInWei,
        amountOutMinimum: amountOutMinWei,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  return { hash };
}

/** Used by position service for pooled amounts (same math as on-chain mint). */
export async function readPoolSlot0(poolAddress: string): Promise<{ sqrtPriceX96: bigint; tick: number }> {
  const slot = await readContract(getAmmPublicClient(), {
    address: poolAddress as Address,
    abi: poolAbi,
    functionName: 'slot0',
  });
  return { sqrtPriceX96: slot[0], tick: Number(slot[1]) };
}

export function positionTokenAmounts(
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  const sa = getSqrtRatioAtTick(tickLower);
  const sb = getSqrtRatioAtTick(tickUpper);
  return getAmountsForLiquidity(sqrtPriceX96, sa, sb, liquidity);
}
