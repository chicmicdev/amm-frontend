# 🖥️ Frontend Guide — Token Staking

> **Stack:** React + TypeScript + Tailwind CSS + lightweight-charts  
> **Design Philosophy:** Borrow from Lido, Aave, and Rocket Pool — dark theme, clean cards, real-time feedback.

---

## Part 1: Design

### 1.1 Theme & Palette

| Token | Value |
|-------|-------|
| Background | `#0a0e1a` (deep navy-black) |
| Surface / Cards | `#111827` with subtle border `#1f2937` |
| Primary accent | Gradient `#6366f1 → #8b5cf6` (indigo-violet) |
| Success | `#10b981` |
| Warning / Risk | `#f59e0b` |
| Text Primary | `#f9fafb` |
| Text Secondary | `#9ca3af` |
| Font | **Inter** (Google Fonts) |

> Inspiration: Lido's clean card layouts + Aave's data-dense yet readable dashboard.

### 1.2 Layout Structure

```
┌──────────────────────────────────────────────────┐
│  Navbar  [ Logo | Staking | Dashboard | Wallet ] │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────┐   ┌──────────────────────────┐  │
│  │ Stake Card  │   │  Staking Stats Overview  │  │
│  │ (main CTA)  │   │  APR, TVL, Your Staked   │  │
│  └─────────────┘   └──────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │         Transaction History Table            │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  Footer                                          │
└──────────────────────────────────────────────────┘
```

### 1.3 Pages (3 total)

| # | Page | Purpose |
|---|------|---------|
| 1 | **Staking** (landing) | Stake / Unstake card + live stats |
| 2 | **Dashboard** | User's positions, earnings, claimable rewards |
| 3 | **History** | Full transaction log (stake, unstake, reward claims) |

### 1.4 Key UI Components

#### A. Stake Card (Central Action)
- Token selector dropdown (TKA / TKB)
- Amount input with MAX button
- Wallet balance shown inline
- Toggle tabs: **Stake** | **Unstake**
- CTA button with gradient + hover pulse animation
- Estimated rewards preview below the button

#### B. Stats Bar (Top of page or sidebar)
- **APR** — large number, green accent
- **TVL** — total value locked in the pool
- **Your Staked** — user's staked balance
- **Rewards Earned** — claimable amount with "Claim" mini-button
- Each stat in its own glassmorphism card with subtle glow

#### C. Insights Chart (Rewards Over Time)
- Use **`lightweight-charts`** (TradingView) — fast, canvas-based, financial-grade
- Chart type: **Area chart** with indigo-violet gradient fill
- Data series: accumulated rewards per day
- Features to enable: crosshair, time scale, fit-content
- Style overrides: transparent background, match app font, hide default grid lines
- Wrapper: `<RewardsChart />` React component that initialises the chart in a `useEffect` and destroys it on unmount

#### D. Transaction History Table
- Columns: `Date | Type (Stake/Unstake/Claim) | Amount | Status | Tx Hash`
- Type column: color-coded badges (green=stake, orange=unstake, blue=claim)
- Paginated, sortable by date
- Empty state: illustration + "No transactions yet"

#### D. Wallet Connection
- Top-right button: "Connect Wallet"
- Connected state: truncated address + identicon + disconnect dropdown
- Network indicator dot (green=correct chain, red=wrong chain)

### 1.5 Micro-interactions & Polish
- **Stake button:** gradient shimmer on hover, scale-up on press
- **Number inputs:** animated counter on stats when values update
- **Toast notifications:** slide-in from top-right for tx status (pending → confirmed → success/fail)
- **Skeleton loaders:** on all data-dependent components while fetching
- **Smooth tab transitions** on Stake/Unstake toggle

### 1.6 Responsive Breakpoints
- **Desktop (≥1024px):** 2-column layout (card left, stats right)
- **Tablet (768-1023px):** stacked, full-width cards
- **Mobile (<768px):** single column, bottom-sheet for wallet

---

## Part 2: Functionality

### 2.1 Wallet Integration
- Use **ethers.js v6** + MetaMask (`window.ethereum`)
- Detect chain — prompt switch to localhost/testnet if wrong
- Persist connection state in `localStorage`

### 2.2 Smart Contract Interactions

All interactions go through **backend API** (not directly to contracts from frontend).

| Action | API Call | What Happens |
|--------|----------|-------------|
| Stake | `POST /api/stake` | Backend calls staking contract, records tx |
| Unstake | `POST /api/unstake` | Backend calls contract, records tx |
| Claim Rewards | `POST /api/claim` | Backend claims and records |
| Get Stats | `GET /api/stats` | Returns APR, TVL, pool info |
| Get User Position | `GET /api/user/:address/position` | Returns staked amount, rewards |
| Get History | `GET /api/user/:address/history` | Returns paginated tx history |

> **Note:** Token approvals (ERC-20 `approve()`) must happen on the frontend directly via wallet signing, since the user must authorize spending from their own wallet.

### 2.3 State Management
- **React Context** for wallet state (address, chainId, connected)
- **React Query / SWR** for API data with auto-refetch on interval (every 15s for stats)
- Local component state for form inputs

### 2.4 Key Flows

#### Flow 1: Staking
```
1. User enters amount
2. Frontend checks balance (contract call via ethers)
3. User clicks "Stake"
4. Frontend calls token.approve(stakingContract, amount) — wallet popup
5. On approval confirmed → POST /api/stake { address, amount, tokenAddress }
6. Show pending toast → poll for tx confirmation → success/error toast
7. Refresh stats + history
```

#### Flow 2: Claiming Rewards
```
1. Dashboard shows claimable rewards (from GET /api/user/:address/position)
2. User clicks "Claim"
3. POST /api/claim { address }
4. Toast notifications for tx lifecycle
5. Refresh position + history
```

### 2.5 Folder Structure (Suggested)

```
src/
├── components/
│   ├── Navbar.tsx
│   ├── StakeCard.tsx
│   ├── StatsBar.tsx
│   ├── TransactionTable.tsx
│   ├── WalletButton.tsx
│   └── ui/           # Reusable: Button, Card, Badge, Input, Toast
├── pages/
│   ├── StakingPage.tsx
│   ├── DashboardPage.tsx
│   └── HistoryPage.tsx
├── context/
│   └── WalletContext.tsx
├── hooks/
│   ├── useWallet.ts
│   ├── useStaking.ts
│   └── useTransactions.ts
├── services/
│   ├── api.ts          # Axios instance + API calls
│   └── contracts.ts    # ethers contract instances (for approve, balanceOf)
├── utils/
│   ├── formatters.ts   # address truncation, number formatting
│   └── constants.ts    # contract addresses, ABI fragments
├── App.tsx
└── index.css           # Tailwind base + custom theme tokens
```

### 2.6 Dependencies

```
react, react-dom, react-router-dom
typescript
tailwindcss
ethers (v6)
axios
react-hot-toast (notifications)
@tanstack/react-query (data fetching)
lightweight-charts       ← TradingView charts for Rewards insights
```

> **`lightweight-charts` notes:**
> - Install: `npm install lightweight-charts`
> - Works via direct DOM ref — do NOT use SSR without a guard
> - Initialise inside `useEffect(() => { ... }, [])` and call `chart.remove()` in cleanup
> - Use `createChart(container, options)` → `chart.addAreaSeries()` for the rewards curve
