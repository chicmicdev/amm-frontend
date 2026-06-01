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
import { readContract, writeContract, simulateContract } from 'viem/actions';
import { getWalletClient, waitForTransactionReceipt, getAccount } from 'wagmi/actions';
import { CHAIN_ID, CONTRACTS, CONTRACT_ERRORS, FEE_TIERS, GAS } from '../../config/contracts';
import type { Pool, PoolStats, SwapParams, SwapQuote } from '../../types';
import { LISTED_TOKEN_ADDRESSES, getListedTokenMeta } from '../../config/tokens';
import { factoryAbi, poolAbi, swapRouterAbi, erc20Abi } from '../../contracts/abis';
import type { PoolSlot0Tuple } from '../../contracts/viemReadTypes';
import {
  sqrtPriceX96ToHumanPriceToken1PerToken0,
  getAmountsForLiquidity,
} from '../../utils/liquidityAmounts';
import { quoteExactInputSingleSpot } from '../../utils/v3Quote';
import { getSqrtRatioAtTick } from '../../utils/tickMath';
import { devLog, devError } from '../../utils/devLog';
import { collectViemErrorText } from '../../utils/viemErrors';
import { formatBigintTokenAmount } from '../../utils/formatUtils';
import { ammWagmiConfig, getAmmPublicClient } from './ammClient';
import { fetchTokenDecimals, mergeTokenDecimals } from './tokenMetadata';

const config = ammWagmiConfig;

/**
 * Spot `quoteExactInputSingle` ignores tick depth; real swaps often get less.
 * Shrink quoted output before applying user slippage so `amountOutMinimum` is reachable on-chain.
 */
const SPOT_OUTPUT_HAIRCUT_BPS = 700n;

/** Slippage UI is percent (e.g. 2 = 2%); convert to basis points for min-out math. */
function swapSlippageBps(slippagePercent: number): bigint {
  const raw = Math.round(slippagePercent * 100);
  return BigInt(Math.min(Math.max(0, raw), 9999));
}

function normalizeSwapError(err: unknown): Error {
  const text = collectViemErrorText(err);
  if (/Internal JSON-RPC error|InternalRpcError/i.test(text)) {
    return new Error(
      'RPC hid the revert reason. Common fixes: raise slippage (try 3–5%), ensure the pool has liquidity, or set a different Amoy endpoint (VITE_POLYGON_AMOY_RPC) and retry.'
    );
  }
  if (/Too little received|STF|Insufficient output amount|IIA/i.test(text)) {
    return new Error(
      CONTRACT_ERRORS['Too little received'] ?? 'Slippage too low or price moved — increase slippage and retry.'
    );
  }
  if (/execution reverted/i.test(text)) {
    return new Error(
      'Swap reverted on-chain. The pool likely has no liquidity for this pair, or the RPC did not return a reason. Verify liquidity exists for this pair and fee tier, or try a different RPC endpoint (VITE_POLYGON_AMOY_RPC).'
    );
  }
  if (err instanceof Error) return err;
  return new Error(text || 'Swap failed');
}

function normalizeApprovalError(err: unknown): Error {
  const text = collectViemErrorText(err);
  if (/User rejected|User denied|denied transaction|rejected the request/i.test(text)) {
    return new Error('Token approval was rejected in your wallet.');
  }
  if (/insufficient funds|insufficient balance|exceeds balance/i.test(text)) {
    return new Error(
      'Not enough Amoy POL for gas. Fund the wallet with testnet POL or switch RPC (VITE_POLYGON_AMOY_RPC) and retry.',
    );
  }
  if (/Internal JSON-RPC error|InternalRpcError|execution reverted/i.test(text)) {
    return new Error(
      'ERC20 approve failed (often gas/RPC or a stuck allowance). Retry, or revoke the token for the router in your wallet then swap again.',
    );
  }
  if (err instanceof Error) return new Error(`Token approval failed: ${err.message}`);
  return new Error(text || 'Token approval failed');
}

