# FLUX SWAP

Uniswap V3–style AMM frontend (swap, pools, positions, staking) plus an Aave-style lending market. React + TypeScript + Vite, wagmi/viem, Reown AppKit.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # serve the build
```

Optional `.env` (all `VITE_`-prefixed):

| Variable | Purpose |
|---|---|
| `VITE_POLYGON_AMOY_RPC` | Override Amoy RPC |
| `VITE_POLYGON_AMOY_HISTORY_RPC` | RPC used for log scans (history) |
| `VITE_POOLS_API_BASE` | Pools API base URL |
| `VITE_FLUX_SWAP_DEV_LOGS` | Enable dev logging |

Connect a wallet on **Polygon Amoy (80002)** for swap/pool/stake, and **Base Sepolia (84532)** for lending.

## Contract addresses

Sources: `src/config/contracts.ts`, `tokens.ts`, `lending.ts`.

### Swap & pools — Polygon Amoy (80002)

| Contract | Address |
|---|---|
| Factory | `0x8D2c055E8554aBCB885bA7128339C2996c629316` |
| SwapRouter | `0x258799F6b0dD66A48fF8d5BF0998ab8304Dc78a9` |
| NonfungiblePositionManager | `0xbA9c05a1A9F645489Ca1efd59877aE742a286F51` |
| PositionDescriptor | `0xE4F48501a7A4a5F0eA782760915d58d55b331eEf` |
| LiquidityHelper | `0x0119D1AEF53258AbD99fbC7A8D5A82581E14CFC1` |
| WETH9 | `0x05677b6Ad6fB1fca3b77a1F28E27f0D5A9C63Ea4` |
| StakingPool | `0x172A0688D35Cf30c7D8e5DA7a1dEF5aa848fB841` |

### Listed tokens — Polygon Amoy

| Token | Address |
|---|---|
| dUSDC | `0x7ba2199aA5191D5255B1f653031263a7F977C782` |
| dWETH | `0x12a903df873e4627926a85100bea6F7F07EbB6Bf` |
| dWBTC | `0x0145A755A7E0e34cb1bCCd886617d57f9b20b94B` |
| dDAI | `0x4D0B3b4Fa0b117A06aD8fe96aB4f29840b306E32` |
| dMATIC | `0x93dc66aaD35559B9E0E0a311820400064f60F910` |
| dLINK | `0x69Be8db62b93b718Af2ceaa5950D3b1fC987E9fD` |
| WETH | `0x5A5c039086d2EbC2104AAaD041421304DBA79c8C` |


Pool addresses are not hardcoded: `Factory.getPool(tokenA, tokenB, fee)` with fee tiers 500 / 3000 / 10000.

### Lending — Base Sepolia (84532)

| Contract | Address |
|---|---|
| POOL | `0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27` |
| POOL_ADDRESSES_PROVIDER | `0xE4C23309117Aa30342BFaae6c95c6478e0A4Ad00` |
| UI_POOL_DATA_PROVIDER | `0x6a9D64f93DB660EaCB2b6E9424792c630CdA87d8` |
| UI_INCENTIVE_DATA_PROVIDER | `0xDB1412acf288D5bE057f8e90fd7b1BF4f84bB3B1` |
| WALLET_BALANCE_PROVIDER | `0x2c4D1F4EC7F4FfA09a5E1C9e74fD3A10f21Bd811` |
| WETH_GATEWAY | `0x0568130e794429D2eEBC4dafE18f25Ff1a1ed8b6` |
| ORACLE | `0x943b0dE18d4abf4eF02A85912F8fc07684C141dF` |
| USDC (6 dec) | `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f` |
| WETH (18 dec) | `0xE5Fc7d0C7C4e7b6e4a1efFe9db1b2e4a88b89b1a` |
