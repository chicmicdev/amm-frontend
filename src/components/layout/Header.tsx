import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useChainId } from 'wagmi';
import { formatAddress } from '../../utils/formatUtils';
import { CHAIN_ID } from '../../config/contracts';
import { LENDING_CHAIN_ID } from '../../config/lending';

const NETWORK_LABEL: Record<number, { label: string; color: string; dot: string }> = {
  [CHAIN_ID]:         { label: 'Polygon Amoy', color: 'rgba(130,71,229,0.15)', dot: '#8247e5' },
  [LENDING_CHAIN_ID]: { label: 'Base Sepolia',  color: 'rgba(0,82,255,0.12)',   dot: '#0052ff' },
};

const navLinks = [
  { to: '/stake',     label: 'Stake'     },
  { to: '/swap',      label: 'Swap'      },
  { to: '/pool',      label: 'Pool'      },
  { to: '/positions', label: 'Positions' },
  { to: '/lend',      label: 'Lend'      },
];

export default function Header() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);

  const network = NETWORK_LABEL[chainId];
  // Show badge only when connected and on a known chain
  const showNetworkBadge = isConnected && !!network;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(10,14,26,0.88)' : 'rgba(10,14,26,0.6)',
        borderBottom: scrolled ? '1px solid rgba(55,65,100,0.45)' : '1px solid transparent',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 24px',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: 'white',
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
        </Link>

        {/* Desktop nav */}
        <nav className="header-nav" style={{ display: 'flex', gap: 4 }}>
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side: network badge + wallet + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {showNetworkBadge && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: network.color,
              border: `1px solid ${network.dot}40`,
              borderRadius: 999, padding: '5px 10px',
              fontSize: 11, fontWeight: 700, color: network.dot,
              letterSpacing: '0.03em', whiteSpace: 'nowrap',
              transition: 'all 0.25s',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: network.dot, flexShrink: 0 }} />
              {network.label}
            </div>
          )}

          <motion.button
            onClick={() => open()}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: isConnected
                ? 'rgba(17,24,39,0.8)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: isConnected ? '1px solid rgba(55,65,100,0.6)' : 'none',
              borderRadius: 12,
              padding: '9px 18px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}
          >
            {isConnected ? (
              <>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#10b981', display: 'inline-block', flexShrink: 0,
                }} />
                {formatAddress(address || '')}
              </>
            ) : (
              'Connect Wallet'
            )}
          </motion.button>

          {/* Hamburger — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(10,14,26,0.97)',
            borderTop: '1px solid rgba(55,65,100,0.4)',
            padding: '10px 16px 16px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ display: 'block', padding: '11px 12px' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </motion.div>
      )}
    </header>
  );
}
