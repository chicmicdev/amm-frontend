/**
 * Positions — NonfungiblePositionManager (AMM_v3 periphery): mint, decrease, collect, burn.
 */
import { decodeEventLog, formatUnits, maxUint256, parseUnits, zeroAddress, parseAbiItem, type Address } from 'viem';
import { readContract, writeContract } from 'viem/actions';
import { waitForTransactionReceipt, getWalletClient, getAccount, getPublicClient } from 'wagmi/actions';
import { wagmiAdapter } from '../../config/reown';
import { CHAIN_ID, CONTRACTS } from '../../config/contracts';
import type { Position, MintParams } from '../../types';
import { TOKEN_MAP } from '../../config/tokens';
import { factoryAbi, positionManagerAbi, erc20Abi, erc721Abi } from '../../contracts/abis';
import { tickToPrice, isInRange } from '../../utils/tickUtils';
import { getAmmPublicClient, positionTokenAmounts, readPoolSlot0 } from './poolService';

const config = wagmiAdapter.wagmiConfig;

const transferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);

function tokenMeta(addr: string) {
  const t = TOKEN_MAP[addr.toLowerCase()];
  if (t) return t;
  return {
    address: addr,
    symbol: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    name: 'Unknown',
    decimals: 18,
    logoColor: '#8b949e',
  };
}

async function poolAddressFor(token0: string, token1: string, fee: number): Promise<Address | null> {
  const addr = await readContract(getAmmPublicClient(), {
    address: CONTRACTS.Factory as Address,
    abi: factoryAbi,
    functionName: 'getPool',
    args: [token0 as Address, token1 as Address, fee],
  });
  if (!addr || addr === zeroAddress) return null;
  return addr;
}

async function ownedPositionTokenIds(user: Address): Promise<bigint[]> {
  const pc = getPublicClient(config, { chainId: CHAIN_ID });
  if (!pc) return [];

  const logs = await pc.getLogs({
    address: CONTRACTS.NonfungiblePositionManager as Address,
    event: transferEvent,
    fromBlock: 0n,
    toBlock: 'latest',
  });

  logs.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    if (bn !== 0) return bn;
    return Number(a.logIndex - b.logIndex);
  });

  const u = user.toLowerCase();
  const owned = new Set<string>();
  for (const log of logs) {
    const args = log.args;
    if (!args?.from || !args?.to || args.tokenId === undefined) continue;
    const id = args.tokenId.toString();
    if (args.from.toLowerCase() === u) owned.delete(id);
    if (args.to.toLowerCase() === u) owned.add(id);
  }
  return [...owned].map(id => BigInt(id));
}

async function buildPosition(tokenId: bigint): Promise<Position | null> {
  const row = await readContract(getAmmPublicClient(), {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'positions',
    args: [tokenId],
  });

  const [, , t0, t1, fee, tickLower, tickUpper, liquidity, , , tokensOwed0, tokensOwed1] = row;
  if (liquidity === 0n && tokensOwed0 === 0n && tokensOwed1 === 0n) {
    return null;
  }

  const poolAddr = await poolAddressFor(t0, t1, fee);
  if (!poolAddr) return null;

  const { sqrtPriceX96, tick } = await readPoolSlot0(poolAddr);
  const { amount0, amount1 } = positionTokenAmounts(sqrtPriceX96, tickLower, tickUpper, liquidity);

  const dec0 = tokenMeta(t0).decimals;
  const dec1 = tokenMeta(t1).decimals;
  const tok0 = tokenMeta(t0);
  const tok1 = tokenMeta(t1);

  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);
  const currentPrice = tickToPrice(tick);

  return {
    tokenId: Number(tokenId),
    token0: tok0,
    token1: tok1,
    fee,
    tickLower,
    tickUpper,
    liquidity: liquidity.toString(),
    tokensOwed0: tokensOwed0.toString(),
    tokensOwed1: tokensOwed1.toString(),
    priceLower,
    priceUpper,
    currentPrice,
    inRange: isInRange(tick, tickLower, tickUpper),
    amount0: Number(formatUnits(amount0, dec0)),
    amount1: Number(formatUnits(amount1, dec1)),
    unclaimedFees0: Number(formatUnits(tokensOwed0, dec0)),
    unclaimedFees1: Number(formatUnits(tokensOwed1, dec1)),
  };
}

export async function getUserPositions(walletAddress: string): Promise<Position[]> {
  const ids = await ownedPositionTokenIds(walletAddress as Address);
  const out: Position[] = [];
  for (const id of ids) {
    try {
      const p = await buildPosition(id);
      if (p) out.push(p);
    } catch {
      /* burned NFT or stale log index */
    }
  }
  return out.sort((a, b) => b.tokenId - a.tokenId);
}

export async function getPosition(tokenId: number): Promise<Position | null> {
  return buildPosition(BigInt(tokenId));
}

