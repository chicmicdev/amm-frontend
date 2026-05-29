# 🖥️ Frontend Developer Guide — AMM v3

> **Who this is for:** Frontend developers integrating with the AMM v3 smart contracts. No prior blockchain or Uniswap knowledge required.

---

## 📚 Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Core Concepts You Must Know](#2-core-concepts-you-must-know)
3. [System Architecture (Big Picture)](#3-system-architecture-big-picture)
4. [The 4 Smart Contracts You'll Talk To](#4-the-4-smart-contracts-youll-talk-to)
5. [User Flows & What the UI Must Do](#5-user-flows--what-the-ui-must-do)
6. [Contract ABIs & Addresses](#6-contract-abis--addresses)
7. [Connecting to the Blockchain (ethers.js)](#7-connecting-to-the-blockchain-ethersjs)
8. [Feature-by-Feature Integration Guide](#8-feature-by-feature-integration-guide)
9. [Common UI States to Handle](#9-common-ui-states-to-handle)
10. [Error Messages from Contracts](#10-error-messages-from-contracts)

---

## 1. What Is This Project?

This is a **decentralized token exchange** — similar to how you can exchange USD for EUR, but instead of banks, smart contracts (self-executing code on the blockchain) handle everything automatically.

### The core idea in plain English:

- **Liquidity Providers (LPs)** deposit two tokens into a "pool" and earn fees.  
- **Traders/Swappers** use those pools to exchange one token for another.
- The price is determined automatically by a mathematical formula — no order books, no humans.

This is called an **Automated Market Maker (AMM)**.

### What makes this a "V3" AMM?

The key innovation is **Concentrated Liquidity**:
- In older AMMs, your deposited money was spread across all possible prices (inefficient).
- In V3, LPs pick a **specific price range** where they want to provide liquidity.
- This makes capital much more efficient and earns more fees.

**Analogy:** Instead of guarding the entire highway, each LP guards only a specific stretch of road.

---

## 2. Core Concepts You Must Know

### 🪙 Tokens
Every cryptocurrency is represented by a smart contract address. In this project there are two test tokens:
- **TokenA (TKA)** — Address: `0x68B1D87F95878fE05B998F19b66F4baba5De1aed`
- **TokenB (TKB)** — Address: `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c`

All token amounts are in **Wei** (smallest unit). 1 token = `1e18` wei for 18-decimal tokens.

```js
// 1 TokenA = "1000000000000000000" (in code)
const ONE_TOKEN = ethers.parseUnits("1", 18); // use this helper
```

### 💧 Liquidity Pool
A pool is a smart contract that holds reserves of **two tokens**. It automatically calculates the exchange rate based on those reserves.

Each pool is uniquely identified by: `(token0 address, token1 address, fee tier)`

### 📊 Price & Ticks
Price in V3 is stored as a **square root** in a special format (`sqrtPriceX96`). You don't need to understand the math — just know:
- Price goes up when people buy token0 with token1.
- Price goes down in the reverse case.
- The price space is divided into discrete units called **ticks** (think of them like steps on a ruler).

### 🎯 Price Range (tickLower / tickUpper)
When adding liquidity, the LP chooses a price range expressed as two tick numbers:
- `tickLower` — the lower bound of their price range
- `tickUpper` — the upper bound of their price range

The UI must let the user pick these (often shown as min/max price inputs that are converted to ticks for the contract call).

### 💸 Fee Tiers
Each pool has a fixed fee that swappers pay, which goes to LPs:

| Fee | Tick Spacing | Best For |
|-----|-------------|----------|
| 0.05% (500) | 10 | Stablecoins |
| 0.3% (3000) | 60 | Most pairs |
| 1% (10000) | 200 | Exotic pairs |

### 🖼️ NFT Position
When an LP adds liquidity, they receive an **NFT (Non-Fungible Token)** as a receipt. This NFT:
- Is minted by `NonfungiblePositionManager`
- Represents their specific position (token pair + price range + liquidity amount)
- **Must be held** to collect fees or remove liquidity
- Has a numeric `tokenId`

### ✅ Token Approval
Before the contract can spend a user's tokens, the user must **approve** the contract first. This is a standard ERC-20 mechanism. Every `mint` and `swap` flow requires an approval check/step.

---

## 3. System Architecture (Big Picture)

```
USER WALLET (MetaMask / WalletConnect)
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                   FRONTEND APP                       │
│  - Show pool info, prices, positions                 │
│  - Let user pick tokens, amounts, price ranges       │
│  - Build & send transactions to contracts            │
└──────────────┬────────────────┬────────────────────┘
               │                │
               ▼                ▼
   ┌─────────────────┐  ┌───────────────────────────┐
   │   SwapRouter    │  │ NonfungiblePositionManager │
   │  (for trading)  │  │   (for LP positions/NFTs)  │
   └────────┬────────┘  └────────────┬──────────────┘
            │                        │
            └──────────┬─────────────┘
                       ▼
            ┌───────────────────┐
            │  UniswapV3Factory │
            │ (finds the pool)  │
            └─────────┬─────────┘
                      ▼
            ┌───────────────────┐
            │  UniswapV3Pool    │
            │ (the actual math  │
            │   & token reserves│
            └───────────────────┘
```

**The rule:** Frontend never talks directly to `UniswapV3Pool`. Always go through `SwapRouter` (for swaps) or `NonfungiblePositionManager` (for liquidity).

---

## 4. The 4 Smart Contracts You'll Talk To

### 1. `UniswapV3Factory` — The Pool Registry
- **Purpose:** Creates and keeps track of all pools.
- **Frontend use:** Read the pool address for a given `(token0, token1, fee)` pair.
- **Address:** `0x0B306BF915C4d645ff596e518fAf3F9669b97016`

Key function for frontend:
```solidity
// Check if a pool exists and get its address
getPool(address token0, address token1, uint24 fee) → address pool
```

### 2. `UniswapV3Pool` — The Core Pool (read-only from frontend)
- **Purpose:** Holds reserves, tracks price.
- **Frontend use:** Read current price, tick, liquidity.
- **Address:** Not fixed — discovered via `Factory.getPool()`

Key read functions:
```solidity
slot0() → (sqrtPriceX96, tick, ...)   // current price + tick
liquidity() → uint128                  // total active liquidity
token0() → address
token1() → address
```

### 3. `SwapRouter` — The Trading Interface
- **Purpose:** Execute token swaps.
- **Frontend use:** Call to let users trade tokens.
- **Address:** `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1`

Key functions:
```solidity
exactInputSingle(params)   // swap exact amount IN, get token OUT
exactOutputSingle(params)  // pay token IN, get exact amount OUT
exactInput(params)         // multi-hop: swap across multiple pools
exactOutput(params)        // multi-hop: receive exact amount out
```

### 4. `NonfungiblePositionManager` (NPM) — Liquidity & NFT Manager
- **Purpose:** Add/remove liquidity, manage LP NFTs.
- **Frontend use:** Everything related to LP positions.
- **Address:** `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE`

Key functions:
```solidity
mint(params)                 // add liquidity → get NFT
positions(tokenId)           // read a position's details
increaseLiquidity(params)    // add more liquidity to existing position
decreaseLiquidity(params)    // remove some liquidity
collect(params)              // claim earned fees
burn(tokenId)                // destroy NFT after full removal
```

---

## 5. User Flows & What the UI Must Do

### Flow A: Swapping Tokens (Trading)

```
1. User selects tokenIn, tokenOut, and fee tier
2. UI reads the pool address from Factory
3. UI reads current price from pool.slot0()
4. User enters amount they want to swap
5. UI calculates expected output (show estimate)
6. User sets slippage tolerance (e.g. 0.5%)
7. UI calculates amountOutMinimum = expectedOut * (1 - slippagePct)
8. User approves SwapRouter to spend tokenIn (ERC-20 approve)
9. UI calls SwapRouter.exactInputSingle(params)
10. Show transaction hash, then success confirmation
```

### Flow B: Adding Liquidity (Becoming an LP)

```
1. User selects token pair and fee tier
2. UI reads current price from pool.slot0()
3. User selects a price range (min price, max price)
4. UI converts min/max price → tickLower, tickUpper
5. User enters how much of each token they want to deposit
6. UI calculates required amounts based on current price vs. range
7. User approves NPM to spend both tokens
8. UI calls NonfungiblePositionManager.mint(params)
9. User receives an NFT representing their position
10. Show position summary (tokenId, range, liquidity)
```

### Flow C: Viewing & Managing Positions

```
1. Read all NFT tokenIds owned by the connected wallet
2. For each tokenId: call NPM.positions(tokenId) to get details
3. Display: token pair, price range, current liquidity, fees earned
4. User can:
   - "Increase Liquidity" → call increaseLiquidity()
   - "Remove Liquidity" → call decreaseLiquidity() + collect()
   - "Collect Fees" → call collect() with max amounts
```

---

## 6. Contract ABIs & Addresses

### Deployed Addresses (Localhost / Development)

```json
{
  "network": "localhost",
  "chainId": "31337",
  "Factory":                       "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
  "SwapRouter":                    "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  "NonfungiblePositionManager":    "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  "WETH9":                         "0x9A676e781A523b5d0C0e43731313A708CB607508",
  "TokenA (TKA)":                  "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  "TokenB (TKB)":                  "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c"
}
```

Always load from `deployments/latest.json` — don't hardcode addresses in multiple places.

### ABI Files Location
All compiled contract ABIs are in `artifacts/contracts/`:
```
artifacts/contracts/
├── core/UniswapV3Factory.sol/UniswapV3Factory.json
├── core/UniswapV3Pool.sol/UniswapV3Pool.json
├── periphery/SwapRouter.sol/SwapRouter.json
└── periphery/NonfungiblePositionManager.sol/NonfungiblePositionManager.json
```

Load them like:
```js
import FactoryABI from '../artifacts/contracts/core/UniswapV3Factory.sol/UniswapV3Factory.json';
```

---

## 7. Connecting to the Blockchain (ethers.js)

### Setup

```bash
npm install ethers
```

### Connect Wallet & Provider

```js
import { ethers } from 'ethers';

// Connect to MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const userAddress = await signer.getAddress();
```

### Load Contracts

```js
import deployments from './deployments/latest.json';
import FactoryABI from './artifacts/.../UniswapV3Factory.json';
import SwapRouterABI from './artifacts/.../SwapRouter.json';
import NPM_ABI from './artifacts/.../NonfungiblePositionManager.json';
import PoolABI from './artifacts/.../UniswapV3Pool.json';

const factory = new ethers.Contract(deployments.contracts.Factory, FactoryABI.abi, provider);
const swapRouter = new ethers.Contract(deployments.contracts.SwapRouter, SwapRouterABI.abi, signer);
const npm = new ethers.Contract(deployments.contracts.NonfungiblePositionManager, NPM_ABI.abi, signer);
```

---

## 8. Feature-by-Feature Integration Guide

### 8.1 — Get Current Pool Price

```js
async function getPoolPrice(token0, token1, fee) {
  const poolAddress = await factory.getPool(token0, token1, fee);
  if (poolAddress === ethers.ZeroAddress) return null; // pool doesn't exist

  const pool = new ethers.Contract(poolAddress, PoolABI.abi, provider);
  const [sqrtPriceX96, tick] = await pool.slot0();

  // Convert sqrtPriceX96 to a human-readable price
  // price of token1 in terms of token0:
  const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  return { price, tick, poolAddress };
}
```

### 8.2 — Approve Token Spending

Always do this before swapping or minting:

```js
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

async function approveToken(tokenAddress, spenderAddress, amount, signer) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  
  // Check current allowance first
  const userAddress = await signer.getAddress();
  const allowance = await token.allowance(userAddress, spenderAddress);
  
  if (allowance < amount) {
    const tx = await token.approve(spenderAddress, amount);
    await tx.wait(); // wait for confirmation
    console.log("Approved!");
  }
}
```

### 8.3 — Execute a Swap (Exact Input)

```js
async function swapExactInput(tokenIn, tokenOut, fee, amountIn, slippagePct = 0.5) {
  const amountInWei = ethers.parseUnits(amountIn, 18);
  
  // 1. Approve SwapRouter to spend tokenIn
  await approveToken(tokenIn, deployments.contracts.SwapRouter, amountInWei, signer);
  
  // 2. Read current price to estimate output
  const { price } = await getPoolPrice(tokenIn, tokenOut, fee);
  const estimatedOut = amountIn * price;
  const amountOutMinimum = ethers.parseUnits(
    (estimatedOut * (1 - slippagePct / 100)).toFixed(18), 18
  );

  // 3. Execute swap
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const tx = await swapRouter.exactInputSingle({
    tokenIn,
    tokenOut,
    fee,
    recipient: await signer.getAddress(),
    deadline,
    amountIn: amountInWei,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n  // 0 = no price limit
  });

  const receipt = await tx.wait();
  return receipt;
}
```

### 8.4 — Add Liquidity (Mint a Position)

```js
async function addLiquidity(token0, token1, fee, amount0, amount1, tickLower, tickUpper) {
  const amount0Wei = ethers.parseUnits(amount0.toString(), 18);
  const amount1Wei = ethers.parseUnits(amount1.toString(), 18);

  // 1. Approve NPM to spend both tokens
  const npmAddress = deployments.contracts.NonfungiblePositionManager;
  await approveToken(token0, npmAddress, amount0Wei, signer);
  await approveToken(token1, npmAddress, amount1Wei, signer);

  // 2. Mint the position (slippage: allow up to 1% less)
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await npm.mint({
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: amount0Wei,
    amount1Desired: amount1Wei,
    amount0Min: (amount0Wei * 99n) / 100n,  // 1% slippage
    amount1Min: (amount1Wei * 99n) / 100n,
    recipient: await signer.getAddress(),
    deadline
  });

  const receipt = await tx.wait();
  // The tokenId is emitted in the Transfer event (ERC-721)
  return receipt;
}
```

### 8.5 — Read a Position

```js
async function getPosition(tokenId) {
  const pos = await npm.positions(tokenId);
  return {
    token0: pos.token0,
    token1: pos.token1,
    fee: pos.fee,
    tickLower: pos.tickLower,
    tickUpper: pos.tickUpper,
    liquidity: pos.liquidity,
    tokensOwed0: pos.tokensOwed0,  // uncollected fees in token0
    tokensOwed1: pos.tokensOwed1   // uncollected fees in token1
  };
}
```

### 8.6 — Collect Fees

```js
async function collectFees(tokenId, recipientAddress) {
  const MAX_UINT128 = (2n ** 128n) - 1n; // collect all available fees
  const tx = await npm.collect({
    tokenId,
    recipient: recipientAddress,
    amount0Max: MAX_UINT128,
    amount1Max: MAX_UINT128
  });
  return tx.wait();
}
```

### 8.7 — Remove Liquidity

```js
async function removeLiquidity(tokenId, liquidityAmount) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  
  // Step 1: Decrease liquidity (moves tokens to "tokensOwed")
  await npm.decreaseLiquidity({
    tokenId,
    liquidity: liquidityAmount,
    amount0Min: 0n,
    amount1Min: 0n,
    deadline
  });

  // Step 2: Collect the tokens to wallet
  const MAX_UINT128 = (2n ** 128n) - 1n;
  await npm.collect({
    tokenId,
    recipient: await signer.getAddress(),
    amount0Max: MAX_UINT128,
    amount1Max: MAX_UINT128
  });
}
```

### 8.8 — Price ↔ Tick Conversion

The frontend needs to convert between human-readable prices and ticks for the range selector UI:

```js
// Price → Tick
function priceToTick(price) {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

// Tick → Price
function tickToPrice(tick) {
  return Math.pow(1.0001, tick);
}

// Round tick to nearest valid tick for the pool's tickSpacing
function nearestUsableTick(tick, tickSpacing) {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  if (rounded < -887272) return -887272 + tickSpacing;
  if (rounded > 887272) return 887272 - tickSpacing;
  return rounded;
}

// Fee tier to tick spacing
const FEE_TO_TICK_SPACING = { 500: 10, 3000: 60, 10000: 200 };
```

---

## 9. Common UI States to Handle

| State | What to Show |
|-------|-------------|
| Wallet not connected | "Connect Wallet" button |
| Pool doesn't exist | "This pool doesn't exist yet" warning |
| Insufficient balance | Disable button, show "Insufficient [TOKEN] balance" |
| Token not approved | Show "Approve [TOKEN]" button before swap/mint |
| Transaction pending | Spinner + "Transaction submitted..." |
| Transaction confirmed | Success toast with a block explorer link |
| Transaction failed | Error toast with the revert reason |
| Price out of range (LP) | Warning: "Your position will not earn fees at the current price" |
| Zero liquidity in pool | "No liquidity available, you may be the first LP" |

---

## 10. Error Messages from Contracts

The contracts use short error codes. Map them to friendly messages:

| Contract Error | User-Friendly Message |
|---------------|----------------------|
| `"IT"` | "The two tokens must be different" |
| `"0A"` | "Token address cannot be zero" |
| `"FE"` | "Invalid fee tier selected" |
| `"PE"` | "This pool already exists" |
| `"AI"` | "Pool has already been initialized" |
| `"LOK"` | "Transaction blocked, please try again" |
| `"IL"` | "Liquidity amount must be greater than zero" |
| `"AS"` | "Swap amount cannot be zero" |
| `"SPL"` | "Price limit out of bounds" |
| `"M0"` / `"M1"` | "Insufficient token transfer to pool" |
| `"IIA"` | "Insufficient input amount for swap" |
| `"TF"` | "Token transfer failed, check approvals" |
| `"LO"` | "Maximum liquidity per tick exceeded" |
| `"Price slippage check"` | "Price moved too much, increase slippage tolerance" |
| `"Transaction too old"` | "Transaction deadline expired, please retry" |
| `"Not approved"` | "You don't own this position NFT" |

```js
// Catch and display errors cleanly
try {
  await swapRouter.exactInputSingle(params);
} catch (err) {
  const reason = err?.reason || err?.data?.message || err.message;
  showErrorToast(contractErrorToMessage(reason));
}
```

---

## 📎 Quick Reference

```
Pool exists?     → factory.getPool(token0, token1, fee) !== ZeroAddress
Current price?   → pool.slot0() → sqrtPriceX96
My positions?    → npm.positions(tokenId) for each NFT I own
Swap tokens      → swapRouter.exactInputSingle(...)
Add liquidity    → npm.mint(...)
Remove liquidity → npm.decreaseLiquidity(...) + npm.collect(...)
Collect fees     → npm.collect(...)
```

> **⚠️ Always wait for `tx.wait()` before updating the UI.** The transaction being submitted is NOT the same as it being confirmed.
