import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/** Single app-wide toast host (dark theme, top-right) with a close button on every toast. */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ top: 80 }}
      toastOptions={{
        style: {
          background: 'var(--bg-card, #1c2128)',
          color: 'var(--text-primary, #e6edf3)',
          border: '1px solid var(--border, rgba(99,102,241,0.25))',
          borderRadius: 12,
          fontSize: 14,
          maxWidth: 420,
        },
      }}
    >
      {t => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              {t.type === 'success' ? (
                <CheckCircle2 size={20} color="var(--color-success, #22c55e)" style={{ flexShrink: 0, margin: '0 4px' }} />
              ) : t.type === 'error' ? (
                <XCircle size={20} color="var(--color-danger, #ef4444)" style={{ flexShrink: 0, margin: '0 4px' }} />
              ) : (
                icon
              )}
              {message}
              {t.type !== 'loading' && (
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => toast.dismiss(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    marginLeft: 4,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: 'inherit',
                    opacity: 0.6,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                >
                  <X size={16} />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
