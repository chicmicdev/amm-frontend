# AMM v3 — Contract Flow & Roles

A concise reference for understanding what each contract does and how they interact.

---

## The 4 Main Contracts at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER / WALLET                             │
└────────────┬──────────────────────────┬────────────────────────┘
             │  TRADING                 │  LIQUIDITY
             ▼                          ▼
   ┌──────────────────┐      ┌────────────────────────────┐
   │   SwapRouter     │      │  NonfungiblePositionManager│
   │  "Trade tokens"  │      │  "Manage LP positions"     │
   └────────┬─────────┘      └────────────┬───────────────┘
            │                             │
            └──────────────┬──────────────┘
                           ▼
               ┌───────────────────────┐
               │   UniswapV3Factory    │
               │  "Find the pool"      │
               └───────────┬───────────┘
                           ▼
               ┌───────────────────────┐
               │   UniswapV3Pool       │
               │  "Execute everything" │
               └───────────────────────┘
```

---

## Contract Roles

### 1. `UniswapV3Factory` — The Pool Registry

**Role:** Creates new pools and acts as a global directory to look them up.

**Owns:** A mapping of `(token0, token1, fee) → pool address`

**Key responsibilities:**
- Deploy a new `UniswapV3Pool` contract for any token pair + fee tier combination
- Ensure no duplicate pools exist for the same triple
- Provide pool address lookups to all other contracts

**Pre-configured fee tiers at deployment:**

| Fee | Tick Spacing |
|-----|-------------|
| 0.05% (`500`) | `10` |
| 0.30% (`3000`) | `60` |
| 1.00% (`10000`) | `200` |

**Who calls it:** Factory is called by `SwapRouter` and `NonfungiblePositionManager` internally to look up pool addresses. Directly called by anyone to `createPool()`.

---

### 2. `UniswapV3Pool` — The Core Engine

**Role:** The actual AMM. Holds token reserves, tracks price, and executes all swaps and liquidity changes.

**Owns:** Token balances of both tokens, full price/tick state, all LP position data

**Key responsibilities:**
- Store the current price (`sqrtPriceX96`) and current tick
- Track every LP position: who owns it, at what price range, how much liquidity
- Execute swaps by running through the tick-by-tick math loop
- Collect fees on every swap and credit them to the LPs in the active range
- Call back the router/NPM to collect tokens (pull-payment pattern)

**Important:** The pool is **never called directly** by users. Always go through `SwapRouter` or `NonfungiblePositionManager`.

**State stored per pool:**
```
slot0        → current price (sqrtPriceX96) + tick + fee protocol + lock
liquidity    → total active liquidity at current price
ticks        → per-tick data (liquidityNet, fee accumulators)
positions    → per-LP position (liquidity, fee snapshots, tokens owed)
feeGrowthGlobalX128 → running fee accumulator for both tokens
```

---

### 3. `SwapRouter` — The Trading Interface

**Role:** Stateless router that lets users swap tokens. Handles single-hop and multi-hop swaps.

**Owns:** Nothing (no state, no balances)

**Key responsibilities:**
- Accept a swap request from the user (amount + token pair + slippage)
- Look up the correct pool from the Factory
- Call `pool.swap()` with the right parameters
- Handle the swap callback: transfer the user's input tokens to the pool

**Swap types:**

| Function | Meaning |
|----------|---------|
| `exactInputSingle` | Pay exact tokenA → get as much tokenB as possible |
| `exactOutputSingle` | Get exact tokenB → pay as little tokenA as possible |
| `exactInput` | Multi-hop, fixed input amount |
| `exactOutput` | Multi-hop, fixed output amount |

**How a single swap flows:**
```
User → SwapRouter.exactInputSingle()
         └── finds pool via Factory.getPool()
         └── calls pool.swap()
               └── pool does the math
               └── pool calls back SwapRouter.uniswapV3SwapCallback()
                     └── SwapRouter pulls tokenIn FROM user TO pool
               └── pool sends tokenOut TO recipient
```

---

### 4. `NonfungiblePositionManager` (NPM) — Liquidity & NFT Manager

**Role:** User-facing contract to add/remove liquidity. Issues an ERC-721 NFT as a receipt for every LP position.

**Owns:** The NFTs (it is the ERC-721 contract). Position metadata keyed by NFT `tokenId`.

**Key responsibilities:**
- Convert desired token amounts into the correct `liquidity` value for the pool
- Call `pool.mint()` to add liquidity (and handle the mint callback to pay tokens)
- Issue a new NFT to the LP, storing the position's tick range and liquidity
- Allow LPs to increase/decrease liquidity on existing positions using their NFT
- Let LPs collect accumulated fee earnings
- Burn the NFT when a position is fully closed

**How minting a position flows:**
```
User → NPM.mint(token0, token1, fee, tickLower, tickUpper, amount0, amount1)
         └── calculates liquidity L from amounts + current price
         └── calls pool.mint(tickLower, tickUpper, L)
               └── pool updates its tick and position state
               └── pool calls back NPM.uniswapV3MintCallback()
                     └── NPM pulls tokens FROM user TO pool
         └── mints new ERC-721 NFT to the user
         └── stores position data in _positions[tokenId]
