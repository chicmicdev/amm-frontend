# ⚙️ Backend Guide — Token Staking

> **Stack:** Node.js + Express  
> **Role:** Middleware between the React frontend and the staking smart contract.  
> **No code here** — guidelines only.

---

## 1. What the Backend Does

The backend serves 3 purposes:

1. **API layer** — Exposes REST endpoints for the frontend to trigger staking actions and fetch data
2. **Transaction recorder** — Logs every staking action (stake, unstake, claim) with full details into a database
3. **Contract interaction** — Calls the staking smart contract on behalf of the platform (where applicable)

---

## 2. API Endpoints Required

### Staking Actions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/stake` | Record a stake transaction after frontend confirms on-chain tx |
| `POST` | `/api/unstake` | Record an unstake transaction |
| `POST` | `/api/claim` | Record a reward claim |

### Read Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/stats` | Return platform-wide stats: current APR, TVL, total stakers |
| `GET` | `/api/user/:address/position` | Return user's staked amount, pending rewards, stake timestamp |
| `GET` | `/api/user/:address/history` | Return paginated transaction history for a user |

### Optional / Nice-to-Have

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/tokens` | List available tokens for staking (TKA, TKB) with metadata |
| `GET` | `/api/leaderboard` | Top stakers by amount |

---

## 3. Database Schema (Guidelines)

You need **2 core tables/collections**:

### Table: `stakes`
Tracks the current state of each user's staking position.

| Field | Description |
|-------|-------------|
| wallet_address | User's wallet address (indexed) |
| token_address | Which token is staked |
| staked_amount | Current amount staked |
| staked_at | Timestamp of first/latest stake |
| rewards_earned | Accumulated rewards to date |
| last_reward_calc | Last time reward was calculated |

### Table: `transactions`
Immutable log of every action.

| Field | Description |
|-------|-------------|
| id | Auto-increment / UUID |
| wallet_address | User's wallet address |
| type | `STAKE` / `UNSTAKE` / `CLAIM` |
| amount | Token amount involved |
| token_address | Which token |
| tx_hash | On-chain transaction hash |
| status | `PENDING` / `CONFIRMED` / `FAILED` |
| created_at | Timestamp |

> **Database choice:** MongoDB (faster to prototype in a hackathon) or PostgreSQL — either works. Pick what the team is fastest with.

---

## 4. Reward Calculation

The task specifies rewards based on a **fixed APR** model.

### How it should work:
- APR is a **platform-configured constant** (e.g., 12% annual)
- Rewards accrue **per second** based on:
  ```
  reward = stakedAmount × (APR / 365 / 24 / 3600) × secondsElapsed
  ```
- Calculate on every read request (`GET /position`) or periodically via a cron/interval
- Store the last calculation timestamp to compute deltas

### What to store as config:
- `APR_RATE` — percentage (e.g., `12` for 12%)
- `REWARD_TOKEN` — which token rewards are paid in
- `MIN_STAKE_AMOUNT` — minimum stake threshold

---

## 5. Smart Contract Interaction Guidelines

The backend needs an **ethers.js provider + signer** (using a platform wallet/private key) to:

1. **Read** the staking contract state (balances, pool info) for stats
2. **Listen** for on-chain events (Staked, Unstaked, RewardsClaimed) to auto-update the DB
3. Optionally **write** transactions (only if the architecture requires backend-signed txs)

### Key consideration:
> **Who signs the staking transaction?**  
> - **Option A (recommended for hackathon):** User signs directly from frontend wallet. Backend only *records* the result after tx confirmation.  
> - **Option B:** Backend holds a signing key and executes on behalf of users. More complex, security concern.  
> 
> **Go with Option A** — simpler, safer, faster to build.

---

## 6. Architecture Flow

```
Frontend (React)
    │
    ├── User signs approve() + stake() via MetaMask (on-chain)
    │
    ├── After tx confirms → POST /api/stake { address, amount, txHash }
    │
    ▼
Backend (Express)
    │
    ├── Validates the tx hash on-chain (optional but recommended)
    ├── Saves to `transactions` table
    ├── Updates `stakes` table
    └── Returns success
    
    │
    ├── GET /api/stats → reads from DB + contract state
    ├── GET /api/user/:addr/position → reads from DB, calculates live rewards
    └── GET /api/user/:addr/history → reads from transactions table
```

---

## 7. Folder Structure (Suggested)

```
server/
├── routes/
│   ├── staking.routes.js
│   └── user.routes.js
├── controllers/
│   ├── staking.controller.js
│   └── user.controller.js
├── services/
│   ├── staking.service.js      # Business logic: reward calc, validation
│   └── blockchain.service.js   # ethers.js contract reads/event listeners
├── models/
│   ├── stake.model.js
│   └── transaction.model.js
├── config/
│   ├── constants.js            # APR, contract addresses, token list
│   └── db.js                   # Database connection
├── middleware/
│   └── validateRequest.js      # Input validation (Joi or Zod)
├── app.js                      # Express app setup
└── server.js                   # Start server
```

---

## 8. Key Decisions to Make

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Database | MongoDB vs PostgreSQL | MongoDB (faster prototype) |
| Tx signing | Frontend vs Backend | Frontend (Option A) |
| Event listening | Poll vs WebSocket | Poll every 30s for hackathon |
| Auth | JWT vs wallet signature | Wallet signature verification (no traditional auth needed) |
| Validation | Joi vs Zod | Either — pick team's preference |

---

## 9. What to Build First (Priority Order)

1. **Express server scaffold** with CORS, JSON parsing, error handling
2. **Database connection + models** (stakes + transactions)
3. **POST /api/stake** — record a stake
4. **GET /api/user/:address/position** — return staked amount + calculated rewards
5. **GET /api/user/:address/history** — return transactions
6. **GET /api/stats** — platform-wide numbers
7. Event listener (if time permits)
