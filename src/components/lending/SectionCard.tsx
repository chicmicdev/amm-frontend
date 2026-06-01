import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionCardProps {
  title: string;
  badge?: React.ReactNode;
  headerMeta?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({
  title, badge, headerMeta, headerRight, children,
}: SectionCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 20,
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        transition: 'border-bottom 0.2s',
      }}>
        {/* Title row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: headerMeta ? 8 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {title}
            </span>
            {badge}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {headerRight}
            {/* Accordion chevron */}
            <motion.button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Collapse section' : 'Expand section'}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6,
                fontSize: 12, fontWeight: 600,
              }}
              whileHover={{ color: 'var(--text-primary)' }}
            >
              {open ? 'Hide' : 'Show'}
              <motion.span
                animate={{ rotate: open ? 0 : 180 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ display: 'inline-flex', fontSize: 14, lineHeight: 1 }}
              >
                ↑
              </motion.span>
            </motion.button>
          </div>
        </div>

        {/* Sub-stats row */}
        {headerMeta && <div>{headerMeta}</div>}
      </div>

      {/* ── Accordion body ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