/** Simulate then submit approve; waits for receipt so swap runs with updated allowance. */
async function writeApproveWithSimulation(
  walletClient: NonNullable<Awaited<ReturnType<typeof getWalletClient>>>,
  pc: ReturnType<typeof getAmmPublicClient>,
  account: Address,
  token: Address,
  spender: Address,
  value: bigint,
): Promise<`0x${string}`> {
  try {
    const { request } = await simulateContract(pc, {
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, value],
      account,
      gas: GAS.limits.approve,
      maxFeePerGas: GAS.maxFeePerGas,
      maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    if (receipt.status !== 'success') {
      throw new Error('Approve transaction reverted on-chain.');
    }
    return hash;
  } catch (e) {
    devError('tx/swap', 'ERC20 approve failed', e);
    throw normalizeApprovalError(e);
  }
}

export { getAmmPublicClient } from './ammClient';

async function tokenFromAddress(addr: string): Promise<import('../../types').Token> {
  const listed = getListedTokenMeta(addr);
  const dec = await fetchTokenDecimals(addr);
  if (listed) return { ...listed, decimals: dec };
  return {
    address: addr,
    symbol: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    name: 'Unknown token',
    decimals: dec,
    logoColor: '#8b949e',
  };
}

export async function getPool(
  tokenA: string,
  tokenB: string,
  fee: number
): Promise<Pool | null> {
  const pc = getAmmPublicClient();
  const poolAddr = (await readContract(pc, {
    address: CONTRACTS.Factory as Address,
    abi: factoryAbi,
    functionName: 'getPool',
    args: [tokenA as Address, tokenB as Address, fee],
  })) as Address;
  if (!poolAddr || poolAddr === zeroAddress) return null;

  const [t0, t1, liq, slot] = await Promise.all([
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'token0',
    }) as Promise<Address>,
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'token1',
    }) as Promise<Address>,
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'liquidity',
    }) as Promise<bigint>,
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'slot0',
    }) as Promise<PoolSlot0Tuple>,
  ]);

  const sqrtPriceX96 = slot[0];
  const tick = Number(slot[1]);

  const [tok0, tok1] = await Promise.all([tokenFromAddress(t0), tokenFromAddress(t1)]);
  const price = sqrtPriceX96ToHumanPriceToken1PerToken0(
    sqrtPriceX96,
    tok0.decimals,
    tok1.decimals,
  );

  return {
    address: poolAddr,
    token0: tok0,
    token1: tok1,
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

/**
 * Creates the pool if missing, then calls `initialize` when `slot0.sqrtPriceX96` is zero.
 * No-op when the pool already has a starting price.
 */
export async function ensurePoolCreatedAndInitialized(
  tokenA: string,
  tokenB: string,
  fee: number,
  sqrtPriceX96: bigint,
): Promise<void> {
  if (sqrtPriceX96 <= 0n) throw new Error('Starting price must be positive.');

  const pc = getAmmPublicClient();
  const wallet = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!wallet || !user) throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  let poolAddr = (await readContract(pc, {
    address: CONTRACTS.Factory as Address,
    abi: factoryAbi,
    functionName: 'getPool',
    args: [tokenA as Address, tokenB as Address, fee],
  })) as Address;

  if (!poolAddr || poolAddr === zeroAddress) {
    devLog('tx/pool', 'createPool', { tokenA, tokenB, fee });
    const hash = await writeContract(wallet, {
      address: CONTRACTS.Factory as Address,
      abi: factoryAbi,
      functionName: 'createPool',
      args: [tokenA as Address, tokenB as Address, fee],
    });
    await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    devLog('tx/pool', 'createPool confirmed', { hash });
    poolAddr = (await readContract(pc, {
      address: CONTRACTS.Factory as Address,
      abi: factoryAbi,
      functionName: 'getPool',
      args: [tokenA as Address, tokenB as Address, fee],
    })) as Address;
  }

  const slot0 = (await readContract(pc, {
    address: poolAddr,
    abi: poolAbi,
    functionName: 'slot0',
  })) as PoolSlot0Tuple;

  if (slot0[0] === 0n) {
    devLog('tx/pool', 'initialize', { poolAddr, sqrtPriceX96: sqrtPriceX96.toString() });
    const hash = await writeContract(wallet, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'initialize',
      args: [sqrtPriceX96],
    });
    await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
    devLog('tx/pool', 'initialize confirmed', { hash });
  }
}

