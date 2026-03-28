import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { formatAddress } from '../../utils/formatUtils';

const navLinks = [
  { to: '/stake', label: 'Stake' },
  { to: '/swap', label: 'Swap' },
  { to: '/pool', label: 'Pool' },
  { to: '/positions', label: 'Positions' },
];

export default function Header() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      background: 'rgba(10,14,26,0.9)',
      borderBottom: '1px solid rgba(31,41,55,0.5)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 16px',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <NavLink to="/stake" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: -0.5,
          }}>
            FS
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#f9fafb' }}>
            FLUX{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              SWAP
            </span>
          </span>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="header-nav">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: wallet + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => open()}
            style={{
              background: isConnected ? 'rgba(17,24,39,0.8)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: isConnected ? '1px solid rgba(31,41,55,0.6)' : 'none',
              borderRadius: 10, padding: '8px 14px',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {isConnected ? (
              <>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                {formatAddress(address || '')}
              </>
            ) : (
              'Connect'
            )}
          </button>

          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <div style={{
          background: 'rgba(10,14,26,0.98)',
          borderTop: '1px solid rgba(31,41,55,0.5)',
          padding: '10px 12px 14px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ display: 'block', padding: '10px 12px' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
