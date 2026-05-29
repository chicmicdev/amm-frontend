/**
 * Developer logging: Vite dev server, VITE_FLUX_SWAP_DEV_LOGS=true, or
 * localStorage `flux-swap-dev-logs` = `1` (run in console: localStorage.setItem('flux-swap-dev-logs','1')).
 */
function loggingEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.VITE_FLUX_SWAP_DEV_LOGS === 'true') return true;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      return globalThis.localStorage.getItem('flux-swap-dev-logs') === '1';
    } catch {
      return false;
    }
  }
  return false;
}

function stamp(scope: string): string {
  return `[${new Date().toISOString()}][FluxSwap:${scope}]`;
}

export function devLog(scope: string, ...args: unknown[]): void {
  if (!loggingEnabled()) return;
  console.log(stamp(scope), ...args);
}

export function devWarn(scope: string, ...args: unknown[]): void {
  if (!loggingEnabled()) return;
  console.warn(stamp(scope), ...args);
}

export function devError(scope: string, ...args: unknown[]): void {
  if (!loggingEnabled()) return;
  console.error(stamp(scope), ...args);
}