export async function getAllPools(): Promise<Pool[]> {
  const pools: Pool[] = [];
  for (let i = 0; i < LISTED_TOKEN_ADDRESSES.length; i++) {
    for (let j = i + 1; j < LISTED_TOKEN_ADDRESSES.length; j++) {
      for (const tier of FEE_TIERS) {
        const p = await getPool(LISTED_TOKEN_ADDRESSES[i], LISTED_TOKEN_ADDRESSES[j], tier.fee);
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
  const tokenIn = await mergeTokenDecimals(params.tokenIn);
  const tokenOut = await mergeTokenDecimals(params.tokenOut);
  const pool = await getPool(tokenIn.address, tokenOut.address, params.fee);
  if (!pool) return null;

  const pc = getAmmPublicClient();
  const poolAddr = pool.address as Address;
  const [chainT0, sqrtPriceX96] = await Promise.all([
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'token0',
    }) as Promise<Address>,
    readContract(pc, {
      address: poolAddr,
      abi: poolAbi,
      functionName: 'slot0',
    }).then(s => (s as PoolSlot0Tuple)[0]),
  ]);

  if (sqrtPriceX96 === 0n) return null;

  const tIn = tokenIn.address.toLowerCase();
  const zeroForOne = tIn === chainT0.toLowerCase();
  let amountInWei: bigint;
  try {
    amountInWei = parseUnits(params.amountIn, tokenIn.decimals);
  } catch {
    return null;
  }
  const rawOutWei = quoteExactInputSingleSpot(sqrtPriceX96, amountInWei, params.fee, zeroForOne);
  const amountOutWei = (rawOutWei * (10_000n - SPOT_OUTPUT_HAIRCUT_BPS)) / 10_000n;

  const slippageBps = Math.round(params.slippage * 100);
  const amountOutMinWei = (amountOutWei * (10_000n - BigInt(Math.min(slippageBps, 9999)))) / 10_000n;

  const amountOutDisplay = formatBigintTokenAmount(amountOutWei, tokenOut.decimals);
  const amountOutMinimumDisplay = formatBigintTokenAmount(amountOutMinWei, tokenOut.decimals);

  let executionPrice = pool.price;
  if (amountInWei > 0n && amountOutWei > 0n) {
    const inHuman = Number.parseFloat(formatUnits(amountInWei, tokenIn.decimals));
    const outHuman = Number.parseFloat(formatUnits(amountOutWei, tokenOut.decimals));
    if (Number.isFinite(inHuman) && Number.isFinite(outHuman) && inHuman > 0) {
      executionPrice = outHuman / inHuman;
    }
  }

  return {
    amountOut: amountOutDisplay,
    amountOutMinimum: amountOutMinimumDisplay,
    priceImpact: 0,
    executionPrice,
    gasFee: '—',
  };
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  const pc = getAmmPublicClient();
  const bal = (await readContract(pc, {
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress as Address],
  })) as bigint;
  const decimals = await fetchTokenDecimals(tokenAddress);
  return formatUnits(bal, decimals);
}

export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<string> {
  const pc = getAmmPublicClient();
  const a = (await readContract(pc, {
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [ownerAddress as Address, spenderAddress as Address],
  })) as bigint;
  const decimals = await fetchTokenDecimals(tokenAddress);
  return formatUnits(a, decimals);
}

export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  _amount: string
): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user) throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  devLog('tx/approve', 'submitting', { tokenAddress, spenderAddress, chainId: CHAIN_ID });
  const hash = await writeApproveWithSimulation(
    walletClient,
    getAmmPublicClient(),
    user,
    tokenAddress as Address,
    spenderAddress as Address,
    maxUint256,
  );
  devLog('tx/approve', 'confirmed', { hash });
  return { hash };
}

