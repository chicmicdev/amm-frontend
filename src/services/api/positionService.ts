/**
 * Positions — NonfungiblePositionManager (AMM_v3 periphery): mint, decrease, collect, burn.
 */
import {
  decodeEventLog,
  formatUnits,
  maxUint256,
  parseUnits,
  zeroAddress,
  parseAbiItem,
  type Address,
} from "viem";
import { readContract, writeContract, simulateContract } from "viem/actions";
import {
  waitForTransactionReceipt,
  getWalletClient,
  getAccount,
  getPublicClient,
} from "wagmi/actions";
import { CHAIN_ID, CONTRACTS, GAS } from "../../config/contracts";
import type { Position, MintParams, Token } from "../../types";
import { getListedTokenMeta } from "../../config/tokens";
import {
  factoryAbi,
  positionManagerAbi,
  erc20Abi,
  erc721Abi,
} from "../../contracts/abis";
import type {
  Erc721TransferArgs,
  NpmPositionsTuple,
} from "../../contracts/viemReadTypes";
import { tickToPrice, isInRange } from "../../utils/tickUtils";
import { devLog, devError } from "../../utils/devLog";
import { collectViemErrorText } from "../../utils/viemErrors";
import {
  getAmmPublicClient,
  positionTokenAmounts,
  readPoolSlot0,
} from "./poolService";
import { ammWagmiConfig } from "./ammClient";
import { fetchTokenDecimals, mergeTokenDecimals } from "./tokenMetadata";

const config = ammWagmiConfig;

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

function normalizeMintError(err: unknown): Error {
  const text = collectViemErrorText(err);
  if (/Invalid token ID/i.test(text)) {
    return new Error(
      "Mint reverted with Invalid token ID — common cause is NonfungiblePositionManager `mint` reading `positions(tokenId)` before the position is stored. Use an NPM deployment that reads fee growth from the pool position, or adjust mint ordering in Solidity outside this workspace (contracts here are not edited per project rules)."
    );
  }
  if (/Internal JSON-RPC error|InternalRpcError/i.test(text)) {
    return new Error(
      "RPC hid the revert reason. Common causes: token amounts do not match pool price (re-enter amounts after the pool loads), insufficient balance, or an invalid price band — try Full range. You can also switch Amoy RPC (VITE_POLYGON_AMOY_RPC)."
    );
  }
  if (err instanceof Error) return err;
  return new Error(text || "Add liquidity failed");
}

async function tokenMeta(addr: string): Promise<Token> {
  const listed = getListedTokenMeta(addr);
  const dec = await fetchTokenDecimals(addr);
  if (listed) return { ...listed, decimals: dec };
  return {
    address: addr,
    symbol: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    name: "Unknown",
    decimals: dec,
    logoColor: "#8b949e",
  };
}

async function poolAddressFor(
  token0: string,
  token1: string,
  fee: number,
): Promise<Address | null> {
  const addr = (await readContract(getAmmPublicClient(), {
    address: CONTRACTS.Factory as Address,
    abi: factoryAbi,
    functionName: "getPool",
    args: [token0 as Address, token1 as Address, fee],
  })) as Address;
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
    toBlock: "latest",
  });

  logs.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    if (bn !== 0) return bn;
    return Number(a.logIndex - b.logIndex);
  });

  const u = user.toLowerCase();
  const owned = new Set<string>();
  for (const log of logs) {
    const args = log.args as Erc721TransferArgs | undefined;
    if (!args?.from || !args?.to || args.tokenId === undefined) continue;
    const id = args.tokenId.toString();
    if (args.from.toLowerCase() === u) owned.delete(id);
    if (args.to.toLowerCase() === u) owned.add(id);
  }
  return [...owned].map((id) => BigInt(id));
}

