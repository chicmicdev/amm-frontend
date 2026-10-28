import { CONTRACT_ERRORS } from '../config/contracts';
import { collectViemErrorText } from './viemErrors';

const USER_REJECTED_RE = /User rejected|User denied|denied transaction|rejected the request|ACTION_REJECTED|\b4001\b/i;
const MAX_MESSAGE_LENGTH = 100;

export function isUserRejection(err: unknown): boolean {
  return USER_REJECTED_RE.test(collectViemErrorText(err));
}

/** Pick the shortest human-readable message viem/ethers/Error exposes. */
function primaryMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const o = err as { shortMessage?: unknown; reason?: unknown; message?: unknown };
    for (const v of [o.shortMessage, o.reason, o.message]) {
      if (typeof v === 'string' && v.trim()) return v;
    }
  }
  return '';
}

/**
 * Convert any thrown value into a message safe to show in the UI.
 * Never throws and always returns a non-empty string.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isUserRejection(err)) return 'Request was rejected in your wallet.';

  const text = collectViemErrorText(err);
  for (const [code, friendly] of Object.entries(CONTRACT_ERRORS)) {
    if (text.includes(code)) return friendly;
  }
  if (/insufficient funds/i.test(text)) return 'Not enough native token to pay for gas.';
  if (/Failed to fetch|NetworkError|network request failed|HttpRequestError|timeout/i.test(text)) {
    return 'Network problem. Check your connection or RPC endpoint and try again.';
  }

  if (/Internal JSON-RPC error|InternalRpcError|execution reverted|reverted|CALL_EXCEPTION|simulation failed|ContractFunctionExecutionError/i.test(text)) {
    return 'Transaction failed. Please check your inputs and try again.';
  }
  if (/nonce too low|replacement transaction|already known/i.test(text)) {
    return 'Wallet is out of sync. Refresh and try again.';
  }

  // viem appends "Request Arguments / Details / Version" blocks; keep the first line only.
  const msg = primaryMessage(err).split('\n')[0].trim();
  // Anything that still looks like raw chain output (hex data, call args, URLs) is not user-facing.
  if (!msg || /0x[0-9a-fA-F]{16,}|Contract Call|Request Arguments|https?:\/\//i.test(msg)) return fallback;
  return msg.length > MAX_MESSAGE_LENGTH ? `${msg.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : msg;
}
