import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { LENDING_CONTRACTS, BASE_SEPOLIA_RPC } from '../../config/lending';
import { LENDING_POOL_ABI, ERC20_ABI, LENDING_ORACLE_ABI } from '../../contracts/lendingAbis';

// ── Public client for Base Sepolia ───────────────────────────────────────────

export const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReserveInfo {
  asset: `0x${string}`;
  symbol: string;
  decimals: number;
  supplyAPY: string;             // formatted % e.g. "3.42"
  borrowAPY: string;             // formatted % e.g. "5.10"
  aTokenAddress: `0x${string}`;
  variableDebtTokenAddress: `0x${string}`;
  availableLiquidity: string;    // token units
  priceUSD: string;              // USD price per token (8-decimal oracle, converted to float string)
}

export interface UserAccountData {
  totalCollateralUSD: string;
  totalDebtUSD:       string;
  availableBorrowsUSD: string;
  healthFactor:       string;
  ltv:                string;
  liquidationThreshold: string;
}

// RAY = 1e27 — pool stores rates in Ray units
const RAY = BigInt('1000000000000000000000000000');

/**
 * Convert RAY rate → human-readable APY %.
 *
 * Pool stores `currentLiquidityRate` / `currentVariableBorrowRate` as
 * annual rates in RAY (1e27 = 100 % per year).
 * Formula: APY% = rayRate / RAY * 100
 */
function rayToAPY(rayRate: bigint): string {
  const bp = rayRate * 10000n / RAY;
  const whole = bp / 100n;
  const frac  = bp % 100n;
  return `${whole}.${frac.toString().padStart(2, '0')}`;
}

// ── Fetch all reserves ───────────────────────────────────────────────────────

export async function fetchLendingReserves(): Promise<ReserveInfo[]> {
  const reserveAddresses = await baseSepoliaClient.readContract({
    address: LENDING_CONTRACTS.POOL,
    abi: LENDING_POOL_ABI,
    functionName: 'getReservesList',
  }) as `0x${string}`[];

  const settledReserves = await Promise.allSettled(
    reserveAddresses.map(async (asset) => {
      const [reserveData, symbol, decimals] = await Promise.all([
        baseSepoliaClient.readContract({
          address: LENDING_CONTRACTS.POOL,
          abi: LENDING_POOL_ABI,
          functionName: 'getReserveData',
          args: [asset],
        }),
        baseSepoliaClient.readContract({
          address: asset,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        baseSepoliaClient.readContract({
          address: asset,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      const rd = reserveData as {
        currentLiquidityRate: bigint;
        currentVariableBorrowRate: bigint;
        aTokenAddress: `0x${string}`;
        variableDebtTokenAddress: `0x${string}`;
      };

      let availableLiquidity = '0';
      try {
        const liq = await baseSepoliaClient.readContract({
          address: asset,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [rd.aTokenAddress],
        }) as bigint;
        availableLiquidity = formatUnits(liq, decimals as number);
      } catch { /* ignore */ }

      return {
        asset,
        symbol: symbol as string,
        decimals: decimals as number,
        supplyAPY: rayToAPY(rd.currentLiquidityRate),
        borrowAPY: rayToAPY(rd.currentVariableBorrowRate),
        aTokenAddress: rd.aTokenAddress,
        variableDebtTokenAddress: rd.variableDebtTokenAddress,
        availableLiquidity,
        priceUSD: '0',
      } satisfies ReserveInfo;
    })
  );

  const reserves = settledReserves
    .filter((r): r is PromiseFulfilledResult<ReserveInfo> => r.status === 'fulfilled')
    .map(r => r.value);

  try {
    const assetAddresses = reserves.map(r => r.asset);
    const rawPrices = await baseSepoliaClient.readContract({
      address: LENDING_CONTRACTS.ORACLE,
      abi: LENDING_ORACLE_ABI,
      functionName: 'getAssetsPrices',
      args: [assetAddresses],
    }) as bigint[];

    rawPrices.forEach((price, i) => {
      reserves[i].priceUSD = formatUnits(price, 8);
    });
  } catch { /* prices stay '0' if oracle fails */ }

  return reserves;
}

// ── Fetch user account summary ───────────────────────────────────────────────

export async function fetchUserAccountData(userAddress: `0x${string}`): Promise<UserAccountData> {
  const data = await baseSepoliaClient.readContract({
    address: LENDING_CONTRACTS.POOL,
    abi: LENDING_POOL_ABI,
    functionName: 'getUserAccountData',
    args: [userAddress],
  }) as readonly [bigint, bigint, bigint, bigint, bigint, bigint];

  const [
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  ] = data;

  // Base currency is USD with 8 decimals
  const fmt8 = (v: bigint) => Number(formatUnits(v, 8)).toFixed(2);
  const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

  return {
    totalCollateralUSD:   fmt8(totalCollateralBase),
    totalDebtUSD:         fmt8(totalDebtBase),
    availableBorrowsUSD:  fmt8(availableBorrowsBase),
    healthFactor:
      healthFactor === MAX_UINT256
        ? '∞'
        : Number(formatUnits(healthFactor, 18)).toFixed(2),
    ltv:                  (Number(ltv) / 100).toFixed(0) + '%',
    liquidationThreshold: (Number(currentLiquidationThreshold) / 100).toFixed(0) + '%',
  };
}

// ── Fetch user balance for a specific aToken (how much they've supplied) ─────

export async function fetchATokenBalance(
  aTokenAddress: `0x${string}`,
  userAddress: `0x${string}`,
  decimals: number,
): Promise<string> {
  const bal = await baseSepoliaClient.readContract({
    address: aTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;
  return formatUnits(bal, decimals);
}

// ── Fetch user variable debt balance for a reserve (how much they've borrowed) ─

export async function fetchDebtTokenBalance(
  variableDebtTokenAddress: `0x${string}`,
  userAddress: `0x${string}`,
  decimals: number,
): Promise<string> {
  const bal = await baseSepoliaClient.readContract({
    address: variableDebtTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;
  return formatUnits(bal, decimals);
}

// ── Fetch wallet ERC-20 balance for a reserve asset ──────────────────────────

export async function fetchWalletTokenBalance(
  asset: `0x${string}`,
  userAddress: `0x${string}`,
  decimals: number,
): Promise<string> {
  const bal = await baseSepoliaClient.readContract({
    address: asset,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;
  return formatUnits(bal, decimals);
}
