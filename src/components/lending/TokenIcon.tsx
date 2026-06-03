import { tokenColor } from './lendingUtils';

interface TokenIconProps {
  symbol: string;
  size?: number;
}

export function TokenIcon({ symbol, size = 32 }: TokenIconProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: tokenColor(symbol),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.3, color: 'white', flexShrink: 0,
    }}>
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}
