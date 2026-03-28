import { useState } from 'react';
import type { Token } from '../../types';
import { TOKENS } from '../../config/tokens';

interface Props {
  selected: Token;
  exclude?: Token;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Select a token</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 20, padding: '0 6px' }}>×</button>
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
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(token => (
            <button
              key={token.address}
              onClick={() => { onSelect(token); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: token.address === selected.address ? 'var(--bg-secondary)' : 'transparent',
                border: token.address === selected.address ? '1px solid var(--accent-primary)' : '1px solid transparent',
                cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left',
                transition: 'background 0.15s', width: '100%',
              }}
              >
              <div
                className="token-icon"
                style={{ background: token.logoColor, minWidth: 36, minHeight: 36, width: 36, height: 36, fontSize: 13 }}
              >
                {token.symbol.slice(0, 3)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{token.symbol}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{token.name}</div>
              </div>
              {token.address === selected.address && (
                <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontSize: 14 }}>✓</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24, fontSize: 14 }}>
              No tokens found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
