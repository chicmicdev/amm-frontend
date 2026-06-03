interface Props {
  slippage: number;
  onChange: (value: number) => void;
  onClose: () => void;
}

const PRESETS = [0.5, 1.0, 2.0];

export default function SlippageSettings({ slippage, onChange, onClose }: Props) {
  const isCustom = !PRESETS.includes(slippage);

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Transaction Settings</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 20 }}>×</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Slippage Tolerance</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 600, fontSize: 14,
                cursor: 'pointer', border: '1px solid',
                background: slippage === p ? 'rgba(88,166,255,0.15)' : 'var(--bg-secondary)',
                borderColor: slippage === p ? 'var(--accent-primary)' : 'var(--border)',
                color: slippage === p ? 'var(--accent-primary)' : 'var(--text-primary)',
                transition: 'all 0.2s',
              }}
            >
              {p}%
            </button>
          ))}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: isCustom ? 'rgba(88,166,255,0.15)' : 'var(--bg-secondary)',
            border: `1px solid ${isCustom ? 'var(--accent-primary)' : 'var(--border)'}`,
            borderRadius: 8, padding: '0 8px',
          }}>
            <input
              type="number"
              value={isCustom ? slippage : ''}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0 && v <= 50) onChange(v);
              }}
              placeholder="Custom"
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 600, width: '100%',
                color: isCustom ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        {slippage > 5 && (
          <div className="warning-box">
            ⚠ High slippage tolerance. Your transaction may be frontrun.
          </div>
        )}
        {slippage < 0.05 && (
          <div className="warning-box">
            ⚠ Very low slippage. Your transaction may fail.
          </div>
        )}
      </div>
  );
}