async function buildPosition(tokenId: bigint): Promise<Position | null> {
  const row = (await readContract(getAmmPublicClient(), {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "positions",
    args: [tokenId],
  })) as NpmPositionsTuple;

  const [
    ,
    ,
    t0,
    t1,
    fee,
    tickLower,
    tickUpper,
    liquidity,
    ,
    ,
    tokensOwed0,
    tokensOwed1,
  ] = row;
  if (liquidity === 0n && tokensOwed0 === 0n && tokensOwed1 === 0n) {
    return null;
  }

  const poolAddr = await poolAddressFor(t0, t1, fee);
  if (!poolAddr) return null;

  const { sqrtPriceX96, tick } = await readPoolSlot0(poolAddr);
  const { amount0, amount1 } = positionTokenAmounts(
    sqrtPriceX96,
    tickLower,
    tickUpper,
    liquidity,
  );

  const [tok0, tok1] = await Promise.all([tokenMeta(t0), tokenMeta(t1)]);
  const dec0 = tok0.decimals;
  const dec1 = tok1.decimals;

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

export async function getUserPositions(
  walletAddress: string,
): Promise<Position[]> {
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

export async function addLiquidity(
  params: MintParams,
): Promise<{ hash: string; tokenId: number }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user)
    throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  const a0 = params.token0.address.toLowerCase();
  const a1 = params.token1.address.toLowerCase();
  const swapped = a0 > a1;
  const mintToken0 = (swapped ? params.token1 : params.token0) as Token;
  const mintToken1 = (swapped ? params.token0 : params.token1) as Token;
  const raw0 = swapped ? params.amount1Desired : params.amount0Desired;
  const raw1 = swapped ? params.amount0Desired : params.amount1Desired;

  const [mt0, mt1] = await Promise.all([
    mergeTokenDecimals(mintToken0),
    mergeTokenDecimals(mintToken1),
  ]);
  devLog("tx/mint", "decimals", {
    t0: mt0.symbol,
    d0: mt0.decimals,
    t1: mt1.symbol,
    d1: mt1.decimals,
  });

  const amount0Desired = parseUnits(raw0, mt0.decimals);
  const amount1Desired = parseUnits(raw1, mt1.decimals);

  for (const t of [mt0, mt1]) {
    const allowance = (await readContract(getAmmPublicClient(), {
      address: t.address as Address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [user, CONTRACTS.NonfungiblePositionManager as Address],
    })) as bigint;
    const need =
      t.address.toLowerCase() === mt0.address.toLowerCase()
        ? amount0Desired
        : amount1Desired;
    if (allowance < need) {
      devLog("tx/mint", "approving NPM", {
        token: t.address,
        need: need.toString(),
        allowance: allowance.toString(),
      });
      const approveHash = await writeContract(walletClient, {
        address: t.address as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACTS.NonfungiblePositionManager as Address, maxUint256],
        gas: GAS.limits.approve,
        maxFeePerGas: GAS.maxFeePerGas,
        maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
      });
      const ar = await waitForTransactionReceipt(config, {
        hash: approveHash,
        chainId: CHAIN_ID,
      });
      devLog("tx/mint", "approve confirmed", {
        hash: approveHash,
        status: ar.status,
      });
    }
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  devLog("tx/mint", "mint", {
    token0: mt0.address,
    token1: mt1.address,
    fee: params.fee,
    tickLower: params.tickLower,
    tickUpper: params.tickUpper,
    deadline: deadline.toString(),
  });
  const mintArgs = {
    token0: mt0.address as Address,
    token1: mt1.address as Address,
    fee: params.fee,
    tickLower: params.tickLower,
    tickUpper: params.tickUpper,
    amount0Desired,
    amount1Desired,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: user,
    deadline,
  };

  let hash: `0x${string}`;
  try {
    devLog("tx/mint", "simulate mint", mintArgs);
    const { request } = await simulateContract(getAmmPublicClient(), {
      address: CONTRACTS.NonfungiblePositionManager as Address,
      abi: positionManagerAbi,
      functionName: "mint",
      args: [mintArgs],
      account: user,
      gas: GAS.limits.mint,
      maxFeePerGas: GAS.maxFeePerGas,
      maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
    });
    hash = await walletClient.writeContract(request);
    devLog("tx/mint", "submitted", { hash });
    const receipt = await waitForTransactionReceipt(config, {
      hash,
      chainId: CHAIN_ID,
    });
    devLog("tx/mint", "confirmed", {
      hash,
      status: receipt.status,
      gasUsed: receipt.gasUsed?.toString(),
    });
    let tokenId = 0;
    const nm = CONTRACTS.NonfungiblePositionManager.toLowerCase();
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== nm) continue;
      try {
        const decoded = decodeEventLog({
          abi: erc721Abi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "Transfer") continue;
        const ta = decoded.args as Erc721TransferArgs | undefined;
        if (
          ta &&
          ta.from === zeroAddress &&
          ta.to?.toLowerCase() === user.toLowerCase()
        ) {
          const id = Number(ta.tokenId);
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
  } catch (error) {
    devError("tx/mint", "simulate/write mint failed", error);
    throw normalizeMintError(error);
  }
}

export async function removeLiquidity(
  tokenId: number,
  liquidityPercent: number,
): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user)
    throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  const row = (await readContract(getAmmPublicClient(), {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "positions",
    args: [BigInt(tokenId)],
  })) as NpmPositionsTuple;
  const liquidity = row[7];
  const pct = BigInt(Math.min(100, Math.max(1, liquidityPercent)));
  const liqRemove = (liquidity * pct) / 100n;
  if (liqRemove === 0n) throw new Error("Nothing to remove");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  devLog("tx/remove", "decreaseLiquidity", {
    tokenId,
    liquidityPercent,
    liqRemove: liqRemove.toString(),
    deadline: deadline.toString(),
  });
  const decHash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "decreaseLiquidity",
    args: [
      {
        tokenId: BigInt(tokenId),
        liquidity: liqRemove,
        amount0Min: 0n,
        amount1Min: 0n,
        deadline,
      },
    ],
    gas: GAS.limits.decreaseLiquidity,
    maxFeePerGas: GAS.maxFeePerGas,
    maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
  });
  const decRc = await waitForTransactionReceipt(config, {
    hash: decHash,
    chainId: CHAIN_ID,
  });
  devLog("tx/remove", "decrease confirmed", {
    hash: decHash,
    status: decRc.status,
  });

  devLog("tx/remove", "collect", { tokenId });
  const collectHash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "collect",
    args: [
      {
        tokenId: BigInt(tokenId),
        recipient: user,
        amount0Max: 2n ** 128n - 1n,
        amount1Max: 2n ** 128n - 1n,
      },
    ],
    gas: GAS.limits.collect,
    maxFeePerGas: GAS.maxFeePerGas,
    maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
  });
  const colRc = await waitForTransactionReceipt(config, {
    hash: collectHash,
    chainId: CHAIN_ID,
  });
  devLog("tx/remove", "collect confirmed", {
    hash: collectHash,
    status: colRc.status,
  });

  if (liquidityPercent >= 100) {
    const after = (await readContract(getAmmPublicClient(), {
      address: CONTRACTS.NonfungiblePositionManager as Address,
      abi: positionManagerAbi,
      functionName: "positions",
      args: [BigInt(tokenId)],
    })) as NpmPositionsTuple;
    const liqLeft = after[7];
    const owed0 = after[10];
    const owed1 = after[11];
    if (liqLeft === 0n && owed0 === 0n && owed1 === 0n) {
      devLog("tx/remove", "burn", { tokenId });
      const burnHash = await writeContract(walletClient, {
        address: CONTRACTS.NonfungiblePositionManager as Address,
        abi: positionManagerAbi,
        functionName: "burn",
        args: [BigInt(tokenId)],
        gas: GAS.limits.burn,
        maxFeePerGas: GAS.maxFeePerGas,
        maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
      });
      const burnRc = await waitForTransactionReceipt(config, {
        hash: burnHash,
        chainId: CHAIN_ID,
      });
      devLog("tx/remove", "burn confirmed", {
        hash: burnHash,
        status: burnRc.status,
      });
      return { hash: burnHash };
    }
  }

  return { hash: collectHash };
}

