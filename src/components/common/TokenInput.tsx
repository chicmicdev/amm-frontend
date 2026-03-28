import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Token } from '../../types';
import TokenSelector from './TokenSelector';
import TokenIcon from './TokenIcon';
import { formatTokenAmount } from '../../utils/formatUtils';

interface Props {
  label: string;
  token: Token;
  amount: string;
  balance?: string;
  onTokenChange: (token: Token) => void;
  onAmountChange?: (amount: string) => void;
  excludeToken?: Token;
  readonly?: boolean;
  loading?: boolean;
}

export default function TokenInput({
  label, token, amount, balance, onTokenChange,
  onAmountChange, excludeToken, readonly = false, loading = false
}: Props) {
  const [showSelector, setShowSelector] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleMax = () => {
    if (balance && onAmountChange) onAmountChange(balance);
  };

  return (
    <>
      {/* ── 3. Input focus glow via motion.div ── */}
      <motion.div
        className="token-input-wrapper"
        animate={{
          borderColor: focused ? 'var(--accent-primary)' : 'var(--border)',
          boxShadow: focused
            ? '0 0 0 2px rgba(88,166,255,0.18), inset 0 0 12px rgba(88,166,255,0.04)'
            : '0 0 0 0px rgba(88,166,255,0)',
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ border: '1px solid var(--border)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
          {balance !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Balance: <span style={{ color: 'var(--text-primary)' }}>{formatTokenAmount(balance, 4)}</span>
              {!readonly && onAmountChange && (
                <motion.button
                  onClick={handleMax}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 600,
                    color: 'var(--accent-primary)', background: 'rgba(88,166,255,0.1)',
                    border: 'none', cursor: 'pointer', padding: '1px 6px', borderRadius: 4,
                  }}
                >
                  MAX
                </motion.button>
              )}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Token badge with hover pop */}
          <motion.button
            className="token-badge"
            onClick={() => setShowSelector(true)}
            whileHover={{ scale: 1.04, borderColor: 'var(--accent-primary)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <TokenIcon token={token} size="md" />
            <span>{token.symbol}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>▼</span>
          </motion.button>

          <div style={{ flex: 1, textAlign: 'right' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span className="spinner" />
              </div>
            ) : (
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={e => onAmountChange?.(e.target.value)}
                readOnly={readonly}
                onFocus={() => !readonly && setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  fontSize: 24, fontWeight: 600, color: 'var(--text-primary)',
                  textAlign: 'right', width: '100%',
                  cursor: readonly ? 'default' : 'text',
                }}
              />
            )}
          </div>
        </div>
      </motion.div>

      {showSelector && (
        <TokenSelector
          selected={token}
          exclude={excludeToken}
          onSelect={onTokenChange}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  );
}
