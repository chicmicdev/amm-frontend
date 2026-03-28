import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia, hardhat } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';

export const projectId = 'a1f319ce3901f51cf8c063f7fbe74b6a';

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, sepolia, hardhat];

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
    name: 'AMM v3',
    description: 'Concentrated Liquidity AMM — swap tokens and provide liquidity',
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
