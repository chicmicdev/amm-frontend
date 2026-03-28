import { useToast } from '../../context/ToastContext';

const icons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[toast.type]}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'inherit', opacity: 0.7, fontSize: 16, flexShrink: 0, padding: 0
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