export async function executeSwap(params: SwapParams): Promise<{ hash: string }> {
  const tokenIn = await mergeTokenDecimals(params.tokenIn);
  const tokenOut = await mergeTokenDecimals(params.tokenOut);
  devLog('tx/swap', 'resolved decimals', {
    in: { symbol: tokenIn.symbol, decimals: tokenIn.decimals },
    out: { symbol: tokenOut.symbol, decimals: tokenOut.decimals },
  });

  const quote = await getSwapQuote({ ...params, tokenIn, tokenOut });
  if (!quote) throw new Error('No pool for this pair and fee tier.');

  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user) throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  const amountInWei = parseUnits(params.amountIn, tokenIn.decimals);
  const pc = getAmmPublicClient();

  devLog('tx/swap', 'spot quote (UI only)', { amountInWei: amountInWei.toString(), quote });

  const allowance = (await readContract(pc, {
    address: tokenIn.address as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [user, CONTRACTS.SwapRouter as Address],
  })) as bigint;

  if (allowance < amountInWei) {
    const router = CONTRACTS.SwapRouter as Address;
    const tokenAddr = tokenIn.address as Address;
    devLog('tx/swap', 'approving router', { need: amountInWei.toString(), allowance: allowance.toString() });

    /**
     * Some tokens (USDT-style) reject `approve(newAmount)` when the current allowance is non-zero.
     * Reset to 0 first, then approve **exactly** this swap amount — friendlier in wallets than max uint256.
     */
    if (allowance > 0n) {
      devLog('tx/swap', 'clearing allowance before new cap', { previous: allowance.toString() });
      await writeApproveWithSimulation(walletClient, pc, user, tokenAddr, router, 0n);
    }
    await writeApproveWithSimulation(walletClient, pc, user, tokenAddr, router, amountInWei);
    devLog('tx/swap', 'approve confirmed for exact swap amount', { amountInWei: amountInWei.toString() });
  }

  // Fail fast if the pool has no liquidity — the swap will always revert in that case.
  const poolForLiq = await getPool(tokenIn.address, tokenOut.address, params.fee);
  if (poolForLiq) {
    const poolLiquidity = (await readContract(pc, {
      address: poolForLiq.address as Address,
      abi: poolAbi,
      functionName: 'liquidity',
    })) as bigint;
    if (poolLiquidity === 0n) {
      throw new Error('This pool has no liquidity. Add liquidity first before swapping.');
    }
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const baseParams = {
    tokenIn: tokenIn.address as Address,
    tokenOut: tokenOut.address as Address,
    fee: params.fee,
    recipient: user,
    deadline,
    amountIn: amountInWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };

  const gasOverrides = {
    gas: GAS.limits.swap,
    maxFeePerGas: GAS.maxFeePerGas,
    maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
  };

  /** Real output at current pool state (tick traversal); spot math in getSwapQuote often overshoots → "Too little received". */
  let simulatedOut: bigint;
  try {
    const dry = await simulateContract(pc, {
      address: CONTRACTS.SwapRouter as Address,
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [baseParams],
      account: user,
      ...gasOverrides,
    });
    simulatedOut = dry.result as bigint;
  } catch (e) {
    devError('tx/swap', 'simulate exactInputSingle (minOut=0) failed', e);
    throw normalizeSwapError(e);
  }

  const bps = swapSlippageBps(params.slippage);
  let amountOutMinWei = (simulatedOut * (10000n - bps)) / 10000n;
  if (simulatedOut > 0n && amountOutMinWei === 0n) amountOutMinWei = 1n;

  const swapSingleParams = { ...baseParams, amountOutMinimum: amountOutMinWei };

  devLog('tx/swap', 'exactInputSingle amounts', {
    simulatedOut: simulatedOut.toString(),
    amountOutMinWei: amountOutMinWei.toString(),
    slippageBps: bps.toString(),
  });

  let hash: `0x${string}`;
  try {
    const { request } = await simulateContract(pc, {
      address: CONTRACTS.SwapRouter as Address,
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [swapSingleParams],
      account: user,
      ...gasOverrides,
    });
    hash = await walletClient.writeContract(request);
  } catch (e) {
    devError('tx/swap', 'simulate/write exactInputSingle failed', e);
    throw normalizeSwapError(e);
  }
  devLog('tx/swap', 'submitted', { hash });
  const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  devLog('tx/swap', 'confirmed', { hash, status: receipt.status, gasUsed: receipt.gasUsed?.toString() });
  return { hash };
}

/** Used by position service for pooled amounts (same math as on-chain mint). */
export async function readPoolSlot0(poolAddress: string): Promise<{ sqrtPriceX96: bigint; tick: number }> {
  const slot = (await readContract(getAmmPublicClient(), {
    address: poolAddress as Address,
    abi: poolAbi,
    functionName: 'slot0',
  })) as PoolSlot0Tuple;
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
