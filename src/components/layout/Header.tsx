import { NavLink } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { formatAddress } from '../../utils/formatUtils';

export default function Header() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #58a6ff, #bc8cff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
            letterSpacing: -0.5,
          }}>
            UL
          </div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>UniLite Pro</span>
          <span className="badge" style={{ marginLeft: 4 }}>v3</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavLink to="/swap" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Swap
          </NavLink>
          <NavLink to="/pool" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Pool
          </NavLink>
          <NavLink to="/positions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Positions
          </NavLink>
        </nav>

        {/* Wallet */}
        <button
          onClick={() => open()}
          style={{
            background: isConnected
              ? 'var(--bg-card)'
              : 'linear-gradient(135deg, #58a6ff, #bc8cff)',
            color: 'white',
            border: isConnected ? '1px solid var(--border)' : 'none',
            borderRadius: 10, padding: '8px 16px',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {isConnected ? (
            <>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent-secondary)', display: 'inline-block',
              }} />
              {formatAddress(address || '')}
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </header>
  );
}
