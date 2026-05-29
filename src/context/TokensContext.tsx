import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Token } from '../types';
import { tokensWithPlaceholderDecimals } from '../config/tokens';
import { listedTokensFromCache, prefetchListedTokenDecimals } from '../services/api/tokenMetadata';
import { devLog, devWarn } from '../utils/devLog';

type TokensContextValue = {
  tokens: Token[];
  /** True after first prefetch attempt (success or failure). */
  decimalsReady: boolean;
};

const TokensContext = createContext<TokensContextValue | null>(null);

export function TokensProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Token[]>(() => tokensWithPlaceholderDecimals());
  const [decimalsReady, setDecimalsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      devLog('tokens', 'Prefetching ERC-20 decimals for listed tokens…');
      try {
        await prefetchListedTokenDecimals();
        if (cancelled) return;
        const next = listedTokensFromCache();
        setTokens(next);
        devLog('tokens', 'Token decimals loaded', next.map(t => `${t.symbol}=${t.decimals}`).join(', '));
      } catch (e) {
        devWarn('tokens', 'Could not prefetch decimals (RPC / network). Using placeholders until reads run.', e);
        if (!cancelled) setTokens(tokensWithPlaceholderDecimals());
      } finally {
        if (!cancelled) setDecimalsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ tokens, decimalsReady }), [tokens, decimalsReady]);

  return <TokensContext.Provider value={value}>{children}</TokensContext.Provider>;
}

export function useTokens(): TokensContextValue {
  const ctx = useContext(TokensContext);
  if (!ctx) {
    throw new Error('useTokens must be used within TokensProvider');
  }
  return ctx;
}
