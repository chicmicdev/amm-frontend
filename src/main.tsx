import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './config/reown'; // initializes AppKit modal
import App from './App';
import { wagmiAdapter } from './config/reown';
import { TokensProvider } from './context/TokensContext';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TokensProvider>
          <App />
        </TokensProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
