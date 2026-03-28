import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Token } from '../../types';
import { TOKENS } from '../../config/tokens';
import TokenIcon from './TokenIcon';

interface Props {
  selected: Token;
  exclude?: Token;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

// ─── stagger container ────────────────────────────────────────────────────────
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export default function TokenSelector({ selected, exclude, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = TOKENS.filter(t => {
    if (exclude && t.address === exclude.address) return false;
    if (!search) return true;
    return (
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    // ── 5. AnimatePresence overlay ──
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* ── 5. Modal panel scales in ── */}
        <motion.div
          className="modal"
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Select a token</h3>
            <motion.button
              className="btn-ghost"
              onClick={onClose}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              style={{ fontSize: 20, padding: '0 6px' }}
            >
              ×
            </motion.button>
          </div>

          <input
            type="text"
            placeholder="Search name or address"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              marginBottom: 12,
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(88,166,255,0.18)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {/* ── 5. Staggered token list ── */}
          <motion.div
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {filtered.map(token => (
              <motion.button
                key={token.address}
                variants={rowVariants}
                onClick={() => { onSelect(token); onClose(); }}
                whileHover={{ backgroundColor: 'var(--bg-secondary)', x: 2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: token.address === selected.address ? 'var(--bg-secondary)' : 'transparent',
                  border: token.address === selected.address ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left',
                  width: '100%',
                }}
              >
                <TokenIcon token={token} size="lg" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{token.symbol}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{token.name}</div>
                </div>
                {token.address === selected.address && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontSize: 14 }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            ))}
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24, fontSize: 14 }}
              >
                No tokens found
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
