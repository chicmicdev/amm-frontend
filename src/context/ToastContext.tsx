import { useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, Info } from 'lucide-react';
import { getTxExplorerUrl } from '../utils/explorer';
import { shortenTxHash } from '../utils/formatUtils';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Adds a "View on explorer" link for this transaction to the toast. */
  txHash?: string;
}

function TxToastBody({ message, txHash }: { message: ReactNode; txHash: string }) {
  const url = getTxExplorerUrl(txHash);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontWeight: 600 }}>{message}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
        <span style={{ fontFamily: 'monospace' }}>{shortenTxHash(txHash)}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent, #818cf8)', textDecoration: 'none', fontWeight: 600 }}
          >
            View on explorer <ExternalLink size={12} />
          </a>
        )}
      </span>
    </div>
  );
}

/** Success toast with an explorer link; usable outside React components too. */
export function notifyTxSuccess(message: string, txHash: string) {
  toast.success(<TxToastBody message={message} txHash={txHash} />, { duration: 8000 });
}

/**
 * Thin wrapper over react-hot-toast — no Provider required.
 */
export function useToast() {
  const showToast = useCallback((type: ToastKind, message: string, options?: ToastOptions) => {
    if (type === 'success') {
      if (options?.txHash) notifyTxSuccess(message, options.txHash);
      else toast.success(message, { duration: 5000 });
      return;
    }
    if (type === 'error') {
      toast.error(message, { duration: 7000 });
      return;
    }
    toast(message, { duration: 4500, icon: <Info size={18} /> });
  }, []);

  return { showToast };
}
