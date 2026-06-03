import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChainId, useSwitchChain } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { CHAIN_ID } from '../config/contracts';
import { LENDING_CHAIN_ID } from '../config/lending';

/**
 * Watches the current route and automatically switches the wallet to the
 * correct network:
 *   /lend  → Base Sepolia  (84532)
 *   all other routes → Polygon Amoy (80002)
 *
 * Only fires when the wallet is connected and is already on the wrong chain.
 * The `isPending` guard prevents duplicate switch requests.
 */
export function useNetworkGuard() {
  const { pathname } = useLocation();
  const { isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const targetChainId = pathname === '/lend' ? LENDING_CHAIN_ID : CHAIN_ID;

  useEffect(() => {
    if (!isConnected) return;       // wallet not connected — nothing to switch
    if (isPending) return;          // switch already in flight
    if (chainId === targetChainId) return; // already on the right chain

    switchChain({ chainId: targetChainId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