export async function addLiquidity(params: MintParams): Promise<{ hash: string; tokenId: number }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user) throw new Error('Connect a wallet on the AMM network (chain 31337).');

  const a0 = params.token0.address.toLowerCase();
  const a1 = params.token1.address.toLowerCase();
  const swapped = a0 > a1;
  const mintToken0 = (swapped ? params.token1 : params.token0) as import('../../types').Token;
  const mintToken1 = (swapped ? params.token0 : params.token1) as import('../../types').Token;
  const raw0 = swapped ? params.amount1Desired : params.amount0Desired;
  const raw1 = swapped ? params.amount0Desired : params.amount1Desired;

  const amount0Desired = parseUnits(raw0, mintToken0.decimals);
  const amount1Desired = parseUnits(raw1, mintToken1.decimals);

  for (const t of [mintToken0, mintToken1]) {
    const allowance = await readContract(getAmmPublicClient(), {
      address: t.address as Address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [user, CONTRACTS.NonfungiblePositionManager as Address],
    });
    const need = t.address.toLowerCase() === mintToken0.address.toLowerCase() ? amount0Desired : amount1Desired;
    if (allowance < need) {
      const approveHash = await writeContract(walletClient, {
        address: t.address as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.NonfungiblePositionManager as Address, maxUint256],
      });
      await waitForTransactionReceipt(config, { hash: approveHash, chainId: CHAIN_ID });
    }
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const hash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'mint',
    args: [
      {
        token0: mintToken0.address as Address,
        token1: mintToken1.address as Address,
        fee: params.fee,
        tickLower: params.tickLower,
        tickUpper: params.tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min: 0n,
        amount1Min: 0n,
        recipient: user,
        deadline,
      },
    ],
  });

  const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  let tokenId = 0;
  const nm = CONTRACTS.NonfungiblePositionManager.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== nm) continue;
    try {
      const decoded = decodeEventLog({ abi: erc721Abi, data: log.data, topics: log.topics });
      if (
        decoded.eventName === 'Transfer'
        && decoded.args.from === zeroAddress
        && decoded.args.to?.toLowerCase() === user.toLowerCase()
      ) {
        const id = Number(decoded.args.tokenId);
        if (id > tokenId) tokenId = id;
      }
    } catch {
      /* not Transfer */
    }
  }
  if (tokenId === 0) {
    const positions = await getUserPositions(user);
    tokenId = positions[0]?.tokenId ?? 0;
  }
  return { hash, tokenId };
}

export async function removeLiquidity(tokenId: number, liquidityPercent: number): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user) throw new Error('Connect a wallet on the AMM network (chain 31337).');

  const row = await readContract(getAmmPublicClient(), {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'positions',
    args: [BigInt(tokenId)],
  });
  const liquidity = row[7];
  const pct = BigInt(Math.min(100, Math.max(1, liquidityPercent)));
  const liqRemove = (liquidity * pct) / 100n;
  if (liqRemove === 0n) throw new Error('Nothing to remove');

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  const decHash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'decreaseLiquidity',
    args: [
      {
        tokenId: BigInt(tokenId),
        liquidity: liqRemove,
        amount0Min: 0n,
        amount1Min: 0n,
        deadline,
      },
    ],
  });
  await waitForTransactionReceipt(config, { hash: decHash, chainId: CHAIN_ID });

  const collectHash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'collect',
    args: [
      {
        tokenId: BigInt(tokenId),
        recipient: user,
        amount0Max: 2n ** 128n - 1n,
        amount1Max: 2n ** 128n - 1n,
      },
    ],
  });
  await waitForTransactionReceipt(config, { hash: collectHash, chainId: CHAIN_ID });

  if (liquidityPercent >= 100) {
    const after = await readContract(getAmmPublicClient(), {
      address: CONTRACTS.NonfungiblePositionManager as Address,
      abi: positionManagerAbi,
      functionName: 'positions',
      args: [BigInt(tokenId)],
    });
    const liqLeft = after[7];
    const owed0 = after[10];
    const owed1 = after[11];
    if (liqLeft === 0n && owed0 === 0n && owed1 === 0n) {
      const burnHash = await writeContract(walletClient, {
        address: CONTRACTS.NonfungiblePositionManager as Address,
        abi: positionManagerAbi,
        functionName: 'burn',
        args: [BigInt(tokenId)],
      });
      await waitForTransactionReceipt(config, { hash: burnHash, chainId: CHAIN_ID });
      return { hash: burnHash };
    }
  }

  return { hash: collectHash };
}

export async function collectFees(tokenId: number, recipientAddress: string): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  if (!walletClient) throw new Error('Connect a wallet on the AMM network (chain 31337).');

  const hash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'collect',
    args: [
      {
        tokenId: BigInt(tokenId),
        recipient: recipientAddress as Address,
        amount0Max: 2n ** 128n - 1n,
        amount1Max: 2n ** 128n - 1n,
      },
    ],
  });
  await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  return { hash };
}

export async function increaseLiquidity(
  tokenId: number,
  amount0: string,
  amount1: string
): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user) throw new Error('Connect a wallet on the AMM network (chain 31337).');

  const row = await readContract(getAmmPublicClient(), {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'positions',
    args: [BigInt(tokenId)],
  });
  const t0 = row[2];
  const t1 = row[3];

  const amt0 = parseUnits(amount0, tokenMeta(t0).decimals);
  const amt1 = parseUnits(amount1, tokenMeta(t1).decimals);

  for (const [addr, amt] of [
    [t0, amt0],
    [t1, amt1],
  ] as const) {
    if (amt === 0n) continue;
    const allowance = await readContract(getAmmPublicClient(), {
      address: addr,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [user, CONTRACTS.NonfungiblePositionManager as Address],
    });
    if (allowance < amt) {
      const approveHash = await writeContract(walletClient, {
        address: addr,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.NonfungiblePositionManager as Address, maxUint256],
      });
      await waitForTransactionReceipt(config, { hash: approveHash, chainId: CHAIN_ID });
    }
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const hash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: 'increaseLiquidity',
    args: [
      {
        tokenId: BigInt(tokenId),
        amount0Desired: amt0,
        amount1Desired: amt1,
        amount0Min: 0n,
        amount1Min: 0n,
        deadline,
      },
    ],
  });
  await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
  return { hash };
}
