import { Toaster } from 'react-hot-toast';

/** Single app-wide toast host (dark theme, top-right). */
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
    />
  );
}
