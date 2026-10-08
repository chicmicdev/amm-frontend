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

/**
 * Serialize writes per account/chain and keep a monotonic local nonce floor.
 *
 * Some wallet/RPC combinations briefly return a stale `pending` transaction
 * count after a transaction is accepted. The local floor guarantees that the
 * next write in the same browser session cannot reuse the submitted nonce.
 * Transactions are never retried automatically: an ambiguous wallet/RPC error
 * must remain a user-visible failure to avoid duplicate financial actions.
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
    const networkNonce = await getNetworkNonce();
    const nonce = Math.max(networkNonce, state.nextNonce ?? networkNonce);
    try {
      const hash = await submit(nonce);
      state.nextNonce = nonce + 1;
      return hash;
    } catch (error) {
      // Preserve the RPC's authoritative floor for the next user-initiated
      // attempt, but do not auto-resubmit this potentially ambiguous write.
      const reportedNextNonce = nextNonceFromError(error);
      if (reportedNextNonce !== undefined) {
        state.nextNonce = Math.max(state.nextNonce ?? 0, reportedNextNonce);
      }
      throw error;
    }
  } finally {
    release();
  }
}