export async function collectFees(
  tokenId: number,
  recipientAddress: string,
): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  if (!walletClient)
    throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  devLog("tx/collect", "collect", { tokenId, recipientAddress });
  const hash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "collect",
    args: [
      {
        tokenId: BigInt(tokenId),
        recipient: recipientAddress as Address,
        amount0Max: 2n ** 128n - 1n,
        amount1Max: 2n ** 128n - 1n,
      },
    ],
    gas: GAS.limits.collect,
    maxFeePerGas: GAS.maxFeePerGas,
    maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
  });
  const cr = await waitForTransactionReceipt(config, {
    hash,
    chainId: CHAIN_ID,
  });
  devLog("tx/collect", "confirmed", { hash, status: cr.status });
  return { hash };
}

export async function increaseLiquidity(
  tokenId: number,
  amount0: string,
  amount1: string,
): Promise<{ hash: string }> {
  const walletClient = await getWalletClient(config, { chainId: CHAIN_ID });
  const { address: user } = getAccount(config);
  if (!walletClient || !user)
    throw new Error(`Connect a wallet on the AMM network (chain ${CHAIN_ID}).`);

  const row = (await readContract(getAmmPublicClient(), {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "positions",
    args: [BigInt(tokenId)],
  })) as NpmPositionsTuple;
  const t0 = row[2];
  const t1 = row[3];

  const [tok0, tok1] = await Promise.all([tokenMeta(t0), tokenMeta(t1)]);
  const amt0 = parseUnits(amount0, tok0.decimals);
  const amt1 = parseUnits(amount1, tok1.decimals);
  devLog("tx/increase", "amounts", {
    tokenId,
    amt0: amt0.toString(),
    amt1: amt1.toString(),
    d0: tok0.decimals,
    d1: tok1.decimals,
  });

  for (const [addr, amt] of [
    [t0, amt0],
    [t1, amt1],
  ] as const) {
    if (amt === 0n) continue;
    const allowance = (await readContract(getAmmPublicClient(), {
      address: addr,
      abi: erc20Abi,
      functionName: "allowance",
      args: [user, CONTRACTS.NonfungiblePositionManager as Address],
    })) as bigint;
    if (allowance < amt) {
      const approveHash = await writeContract(walletClient, {
        address: addr,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACTS.NonfungiblePositionManager as Address, maxUint256],
        gas: GAS.limits.approve,
        maxFeePerGas: GAS.maxFeePerGas,
        maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
      });
      await waitForTransactionReceipt(config, {
        hash: approveHash,
        chainId: CHAIN_ID,
      });
    }
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  devLog("tx/increase", "increaseLiquidity", {
    tokenId,
    deadline: deadline.toString(),
  });
  const hash = await writeContract(walletClient, {
    address: CONTRACTS.NonfungiblePositionManager as Address,
    abi: positionManagerAbi,
    functionName: "increaseLiquidity",
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
    gas: GAS.limits.increaseLiquidity,
    maxFeePerGas: GAS.maxFeePerGas,
    maxPriorityFeePerGas: GAS.maxPriorityFeePerGas,
  });
  const ir = await waitForTransactionReceipt(config, {
    hash,
    chainId: CHAIN_ID,
  });
  devLog("tx/increase", "confirmed", { hash, status: ir.status });
  return { hash };
}
