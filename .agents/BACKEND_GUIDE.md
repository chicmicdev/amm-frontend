# ⚙️ Backend Developer Guide — AMM v3

> **Who this is for:** Backend/Node.js developers working with the AMM v3 smart contract infrastructure. No prior Uniswap knowledge assumed.

---

## 📚 Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Core Concepts You Must Know](#2-core-concepts-you-must-know)
3. [Project Structure](#3-project-structure)
4. [Smart Contracts — What Each One Does](#4-smart-contracts--what-each-one-does)
5. [How the Contracts Connect (Internal Flow)](#5-how-the-contracts-connect-internal-flow)
6. [Development Environment Setup](#6-development-environment-setup)
7. [Deployment Guide](#7-deployment-guide)
8. [Interacting with Contracts via Scripts](#8-interacting-with-contracts-via-scripts)
9. [Testing](#9-testing)
10. [Key Mathematical Concepts](#10-key-mathematical-concepts)
11. [Event Indexing (for APIs & Databases)](#11-event-indexing-for-apis--databases)
12. [Security Considerations](#12-security-considerations)

---

## 1. What Is This Project?

This is a **v3-style Automated Market Maker (AMM)** — a type of decentralized exchange protocol implemented as a set of Ethereum smart contracts.

### The Two Main User Groups:

**Liquidity Providers (LPs):**  
Deposit pairs of tokens into "pools." They earn a percentage of every trade that happens in the pool. In V3, they specify a **price range** so their capital is only active when the price is within that range.

**Traders (Swappers):**  
Use the pools to exchange one token for another. They pay a small fee that goes entirely to the LPs.

### How Price Is Determined:
No humans set prices. The price is maintained by the mathematical relationship between how many of each token is in the pool. As traders buy/sell, the price shifts automatically via the **constant product formula** variant with concentrated liquidity.

### What Makes This a "V3" AMM:
- **Concentrated Liquidity:** LPs set a price range (`tickLower` to `tickUpper`). Liquidity is only active inside that range — far more capital-efficient than spreading liquidity everywhere.
- **Multiple Fee Tiers:** Pools exist per fee tier (0.05%, 0.3%, 1%).
- **NFT Positions:** Each LP position is tracked as a unique ERC-721 NFT, not a fungible token.

---

## 2. Core Concepts You Must Know

### Ticks
The price space is divided into discrete steps called **ticks**. Each tick represents a price of `1.0001^tick`.
- Tick range: `-887272` to `887272`
- Each fee tier has a `tickSpacing` — valid ticks must be multiples of this value.

| Fee | tickSpacing | Price step per tick |
|-----|------------|---------------------|
| 500 (0.05%) | 10 | ~0.1% |
| 3000 (0.3%) | 60 | ~0.6% |
| 10000 (1%) | 200 | ~2% |

### sqrtPriceX96
Price is stored as `√price × 2^96`. This is for precision and to avoid floating-point.

To convert:
```js
// sqrtPriceX96 → price (token1 per token0)
const price = (Number(sqrtPriceX96) / 2**96) ** 2;

// price → sqrtPriceX96
const sqrtPriceX96 = BigInt(Math.sqrt(price) * 2**96);
```

### Liquidity (L)
Not the same as "amount of tokens deposited." Liquidity `L` is a virtual unit representing the depth of the market at a given price. The amount of real tokens corresponding to `L` depends on the current price and the position's tick range.

### Position Key
Each LP position inside the pool is identified by:
```
keccak256(abi.encodePacked(owner, tickLower, tickUpper))
```
This is computed internally — you only need `tickLower` and `tickUpper` when calling the contracts.

### Pool Address
Every pool has a deterministic address computed via CREATE2:
```js
// Computed from: factory address + keccak256(token0, token1, fee)
const poolAddress = await factory.getPool(token0, token1, fee);
```

### WETH9
The Wrapped ETH contract. ETH cannot be used directly in ERC-20 flows, so it's wrapped. WETH9 is deployed alongside the other contracts.

---

## 3. Project Structure

```
AMM_v3/
├── contracts/
│   ├── core/
│   │   ├── UniswapV3Factory.sol     ← Creates and registers pools
│   │   └── UniswapV3Pool.sol        ← Core pool logic (price, liquidity, swaps)
│   ├── periphery/
│   │   ├── SwapRouter.sol           ← Entry point for swaps
│   │   ├── NonfungiblePositionManager.sol  ← LP positions + NFT minting
│   │   ├── PeripheryPayments.sol    ← Token payment utilities
│   │   └── ERC721.sol               ← Base NFT contract
│   ├── libraries/
│   │   ├── Tick.sol                 ← Tick state management
│   │   ├── TickMath.sol             ← Tick ↔ sqrt price conversion
│   │   ├── Position.sol             ← Position state tracking
│   │   ├── SqrtPriceMath.sol        ← Token amount ↔ liquidity math
│   │   ├── SwapMath.sol             ← Single-step swap computation
│   │   ├── FullMath.sol             ← 256-bit precision math
│   │   ├── SafeCast.sol             ← Safe numeric casting
│   │   └── FixedPoint128.sol        ← Q128 fixed-point constant
│   ├── interfaces/                  ← All contract interfaces (ABIs)
│   └── test/
│       ├── TestERC20.sol            ← Mintable test token
│       └── WETH9.sol                ← Wrapped ETH
├── scripts/
│   ├── deploy.mjs                   ← Full deployment script
│   └── complete-test.mjs            ← End-to-end test script
├── deployments/
│   └── latest.json                  ← Last deployment addresses
├── test/                            ← Hardhat test files
├── hardhat.config.ts                ← Hardhat configuration
└── package.json
```

---

## 4. Smart Contracts — What Each One Does

### `UniswapV3Factory.sol` — Pool Registry & Creator

**Role:** The single entry point for creating pools. Maintains a registry of all deployed pools.

**State:**
```solidity
// Tracks valid fee tiers
mapping(uint24 => int24) public feeAmountTickSpacing;

// Pool lookup: token0 → token1 → fee → pool address
mapping(address => mapping(address => mapping(uint24 => address))) public getPool;
```

**Key functions:**

| Function | Description |
|----------|-------------|
| `createPool(tokenA, tokenB, fee)` | Deploys a new pool via CREATE2. Tokens are sorted so `token0 < token1`. Sets pool parameters via a temporary `parameters` struct. |
| `getPool(token0, token1, fee)` | Returns pool address or `address(0)` if it doesn't exist |
| `enableFeeAmount(fee, tickSpacing)` | Owner only — add support for a new fee tier |
| `setOwner(address)` | Transfer factory ownership |

**Deployment preconditions:**
- No preconditions. Deploys standalone.
- After deployment, it auto-configures 3 fee tiers (500/3000/10000).

---

### `UniswapV3Pool.sol` — Core Pool

**Role:** Holds token reserves, tracks price and liquidity, executes swaps and minting.

**Immutable state (set at construction from factory.parameters()):**
```solidity
address public immutable factory;
address public immutable token0;
address public immutable token1;
uint24 public immutable fee;
int24 public immutable tickSpacing;
uint128 public immutable maxLiquidityPerTick;
```

**Mutable state (changes during operation):**
```solidity
Slot0 public slot0;                              // current price, tick
uint128 public liquidity;                        // active liquidity
mapping(int24 => Tick.Info) public ticks;        // per-tick data
mapping(bytes32 => Position.Info) public positions; // per-position data
uint256 public feeGrowthGlobal0X128;             // fee accumulators
uint256 public feeGrowthGlobal1X128;
```

**`Slot0` struct (packed into one storage slot for gas efficiency):**
```solidity
struct Slot0 {
    uint160 sqrtPriceX96;   // current sqrt price
    int24 tick;             // current tick (derived from price)
    uint16 observationIndex;
    uint16 observationCardinality;
    uint16 observationCardinalityNext;
    uint8 feeProtocol;
    bool unlocked;          // reentrancy lock
}
```

**Key functions:**

| Function | Description |
|----------|-------------|
| `initialize(sqrtPriceX96)` | One-time setup. Sets starting price. Must be called before mint/swap. |
| `mint(recipient, tickLower, tickUpper, amount, data)` | Adds liquidity. Calls `uniswapV3MintCallback` on caller to collect tokens. |
| `burn(tickLower, tickUpper, amount)` | Removes liquidity. Moves tokens to `tokensOwed` in the position. |
| `collect(recipient, tickLower, tickUpper, amount0, amount1)` | Transfers `tokensOwed` to recipient. |
| `swap(recipient, zeroForOne, amountSpecified, sqrtPriceLimitX96, data)` | Executes swap. Calls `uniswapV3SwapCallback` on caller. |

**How `mint` works internally:**
```
mint()
  └── _modifyPosition()
        ├── _updatePosition()    ← updates Tick mappings for lower/upper bounds
        │     ├── ticks.update(tickLower)
        │     └── ticks.update(tickUpper)
        └── calculates token amounts based on current tick vs. range
              tick < tickLower  → only token0 needed
              tickLower ≤ tick < tickUpper → both tokens needed
              tick ≥ tickUpper  → only token1 needed
```

**The Reentrancy Lock:**
The `lock` modifier sets `slot0.unlocked = false` during execution and restores it after. This prevents re-entrant calls from inside callbacks.

---

### `NonfungiblePositionManager.sol` (NPM) — LP Interface

**Role:** User-facing contract for liquidity management. Wraps pool interactions and issues ERC-721 NFTs representing positions.

**State:**
```solidity
mapping(uint256 => Position) private _positions;      // tokenId → position
mapping(uint80 => PoolKey) private _poolIds;          // poolId → (token0, token1, fee)
mapping(bytes32 => uint80) private _poolIdToPoolKey;  // reverse lookup
uint256 private _nextId = 1;                          // auto-increment tokenId
uint80 private _nextPoolId = 1;                       // auto-increment poolId
```

**`Position` struct stored per NFT:**
```solidity
struct Position {
    uint96 nonce;
    address operator;
    uint80 poolId;           // reference to PoolKey mapping
    int24 tickLower;
    int24 tickUpper;
    uint128 liquidity;
    uint256 feeGrowthInside0LastX128;
    uint256 feeGrowthInside1LastX128;
    uint128 tokensOwed0;
    uint128 tokensOwed1;
}
```

**`mint()` full flow:**
```
User calls NPM.mint(MintParams)
  ├── Calls addLiquidity()
  │     ├── Gets pool address from factory
  │     ├── Calls getLiquidityForAmounts() → converts desired amounts → L
  │     └── Calls pool.mint() → pool calls back uniswapV3MintCallback()
  │           └── uniswapV3MintCallback() → transfers tokens from user to pool
  ├── Mints ERC-721 NFT to params.recipient
  ├── Assigns or reuses a poolId for the (token0, token1, fee) tuple
  └── Stores Position struct in _positions[tokenId]
```

**Key functions:**

| Function | Caller requirements | Description |
|----------|-------------------|-------------|
| `mint(MintParams)` | Token approvals on both tokens | Create new LP position |
| `increaseLiquidity(params)` | Token approvals + own the tokenId | Add more tokens to existing position |
| `decreaseLiquidity(params)` | Own the tokenId | Remove liquidity (tokens go to tokensOwed) |
| `collect(params)` | Own the tokenId | Withdraw tokensOwed to wallet |
| `positions(tokenId)` | None (read-only) | Get full position details |
| `burn(tokenId)` | Own the NFT + zero liquidity + zero tokensOwed | Destroy the NFT |

---

### `SwapRouter.sol` — Swap Execution

**Role:** Stateless router that directs swaps through the appropriate pool(s).

**Key functions:**

| Function | Use case |
|----------|----------|
| `exactInputSingle(params)` | "I have X of tokenA, give me as much tokenB as possible" |
| `exactOutputSingle(params)` | "I want exactly Y of tokenB, charge me tokenA" |
| `exactInput(params)` | Multi-hop: `tokenA → tokenB → tokenC` (exact input) |
| `exactOutput(params)` | Multi-hop: `tokenA → tokenB → tokenC` (exact output) |

**Multi-hop path encoding:**
For multi-hop swaps, the path is ABI-packed:
```
tokenA (20 bytes) + fee (3 bytes) + tokenB (20 bytes) + fee (3 bytes) + tokenC (20 bytes)
```
Total: 43+ bytes. If `path.length >= 43`, it's a multi-hop.

**The Callback Pattern:**
Swaps use a pull-payment model:
1. Pool executes the swap math and *promises* tokens to recipient.
2. Pool then calls `uniswapV3SwapCallback(amount0Delta, amount1Delta, data)` on the router.
3. Router transfers the input tokens FROM the user TO the pool in the callback.
4. Pool verifies its balance increased by the expected amount.

This ensures atomicity — if the callback doesn't pay, the whole transaction reverts.

---

### Library Contracts

| Library | Purpose |
|---------|---------|
| `Tick.sol` | `update()` — initialize/update tick data when liquidity crosses; `cross()` — called during swap when price crosses a tick boundary; `getFeeGrowthInside()` — computes per-tick fee accumulation |
| `TickMath.sol` | `getSqrtRatioAtTick(tick)` — convert tick → sqrtPriceX96; `getTickAtSqrtRatio(sqrtPriceX96)` — reverse conversion |
| `Position.sol` | `get()` — returns position by `keccak(owner,tickLower,tickUpper)`; `update()` — updates liquidity and fee tracking on a position |
| `SqrtPriceMath.sol` | `getAmount0Delta()` / `getAmount1Delta()` — convert liquidity + price range → token amounts |
| `SwapMath.sol` | `computeSwapStep()` — computes one step of a swap: how much goes in/out within a single tick range |
| `FullMath.sol` | `mulDiv()` — 512-bit intermediate to prevent overflow in 256-bit math |

---

## 5. How the Contracts Connect (Internal Flow)

### Pool Creation Flow

```
Factory.createPool(tokenA, tokenB, fee)
  ├── Sort tokens: token0 < token1
  ├── Validate fee tier exists in feeAmountTickSpacing
  ├── Validate pool doesn't already exist
  ├── Set factory.parameters = {factory, token0, token1, fee, tickSpacing}
  ├── Deploy: new UniswapV3Pool{salt: keccak(token0, token1, fee)}()
  │     └── Pool constructor reads parameters from factory (msg.sender)
  ├── Delete factory.parameters
  └── Register in getPool[token0][token1][fee] (and reverse)
```

### Mint / Add Liquidity Flow

```
NPM.mint(params)
  └── addLiquidity(token0, token1, fee, tickLower, tickUpper, amounts...)
        ├── pool = factory.getPool(token0, token1, fee)
        ├── liquidity = getLiquidityForAmounts(pool, tickLower, tickUpper, amt0, amt1)
        └── pool.mint(recipient=NPM, tickLower, tickUpper, liquidity, callbackData)
              ├── _modifyPosition(owner=NPM, tickLower, tickUpper, +liquidityDelta)
              │     ├── _updatePosition() → updates ticks, computes fee snapshots
              │     └── computes amount0, amount1 required
              ├── Calls NPM.uniswapV3MintCallback(amount0, amount1, data)
              │     └── NPM._pay(token0, user, pool, amount0)
              │     └── NPM._pay(token1, user, pool, amount1)
              └── Verifies pool balance increased correctly
```

### Swap Flow

```
SwapRouter.exactInputSingle(params)
  └── exactInputInternal(amountIn, recipient, sqrtPriceLimitX96, callbackData)
        ├── determines zeroForOne direction
        └── pool.swap(recipient, zeroForOne, amountSpecified, sqrtPriceLimitX96, data)
              ├── Loop: while amountRemaining != 0:
              │     ├── Find next initialized tick in direction of swap
              │     ├── SwapMath.computeSwapStep(price, targetPrice, L, remaining, fee)
              │     ├── Update fee accumulators
              │     └── If price crossed tick boundary: ticks.cross(), update L
              ├── Update slot0 (new price + tick)
              ├── Update global fee accumulators
              └── Calls router.uniswapV3SwapCallback(amount0Delta, amount1Delta, data)
                    └── Router._pay(tokenIn, user, pool, amountToPay)
```

---

## 6. Development Environment Setup

### Prerequisites

```bash
node >= 18
npm >= 8
```

### Install Dependencies

```bash
cd AMM_v3
npm install
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `hardhat` | Ethereum development framework |
| `@nomicfoundation/hardhat-ethers` | ethers.js plugin for Hardhat |
| `ethers` | Ethereum library for scripts |
| `@nomicfoundation/hardhat-toolbox-viem` | Testing/deployment toolbox |

### Available npm Scripts

```bash
npm run compile       # Compile contracts → artifacts/
npm run test          # Run all tests
npm run node          # Start local Hardhat node (localhost:8545)
npm run deploy        # Deploy contracts to running local node
npm run complete-test # Run end-to-end integration test
```

### Hardhat Networks

```typescript
// hardhat.config.ts
{
  hardhatMainnet: { type: "edr-simulated", chainType: "l1" },  // local L1
  hardhatOp: { type: "edr-simulated", chainType: "op" },       // local Optimism
  sepolia: {                                                      // Testnet
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.SEPOLIA_PRIVATE_KEY]
  }
}
```

---

## 7. Deployment Guide

### Step 1: Start Local Node

```bash
npm run node
# or
npx hardhat node
```

This starts a local EVM node at `http://127.0.0.1:8545` with 20 pre-funded accounts.

### Step 2: Deploy All Contracts

```bash
npm run deploy
# or
node scripts/deploy.mjs
```

**Deployment order (important — dependencies must come first):**
```
1. WETH9           → no dependencies
2. UniswapV3Factory → no dependencies
3. SwapRouter      → needs (factory, WETH9)
4. NonfungiblePositionManager → needs (factory, WETH9)
5. TestERC20 x2    → no dependencies
```

Output saved to `deployments/latest.json`.

### Step 3: Initialize a Pool (required before use)

After deployment, pools must be created AND initialized:

```js
// 1. Create the pool
await factory.createPool(token0, token1, fee);

// 2. Get the pool address
const poolAddress = await factory.getPool(token0, token1, fee);
const pool = new ethers.Contract(poolAddress, PoolABI, signer);

// 3. Initialize with a starting price
// Example: 1 token0 = 1 token1 → sqrtPriceX96 = sqrt(1) * 2^96
const sqrtPriceX96 = BigInt(Math.sqrt(1) * 2**96);
await pool.initialize(sqrtPriceX96);
```

### Deployment to Sepolia Testnet

Set environment variables:
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0x...
```

Then use Hardhat Ignition or modify the deploy script to target the sepolia network.

---

## 8. Interacting with Contracts via Scripts

### Example: Full Pool Setup + Swap (Node.js)

```js
import { ethers } from "ethers";
import deployments from "./deployments/latest.json" assert { type: "json" };
// import ABIs from artifacts...

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = await provider.getSigner(0);

const factory = new ethers.Contract(deployments.contracts.Factory, FactoryABI.abi, signer);
const npm = new ethers.Contract(deployments.contracts.NonfungiblePositionManager, NPM_ABI.abi, signer);
const swapRouter = new ethers.Contract(deployments.contracts.SwapRouter, RouterABI.abi, signer);

const tokenA = deployments.contracts.TestTokens.TokenA;
const tokenB = deployments.contracts.TestTokens.TokenB;
const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
const fee = 3000; // 0.3%

// 1. Create Pool
await factory.createPool(token0, token1, fee);
const poolAddr = await factory.getPool(token0, token1, fee);
const pool = new ethers.Contract(poolAddr, PoolABI.abi, signer);

// 2. Initialize Pool (1:1 price)
const ONE = 2n ** 96n;
await pool.initialize(ONE);

// 3. Approve NPM to spend tokens
const tokenContract0 = new ethers.Contract(token0, ERC20ABI, signer);
const tokenContract1 = new ethers.Contract(token1, ERC20ABI, signer);
const amount = ethers.parseUnits("1000", 18);
await tokenContract0.approve(deployments.contracts.NonfungiblePositionManager, amount);
await tokenContract1.approve(deployments.contracts.NonfungiblePositionManager, amount);

// 4. Add Liquidity
const tickSpacing = 60; // for fee=3000
const tickLower = -tickSpacing * 10;  // price range below current
const tickUpper = tickSpacing * 10;   // price range above current
const deadline = Math.floor(Date.now() / 1000) + 1800;

const tx = await npm.mint({
  token0, token1, fee, tickLower, tickUpper,
  amount0Desired: amount,
  amount1Desired: amount,
  amount0Min: 0n,
  amount1Min: 0n,
  recipient: await signer.getAddress(),
  deadline
});
await tx.wait();

// 5. Swap
const swapAmount = ethers.parseUnits("10", 18);
await tokenContract0.approve(deployments.contracts.SwapRouter, swapAmount);
await swapRouter.exactInputSingle({
  tokenIn: token0,
  tokenOut: token1,
  fee,
  recipient: await signer.getAddress(),
  deadline,
  amountIn: swapAmount,
  amountOutMinimum: 0n,
  sqrtPriceLimitX96: 0n
});
```

---

## 9. Testing

### Run Tests

```bash
npm run test
# or
npx hardhat test
```

### Run End-to-End Integration Test

```bash
# Requires a running local node (npm run node in another terminal)
node scripts/complete-test.mjs
```

The `complete-test.mjs` script covers:
- Deploying all contracts
- Creating and initializing a pool
- Adding liquidity
- Executing a swap
- Collecting fees
- Removing liquidity

### Writing New Tests

```js
// test/YourTest.test.ts
import { expect } from "chai";
import hre from "hardhat";

describe("UniswapV3Pool", function () {
  it("should initialize with correct price", async function () {
    const [deployer] = await hre.ethers.getSigners();
    // ... deploy factory, create pool, initialize
    const [sqrtPriceX96] = await pool.slot0();
    expect(sqrtPriceX96).to.be.gt(0n);
  });
});
```

---

## 10. Key Mathematical Concepts

### Liquidity Formula

Given a price range `[pa, pb]` and amounts `(x, y)`:

```
L = min(
  x * √(pa * pb) / (√pb - √pa),   // from token0
  y / (√pb - √pa)                  // from token1
)
```

This is implemented in `NonfungiblePositionManager.getLiquidityForAmounts()`.

### Token Amounts from Liquidity

```
amount0 = L * (√pb - √p) / (√p * √pb)   // token0 needed for range [p, pb]
amount1 = L * (√p - √pa)                 // token1 needed for range [pa, p]
```

Implemented in `SqrtPriceMath.getAmount0Delta()` and `getAmount1Delta()`.

### Fee Accumulation
Fees are tracked using a **global accumulator** approach:
- `feeGrowthGlobal0X128` / `feeGrowthGlobal1X128` — grows with each swap proportional to fee/liquidity.
- Each position stores a snapshot of the accumulator at the time of last update.
- Fees earned = `(currentGlobal - snapshot) * positionLiquidity`.
- Per-tick accumulators track "fee growth outside" each tick for range isolation.

### Swap Step Computation (`SwapMath.computeSwapStep`)
Each swap iteration computes:
1. How much of `amountRemaining` can be consumed before the price hits the next tick.
2. The resulting amounts in/out and fee for that step.
3. The new `sqrtPriceX96`.

The swap loops until `amountRemaining == 0` or `sqrtPriceX96 == sqrtPriceLimitX96`.

---

## 11. Event Indexing (for APIs & Databases)

If you're building an API or a database that tracks pool state, index these events:

### Factory Events

| Event | When fired | Useful for |
|-------|-----------|------------|
| `PoolCreated(token0, token1, fee, tickSpacing, pool)` | New pool deployed | Index all pools |
| `OwnerChanged(oldOwner, newOwner)` | Ownership transfer | Admin tracking |
| `FeeAmountEnabled(fee, tickSpacing)` | New fee tier added | Fee tier list |

### Pool Events

| Event | When fired | Useful for |
|-------|-----------|------------|
| `Initialize(sqrtPriceX96, tick)` | Pool price set for first time | Pool activated |
| `Mint(sender, owner, tickLower, tickUpper, amount, amount0, amount1)` | Liquidity added | LP activity tracking |
| `Burn(owner, tickLower, tickUpper, amount, amount0, amount1)` | Liquidity removed | LP activity tracking |
| `Collect(owner, recipient, tickLower, tickUpper, amount0, amount1)` | Fees collected | Fee revenue tracking |
| `Swap(sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick)` | Token swap | Volume, price history |

### NPM Events

| Event | When fired | Useful for |
|-------|-----------|------------|
| `Transfer(from, to, tokenId)` | NFT minted/transferred/burned | Position ownership |

### Listening in Node.js

```js
// Listen to all Swap events on a pool
pool.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick) => {
  console.log("Swap:", { amount0, amount1, tick: tick.toString() });
  // Save to database here
});

// Query historical events
const filter = pool.filters.Swap();
const events = await pool.queryFilter(filter, fromBlock, toBlock);
```

---

## 12. Security Considerations

### ✅ Reentrancy Protection
All state-changing functions on `UniswapV3Pool` use the `lock` modifier, which sets `slot0.unlocked = false` and prevents re-entrant calls.

### ✅ Callback Verification
Both `SwapRouter.uniswapV3SwapCallback()` and `NPM.uniswapV3MintCallback()` verify that `msg.sender` is the expected pool address before transferring tokens. Never skip this check in custom integrations.

### ✅ Balance Verification
After every mint/swap callback, the pool verifies its actual ERC-20 balance increased by the expected amount:
```solidity
require(balance0Before + amount0 <= balance0(), "M0");
```

### ✅ Slippage Protection
`SwapRouter` accepts `amountOutMinimum` / `amountInMaximum` and the pool swap accepts `sqrtPriceLimitX96` as a price cap. Always use these to protect users.

### ✅ Deadline Checks
All user-facing functions have a `deadline` parameter. Transactions submitted and mined after the deadline revert automatically.

### ⚠️ Token Sorting
The pool always orders tokens as `token0 < token1` (by address). Callers must be aware that `zeroForOne` means "swapping token0 for token1," which is NOT the same as "tokenA for tokenB."

### ⚠️ Known Limitation: TickBitmap Not Fully Implemented
`nextInitializedTickWithinOneWord()` in this version uses a simplified bitmap (`0 & mask`) which always returns `initialized = false`. This means the swap loop will not correctly skip to initialized ticks — the pool can still compute swap math but won't efficiently cross tick boundaries. For production, a full `TickBitmap.sol` library is required.

### ⚠️ Integer Overflow Regions
All arithmetic uses Solidity 0.8.20 built-in overflow checks except in `FullMath.sol` which uses `unchecked` blocks intentionally for 512-bit intermediate multiplication. Do not modify `FullMath.sol` unless you fully understand the math.

---

## 📎 Quick Reference

### Contract Addresses (Localhost)

```json
{
  "Factory":                    "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
  "SwapRouter":                 "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  "NonfungiblePositionManager": "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  "WETH9":                      "0x9A676e781A523b5d0C0e43731313A708CB607508",
  "TokenA":                     "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  "TokenB":                     "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c"
}
```

### Mandatory Sequence

```
1. factory.createPool(token0, token1, fee)
2. pool.initialize(sqrtPriceX96)
3. token.approve(npm, amount) × 2
4. npm.mint(params)           → get tokenId
5. swapRouter.exactInputSingle(params)
6. npm.collect(params)        → harvest fees
7. npm.decreaseLiquidity(...)
8. npm.collect(...)           → collect withdrawn tokens
9. npm.burn(tokenId)          → destroy empty NFT
```

### Fee Tiers

| Constant | tickSpacing | Use Case |
|----------|------------|----------|
| `500` | `10` | Stable pairs (USDC/USDT) |
| `3000` | `60` | Standard pairs (ETH/USDC) |
| `10000` | `200` | Volatile/exotic pairs |
