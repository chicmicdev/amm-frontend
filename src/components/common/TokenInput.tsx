import { useState } from 'react';
import type { Token } from '../../types';
import TokenSelector from './TokenSelector';
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

  const handleMax = () => {
    if (balance && onAmountChange) onAmountChange(balance);
  };

  return (
    <>
      <div className="token-input-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
          {balance !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Balance: <span style={{ color: 'var(--text-primary)' }}>{formatTokenAmount(balance, 4)}</span>
              {!readonly && onAmountChange && (
                <button
                  onClick={handleMax}
                  style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 600,
                    color: 'var(--accent-primary)', background: 'rgba(88,166,255,0.1)',
                    border: 'none', cursor: 'pointer', padding: '1px 6px', borderRadius: 4,
                  }}
                >
                  MAX
                </button>
              )}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="token-badge"
            onClick={() => setShowSelector(true)}
          >
            <div className="token-icon" style={{ background: token.logoColor, width: 22, height: 22, fontSize: 10 }}>
              {token.symbol.slice(0, 3)}
            </div>
            <span>{token.symbol}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>▼</span>
          </button>

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
      </div>

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
