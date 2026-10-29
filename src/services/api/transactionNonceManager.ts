import type { Address, Hash } from 'viem';

interface NonceState {
  nextNonce?: number;
  tail: Promise<void>;
}

interface SubmitWithManagedNonceParams {
  account: Address;
  chainId: number;
  getNetworkNonce: () => Promise<number>;
  submit: (nonce: number) => Promise<Hash>;
}

const nonceStates = new Map<string, NonceState>();

function stateKey(chainId: number, account: Address): string {
  return `${chainId}:${account.toLowerCase()}`;
}

function nextNonceFromError(error: unknown): number | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && !seen.has(current); depth += 1) {
    seen.add(current);
    if (typeof current === 'object') {
      const row = current as Record<string, unknown>;
      for (const key of ['details', 'shortMessage', 'message']) {
        if (typeof row[key] !== 'string') continue;
        const match = row[key].match(/next nonce\s+(\d+)/i);
        if (match) return Number.parseInt(match[1], 10);
      }
      current = row.cause;
      continue;
    }
    break;
  }
  return undefined;
}

function isNonceTooLowError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && !seen.has(current); depth += 1) {
    seen.add(current);
    if (typeof current === 'object') {
      const row = current as Record<string, unknown>;
      for (const key of ['details', 'shortMessage', 'message']) {
        if (typeof row[key] === 'string' && /nonce too low/i.test(row[key])) return true;
      }
      current = row.cause;
      continue;
    }
    break;
  }
  return false;
}

function isGappedNonceError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && !seen.has(current); depth += 1) {
    seen.add(current);
    if (typeof current === 'object') {
      const row = current as Record<string, unknown>;
      for (const key of ['details', 'shortMessage', 'message']) {
        if (typeof row[key] === 'string' && /gapped[- ]nonce|nonce too high/i.test(row[key])) return true;
      }
      current = row.cause;
      continue;
    }
    break;
  }
  return false;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Wait for the wallet's RPC to catch up to our local nonce floor. Right after a
 * transaction confirms, a load-balanced node can still report the old count;
 * sending the next nonce then is rejected as "gapped" (always, for EIP-7702
 * delegated accounts). If the node never catches up, fall back to its own count
 * (the earlier transaction was probably dropped).
 */
async function waitForNetworkNonce(
  getNetworkNonce: () => Promise<number>,
  floor: number | undefined,
  initial: number,
): Promise<number> {
  let current = initial;
  for (let i = 0; i < 16 && floor !== undefined && current < floor; i += 1) {
    await sleep(750);
    current = await getNetworkNonce();
  }
  return current;
}

/**
 * Serialize writes per account/chain and track the next expected nonce locally.
 *
 * Some wallet/RPC combinations briefly return a stale `pending` transaction
 * count after a transaction is accepted. The local value is used to wait for
 * the RPC to catch up (see `waitForNetworkNonce`) so the next write neither
 * reuses the submitted nonce nor jumps ahead of it (a "gapped nonce").
 * Transactions are never retried automatically for ambiguous wallet/RPC
 * errors. A definitive "nonce too low" rejection is safe to retry once with
 * the RPC-reported nonce because the original raw transaction was rejected.
 */
export async function submitWithManagedNonce({
  account,
  chainId,
  getNetworkNonce,
  submit,
}: SubmitWithManagedNonceParams): Promise<Hash> {
  const key = stateKey(chainId, account);
  let state = nonceStates.get(key);
  if (!state) {
    state = { tail: Promise.resolve() };
    nonceStates.set(key, state);
  }

  const previous = state.tail;
  let release!: () => void;
  state.tail = new Promise<void>(resolve => {
    release = resolve;
  });

  await previous;
  try {
    const networkNonce = await waitForNetworkNonce(getNetworkNonce, state.nextNonce, await getNetworkNonce());
    // Never send ahead of what the RPC reports: a nonce gap is rejected outright.
    const nonce = networkNonce;
    try {
      const hash = await submit(nonce);
      state.nextNonce = nonce + 1;
      return hash;
    } catch (error) {
      // Preserve the RPC's authoritative floor. Only the definitive nonce
      // rejection below is retried; all other errors remain user-visible.
      if (isGappedNonceError(error)) {
        // Rejected before entering the mempool, so retrying is safe. Re-read the
        // RPC's count (giving a lagging node time to catch up) and resubmit.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await sleep(2000);
          const fresh = await getNetworkNonce();
          try {
            const retryHash = await submit(fresh);
            state.nextNonce = fresh + 1;
            return retryHash;
          } catch (retryError) {
            if (!isGappedNonceError(retryError) || attempt === 2) throw retryError;
          }
        }
      }
      const reportedNextNonce = nextNonceFromError(error);
      if (isNonceTooLowError(error) && reportedNextNonce !== undefined && reportedNextNonce > nonce) {
        state.nextNonce = Math.max(state.nextNonce ?? 0, reportedNextNonce);
        try {
          const retryHash = await submit(reportedNextNonce);
          state.nextNonce = reportedNextNonce + 1;
          return retryHash;
        } catch (retryError) {
          const retryNonce = nextNonceFromError(retryError);
          if (retryNonce !== undefined) state.nextNonce = Math.max(state.nextNonce ?? 0, retryNonce);
          throw retryError;
        }
      }
      if (reportedNextNonce !== undefined) {
        state.nextNonce = Math.max(state.nextNonce ?? 0, reportedNextNonce);
      }
      throw error;
    }
  } finally {
    release();
  }
}
