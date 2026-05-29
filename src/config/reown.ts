import { defineChain } from 'viem';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { polygonAmoy, sepolia, hardhat } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';

export const projectId = 'a1f319ce3901f51cf8c063f7fbe74b6a';

/** Use Alchemy/Infura/DRPC if the public Amoy endpoint is flaky. */
const amoyRpcOverride = import.meta.env.VITE_POLYGON_AMOY_RPC?.trim();

const amoyNetwork: AppKitNetwork = amoyRpcOverride
  ? defineChain({
      ...polygonAmoy,
      rpcUrls: {
        default: { http: [amoyRpcOverride] },
      },
    })
  : polygonAmoy;

/** Amoy first so the wallet modal defaults to the chain your contracts use. */
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [amoyNetwork, sepolia, hardhat];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

export const appkitModal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Flux Swap',
    description: 'Flux Swap — concentrated liquidity DEX: swap tokens and provide liquidity',
    url: 'http://localhost:5173',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  features: {
    analytics: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#58a6ff',
    '--w3m-border-radius-master': '12px',
  },
});
