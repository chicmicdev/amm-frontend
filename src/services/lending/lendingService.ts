import { createPublicClient, formatUnits, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { LENDING_CONTRACTS, createBaseSepoliaTransport } from '../../config/lending';
import { LENDING_POOL_ABI, ERC20_ABI, LENDING_ORACLE_ABI } from '../../contracts/lendingAbis';

// ── Public client for Base Sepolia ───────────────────────────────────────────

export const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: createBaseSepoliaTransport(),
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
  /** Reserve configuration flags (from the pool's ReserveConfiguration bitmap). */
  isActive: boolean;
  isFrozen: boolean;
  isPaused: boolean;
  borrowingEnabled: boolean;
  /** Caps in whole token units; '0' means no cap. */
  supplyCap: string;
  borrowCap: string;
  /** Current totals in token units (aToken / variable debt token supply). */
  totalSupplied: string;
  totalBorrowed: string;
}

export interface UserAccountData {
  totalCollateralUSD: string;
  totalDebtUSD:       string;
  availableBorrowsUSD: string;
  healthFactor:       string;
  ltv:                string;
  liquidationThreshold: string;
  /** Weighted-average liquidation threshold as a decimal (e.g. 0.85 for 85%). */
  liquidationThresholdRaw: number;
  /** Full-precision (8 dp) USD values — used for max-safe-withdraw math so
   *  tiny debts (e.g. $0.002273 shown as "$0.00") are not incorrectly treated
   *  as zero and cause HealthFactorLowerThanLiquidationThreshold reverts. */
  totalCollateralUSDFull: string;
  totalDebtUSDFull:       string;
  availableBorrowsUSDFull: string;
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
        configuration: bigint;
        liquidityIndex: bigint;
        lastUpdateTimestamp: number | bigint;
        accruedToTreasury: bigint;
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

      const readTotalSupply = async (token: `0x${string}`) => {
        try {
          const total = await baseSepoliaClient.readContract({
            address: token,
            abi: ERC20_ABI,
            functionName: 'totalSupply',
          }) as bigint;
          return formatUnits(total, decimals as number);
        } catch { return '0'; }
      };
      const [aTokenSupply, totalBorrowed] = await Promise.all([
        readTotalSupply(rd.aTokenAddress),
        readTotalSupply(rd.variableDebtTokenAddress),
      ]);
      // Aave's supply-cap check is (scaledTotalSupply + accruedToTreasury) × nextLiquidityIndex.
      // aToken.totalSupply() already covers the first term, so add the treasury's
      // share (a scaled amount) at the next liquidity index, projected linearly.
      const RAY = 10n ** 27n;
      const YEAR = 31_536_000n;
      const elapsed = BigInt(Math.max(0, Math.floor(Date.now() / 1000) - Number(rd.lastUpdateTimestamp)));
      const nextIndex = rd.liquidityIndex + (rd.liquidityIndex * rd.currentLiquidityRate * elapsed) / (RAY * YEAR);
      const treasuryUnderlying = (rd.accruedToTreasury * nextIndex) / RAY;
      const totalSupplied = formatUnits(
        parseUnits(aTokenSupply as `${number}`, decimals as number) + treasuryUnderlying,
        decimals as number,
      );
      // Aave V3 ReserveConfiguration bitmap layout.
      const cfg = rd.configuration;
      const flag = (bit: bigint) => ((cfg >> bit) & 1n) === 1n;
      const field = (start: bigint, width: bigint) => ((cfg >> start) & ((1n << width) - 1n)).toString();

      return {
        asset,
        symbol: symbol as string,
        isActive: flag(56n),
        isFrozen: flag(57n),
        borrowingEnabled: flag(58n),
        isPaused: flag(60n),
        borrowCap: field(80n, 36n),
        supplyCap: field(116n, 36n),
        totalSupplied,
        totalBorrowed,
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
    // Aave returns threshold in basis points (e.g. 8500 = 85%). Divide by 10000 for decimal.
    liquidationThresholdRaw: Number(currentLiquidationThreshold) / 10000,
    // Full 8-decimal precision — do NOT round to 2 dp here, tiny debts like
    // $0.002273 must not become "0.00" in the max-safe-withdraw calculation.
    totalCollateralUSDFull: formatUnits(totalCollateralBase, 8),
    totalDebtUSDFull:       formatUnits(totalDebtBase, 8),
    availableBorrowsUSDFull: formatUnits(availableBorrowsBase, 8),
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
