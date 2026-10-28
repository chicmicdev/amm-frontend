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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const network = NETWORK_LABEL[chainId];
  const showNetworkBadge = isConnected && !!network;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        className="landing-nav"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'sticky', top: 0, left: 0, right: 0, zIndex: 200,
          height: 64,
          display: 'flex', alignItems: 'center',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          background: (scrolled || menuOpen) ? 'rgba(10,14,26,0.88)' : 'transparent',
          borderBottom: `1px solid ${(scrolled || menuOpen) ? 'rgba(55,65,100,0.4)' : 'transparent'}`,
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >
        <div className="landing-nav-inner">
          {/* Logo */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#BC40DD,#A855F7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              FS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#ffffff', letterSpacing: '0.04em' }}>
                FLUX <span style={{ color: '#BC40DD' }}>SWAP</span>
              </span>
              <span style={{ fontSize: 10, color: '#A855F7', fontWeight: 500, letterSpacing: '0.06em' }}>
                network
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="landing-nav-links">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side: network badge before wallet btn + toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {showNetworkBadge && (
              <div
                className="header-network-pill"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: network.color,
                  border: `1px solid ${network.dot}40`,
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: network.dot,
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.25s',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: network.dot, flexShrink: 0 }} />
                <span className="header-network-name">{network.label}</span>
              </div>
            )}

            <motion.button
              type="button"
              className="landing-nav-connect"
              whileHover={{ scale: 1.04, transition: { duration: 0.15, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => open()}
              style={{
                background: isConnected ? 'rgba(8,11,20,0.8)' : '#BC40DD',
                color: '#fff',
                border: isConnected ? '1px solid rgba(188,64,221,0.35)' : 'none',
                borderRadius: 999,
                padding: '9px 22px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
              }}
            >
              {isConnected ? (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  {formatAddress(address || '')}
                </>
              ) : (
                'Connect Wallet'
              )}
            </motion.button>

            <button
              type="button"
              className="landing-nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="app-nav-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <div
        className={`landing-nav-drawer ${menuOpen ? 'landing-nav-drawer-open' : ''}`}
        id="app-nav-menu"
        role="navigation"
        aria-label="Mobile Navigation"
      >
        <div className="landing-nav-drawer-links">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </div>
        <div className="landing-nav-drawer-cta">
          {showNetworkBadge && (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginBottom: 10, padding: '10px 14px',
                background: network.color,
                border: `1px solid ${network.dot}40`,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                color: network.dot,
                letterSpacing: '0.03em',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: network.dot, flexShrink: 0 }} />
              {network.label}
            </div>
          )}
          <button
            type="button"
            className={isConnected ? 'landing-nav-drawer-wallet-connected' : undefined}
            onClick={() => { open(); setMenuOpen(false); }}
          >
            {isConnected ? formatAddress(address || '') : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </>
  );
}