```

**Position lifecycle:**
```
mint()             → NFT created, liquidity deposited
increaseLiquidity()→ add more tokens to the same range
decreaseLiquidity()→ reclaim tokens (fees go to tokensOwed)
collect()          → withdraw tokensOwed to wallet
burn()             → destroy NFT (only if liquidity=0 and tokensOwed=0)
```

---

## Library Contracts (Used Internally by the Pool)

These are not deployed as standalone contracts — they are compiled into the pool.

| Library | Role |
|---------|------|
| `TickMath` | Converts between a **tick number** and its **sqrt price**. Used by every mint and swap. |
| `SqrtPriceMath` | Converts between **liquidity** and **token amounts** given a price range. Answers: "how much token0/1 does this liquidity represent?" |
| `SwapMath` | Computes one step of a swap: how much goes in/out before the price hits the next tick boundary. |
| `Tick` | Manages per-tick state. Records when a tick is "initialized" (has liquidity crossing it) and tracks fee growth outside each tick. |
| `Position` | Manages per-position state (liquidity balance, fee snapshots). Stores positions keyed by `keccak(owner, tickLower, tickUpper)`. |
| `FullMath` | 512-bit intermediate math to prevent overflow in fee and liquidity calculations. |

---

## Test / Helper Contracts

| Contract | Role |
|----------|------|
| `TestERC20` | A simple mintable ERC-20 token used in development. Represents any token pair. |
| `WETH9` | Wrapped ETH. Lets ETH participate in ERC-20 flows (deposit ETH → get WETH, withdraw WETH → get ETH). |
| `SwapHelper` | A test helper that implements the swap/mint callbacks, used in testing scripts so test accounts can interact with the pool directly. |

---

## End-to-End Flow Summary

```
STEP 1 — Create Pool
  factory.createPool(tokenA, tokenB, fee)
  → Deploys UniswapV3Pool, registers it in the factory

STEP 2 — Initialize Pool  
  pool.initialize(sqrtPriceX96)
  → Sets the starting price. Must be done before any swap or mint.

STEP 3 — Add Liquidity (LP)
  user approves NPM for both tokens
  npm.mint({ token0, token1, fee, tickLower, tickUpper, amounts... })
  → Tokens flow: user wallet → pool
  → NFT minted to user as receipt

STEP 4 — Swap (Trader)
  user approves SwapRouter for tokenIn
  swapRouter.exactInputSingle({ tokenIn, tokenOut, fee, amountIn, ... })
  → tokenIn flows: user wallet → pool
  → tokenOut flows: pool → user wallet
  → Fee portion stays in pool, credited to active LPs

STEP 5 — Collect Fees (LP)
  npm.collect({ tokenId, recipient, amount0Max, amount1Max })
  → Earned fees flow: pool → LP wallet

STEP 6 — Remove Liquidity (LP)
  npm.decreaseLiquidity({ tokenId, liquidity, ... })
  → Liquidity removed, tokens credited to tokensOwed in position
  npm.collect({ tokenId, ... })
  → Withdrawn tokens flow: pool → LP wallet
  npm.burn(tokenId)  [optional — only if fully exited]
  → NFT destroyed
```

---

## Who Calls What

| Caller | Contract Called | Function |
|--------|----------------|----------|
| Anyone | `Factory` | `createPool()` |
| Anyone | `Pool` | `initialize()` |
| Trader | `SwapRouter` | `exactInputSingle()`, `exactInput()`, etc. |
| LP | `NPM` | `mint()`, `increaseLiquidity()`, `decreaseLiquidity()`, `collect()`, `burn()` |
| Anyone (read) | `Factory` | `getPool()` |
| Anyone (read) | `Pool` | `slot0()`, `liquidity()`, `ticks()`, `positions()` |
| Anyone (read) | `NPM` | `positions(tokenId)` |
| `SwapRouter` (internal) | `Factory` | `getPool()` |
| `SwapRouter` (internal) | `Pool` | `swap()` |
| `NPM` (internal) | `Factory` | `getPool()` |
| `NPM` (internal) | `Pool` | `mint()`, `burn()`, `collect()` |
| `Pool` (callback) | `SwapRouter` | `uniswapV3SwapCallback()` |
| `Pool` (callback) | `NPM` | `uniswapV3MintCallback()` |
