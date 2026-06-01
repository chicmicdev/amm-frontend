import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValue,
} from 'framer-motion';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import TiltCard from '../components/common/TiltCard';
import { formatAddress } from '../utils/formatUtils';

/* ─── Scroll progress bar ────────────────────────────────────────────────── */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
        transformOrigin: '0%',
        scaleX,
        zIndex: 999,
        pointerEvents: 'none',
      }}
    />
  );
}

/* ─── Floating background orbs ───────────────────────────────────────────── */
interface OrbDef { x: string; y: string; size: number; color: string; duration: number; delay?: number; }
function FloatingOrbs({ orbs }: { orbs: OrbDef[] }) {
  return (
    <>
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: o.x, top: o.y,
            width: o.size, height: o.size, borderRadius: '50%',
            background: o.color, filter: `blur(${Math.min(Math.round(o.size * 0.25), 70)}px)`,
            pointerEvents: 'none', zIndex: 0,
          }}
          animate={{
            x: [0, 45, -25, 18, 0],
            y: [0, -35, 22, -12, 0],
            scale: [1, 1.1, 0.93, 1.05, 1],
            opacity: [0.7, 1, 0.55, 0.9, 0.7],
          }}
          transition={{ duration: o.duration, delay: o.delay ?? 0, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

/* ─── Hero mouse spotlight ───────────────────────────────────────────────── */
function HeroSpotlight() {
  const [pos, setPos] = useState({ x: 50, y: 40 });
  useEffect(() => {
    const el = document.querySelector('.landing-hero-section') as HTMLElement | null;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    el.addEventListener('mousemove', handler, { passive: true });
    return () => el.removeEventListener('mousemove', handler);
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: `radial-gradient(circle 600px at ${pos.x}% ${pos.y}%, rgba(99,102,241,0.08) 0%, transparent 70%)`,
      transition: 'background 0.08s linear',
    }} />
  );
}

/* ─── Particles ──────────────────────────────────────────────────────────── */
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const mouse = { x: -9999, y: -9999 };
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; }
    const pts: P[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      a: Math.random() * 0.5 + 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const dx = mouse.x - p.x; const dy = mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 160) { const f = (160 - d) / 160 * 0.00015; p.vx += dx * f; p.vy += dy * f; }
        p.vx *= 0.999; p.vy *= 0.999;
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x; const dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) { ctx.strokeStyle = `rgba(99,102,241,${(1 - d / 130) * 0.22})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(139,92,246,${p.a})`; ctx.fill(); });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ─── App Mockup (decorative) ────────────────────────────────────────────── */
function AppMockup({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{
      width: 340 * scale, background: 'linear-gradient(145deg, rgba(22,30,46,0.97), rgba(13,17,31,0.99))',
      border: '1px solid rgba(99,102,241,0.28)', borderRadius: 24 * scale, padding: 24 * scale,
      boxShadow: '0 48px 96px rgba(0,0,0,0.7), 0 0 80px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
      backdropFilter: 'blur(24px)', flexShrink: 0,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 * scale }}>
        <span style={{ fontSize: 14 * scale, fontWeight: 800, color: '#e6edf3' }}>Stake Tokens</span>
        <span style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: `3px ${10 * scale}px`, fontSize: 11 * scale, fontWeight: 700, color: '#818cf8' }}>12% APR</span>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(10,14,26,0.8)', borderRadius: 10, padding: 4, marginBottom: 18 * scale }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 7, textAlign: 'center', fontSize: 12 * scale, fontWeight: 700, color: '#fff', paddingTop: 8 * scale, paddingBottom: 8 * scale }}>Stake</div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12 * scale, fontWeight: 600, color: '#9ca3af', paddingTop: 8 * scale, paddingBottom: 8 * scale }}>Unstake</div>
      </div>
      {/* Token selector */}
      <div style={{ background: 'rgba(10,14,26,0.6)', border: '1px solid rgba(55,65,100,0.4)', borderRadius: 12, padding: `${12 * scale}px ${14 * scale}px`, marginBottom: 10 * scale, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26 * scale, height: 26 * scale, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 * scale, fontWeight: 800, color: '#818cf8' }}>TK</div>
          <span style={{ fontSize: 13 * scale, fontWeight: 700, color: '#e6edf3' }}>TKA</span>
        </div>
        <svg width={14 * scale} height={14 * scale} viewBox="0 0 24 24" fill="none" stroke="rgba(156,163,175,0.5)" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      {/* Amount */}
      <div style={{ background: 'rgba(10,14,26,0.6)', border: '1px solid rgba(55,65,100,0.4)', borderRadius: 12, padding: `${13 * scale}px ${14 * scale}px`, marginBottom: 8 * scale, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 17 * scale, fontWeight: 700, color: 'rgba(156,163,175,0.45)' }}>0.0</span>
        <div style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.28)', borderRadius: 6, padding: `3px ${9 * scale}px`, fontSize: 10 * scale, fontWeight: 700, color: '#818cf8' }}>MAX</div>
      </div>
      {/* Balance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 * scale, color: '#9ca3af', marginBottom: 14 * scale }}>
        <span>Balance: <strong style={{ color: '#e6edf3' }}>1,000.00 TKA</strong></span>
        <span style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '2px 8px', color: '#10b981', fontSize: 9 * scale, fontWeight: 700 }}>New Stake Available</span>
      </div>
      {/* Rewards preview */}
      <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: `${11 * scale}px ${13 * scale}px`, marginBottom: 14 * scale }}>
        <div style={{ fontSize: 9 * scale, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Rewards Preview</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11 * scale, color: '#9ca3af' }}>
          <span>Daily: <strong style={{ color: '#10b981' }}>0.0000 TKA</strong></span>
          <span>Monthly: <strong style={{ color: '#10b981' }}>0.0000 TKA</strong></span>
        </div>
      </div>
      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 13 * scale, padding: `${13 * scale}px`, textAlign: 'center', fontSize: 14 * scale, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>
        Stake Tokens
      </div>
    </div>
  );
}

/* ─── Animated counter ───────────────────────────────────────────────────── */
function Counter({ to, prefix = '', suffix = '', decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1800;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setVal((1 - Math.pow(1 - t, 3)) * to);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.11 } } };

const LANDING_NAV_LINKS = ['Stake', 'Swap', 'Pool', 'Positions', 'Lend'] as const;

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
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

  const linkStyle: CSSProperties = { color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' };

  return (
    <>
      <motion.nav
        className="landing-nav"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          height: 64,
          display: 'flex', alignItems: 'center',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          background: scrolled ? 'rgba(10,14,26,0.88)' : 'transparent',
          borderBottom: scrolled ? '1px solid rgba(55,65,100,0.4)' : 'none',
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >
        <div className="landing-nav-inner">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }} onClick={() => setMenuOpen(false)}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white' }}>FS</div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#f9fafb' }}>FLUX <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SWAP</span></span>
          </Link>
          <div className="landing-nav-links">
            {LANDING_NAV_LINKS.map(l => (
              <Link
                key={l}
                to={`/${l.toLowerCase()}`}
                style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
              >{l}</Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <motion.button
              type="button"
              className="landing-nav-connect"
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => open()}
              style={{
                background: isConnected
                  ? 'rgba(17,24,39,0.85)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff',
                border: isConnected ? '1px solid rgba(55,65,100,0.55)' : 'none',
                borderRadius: 12,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
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
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              )}
            </button>
          </div>
        </div>
      </motion.nav>
      <div className={`landing-nav-drawer ${menuOpen ? 'landing-nav-drawer-open' : ''}`} id="landing-nav-menu" role="navigation" aria-label="Mobile">
        <div className="landing-nav-drawer-links">
          {LANDING_NAV_LINKS.map(l => (
            <Link key={l} to={`/${l.toLowerCase()}`} onClick={() => setMenuOpen(false)}>{l}</Link>
          ))}
        </div>
        <div className="landing-nav-drawer-cta">
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

/* ─── Hero — 2-col with floating 3-D mockup ──────────────────────────────── */
function Hero() {
  const { scrollY } = useScroll();
  const textY      = useTransform(scrollY, [0, 400], [0, -60]);
  const textOp     = useTransform(scrollY, [0, 300], [1, 0]);

  /* floating bob on the mockup */
  const bobY = useMotionValue(0);
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 0.016;
      bobY.set(Math.sin(t * 0.9) * 12);
    }, 16);
    return () => clearInterval(id);
  }, [bobY]);

  const springBob = useSpring(bobY, { stiffness: 60, damping: 12 });

  return (
    <section
      className="landing-hero-section"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 60% 0%, rgba(99,102,241,0.14) 0%, transparent 70%), var(--bg-primary)',
      }}
    >
      <ParticlesCanvas />
      <HeroSpotlight />
      <FloatingOrbs orbs={[
        { x: '3%',  y: '10%', size: 280, color: 'rgba(99,102,241,0.12)',  duration: 12 },
        { x: '72%', y: '40%', size: 220, color: 'rgba(139,92,246,0.10)', duration: 14, delay: 2 },
        { x: '35%', y: '55%', size: 180, color: 'rgba(16,185,129,0.07)', duration: 10, delay: 4 },
      ]} />

      <div className="landing-hero-inner landing-hero-row">

        {/* ── Left: copy ── */}
        <motion.div className="landing-hero-copy" style={{ y: textY, opacity: textOp }}>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ marginBottom: 28 }}>
            <motion.span
              animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 18px rgba(99,102,241,0.55)', '0 0 0px rgba(99,102,241,0)'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.34)', color: '#818cf8', borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}
            >
              ⚡ NOW LIVE ON TESTNET
            </motion.span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontSize: 'clamp(38px, 5.5vw, 72px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.04em', margin: '0 0 20px', color: '#e6edf3' }}
          >
            The Future of{' '}
            <span className="landing-gradient-text-animated">DeFi</span>{' '}
            is Here.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="landing-hero-lead"
            style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: '#9ca3af', maxWidth: 440, margin: '0 0 40px', lineHeight: 1.7 }}
          >
            Stake, swap, provide liquidity, and lend — all in one protocol. Earn up to{' '}
            <span style={{ color: '#10b981', fontWeight: 700 }}>12% APR</span>{' '}
            with audited, transparent smart contracts.
          </motion.p>

          <motion.div className="landing-hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/stake">
              <motion.button
                animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.3)', '0 0 48px rgba(99,102,241,0.7)', '0 0 20px rgba(99,102,241,0.3)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 34px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
                Launch App →
              </motion.button>
            </Link>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'transparent', color: '#e6edf3', border: '1px solid rgba(55,65,100,0.7)', borderRadius: 14, padding: '14px 34px', fontSize: 16, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}>
              Explore
            </motion.button>
          </motion.div>

          {/* Mini stats */}
          <motion.div className="landing-hero-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }}>
            {[['$2.4M', 'Total Locked'], ['12%', 'APR'], ['1,420+', 'Stakers']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#e6edf3', letterSpacing: '-0.02em' }}>{v}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right: floating 3-D mockup ── */}
        <motion.div
          className="landing-hero-mockup-col"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Outer perspective wrapper (scroll tilt) */}
          <div className="landing-hero-mockup-scale">
            <div style={{ perspective: '1200px' }}>
            <motion.div
              style={{
                y: springBob,
                rotateY: -8,
                rotateX: 6,
                transformStyle: 'preserve-3d',
              }}
            >
              <TiltCard maxTilt={10}>
                <AppMockup />
              </TiltCard>

              {/* Reflection / glow below card */}
              <div style={{
                position: 'absolute', bottom: -40, left: '10%', right: '10%', height: 40,
                background: 'rgba(99,102,241,0.22)', filter: 'blur(24px)', borderRadius: '50%',
                pointerEvents: 'none',
              }} />
            </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div className="landing-hero-scroll-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{ width: 20, height: 34, border: '1.5px solid rgba(99,102,241,0.35)', borderRadius: 999, display: 'flex', justifyContent: 'center', paddingTop: 5 }}>
          <div style={{ width: 3, height: 8, borderRadius: 999, background: 'rgba(99,102,241,0.7)' }} />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Feature SVG icons ──────────────────────────────────────────────────── */
function FeatureIcon({ name, color }: { name: string; color: string }) {
  const s = { width: 20, height: 20, stroke: color, fill: 'none', strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const icons: Record<string, React.ReactNode> = {
    stake: <svg viewBox="0 0 24 24" {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    swap:  <svg viewBox="0 0 24 24" {...s}><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>,
    pool:  <svg viewBox="0 0 24 24" {...s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
    chart: <svg viewBox="0 0 24 24" {...s}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
    lend:  <svg viewBox="0 0 24 24" {...s}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  };
  return <>{icons[name]}</>;
}

/* ─── Features data ──────────────────────────────────────────────────────── */
const FEATURES = [
  { iconKey: 'stake', color: '#818cf8', glow: 'rgba(99,102,241,0.12)',  title: 'Stake & Earn',      desc: 'Lock your tokens and earn up to 12% APR. Rewards accrue every block and can be claimed anytime.', link: '/stake',     badge: '12% APR'       },
  { iconKey: 'swap',  color: '#a78bfa', glow: 'rgba(139,92,246,0.10)',  title: 'Instant Swaps',     desc: 'Trade tokens at the best rates with minimal slippage. Powered by automated market makers.',        link: '/swap',      badge: 'Low Slippage'  },
  { iconKey: 'pool',  color: '#10b981', glow: 'rgba(16,185,129,0.08)',  title: 'Provide Liquidity', desc: 'Deposit token pairs into pools, earn LP fees from every swap and unlock deeper yields.',             link: '/pool',      badge: 'Earn LP Fees'  },
  { iconKey: 'chart', color: '#f59e0b', glow: 'rgba(245,158,11,0.08)',  title: 'Manage Positions',  desc: 'Track all your active positions, pending rewards, and portfolio performance in real time.',          link: '/positions', badge: 'Real-time'     },
  { iconKey: 'lend',  color: '#06b6d4', glow: 'rgba(6,182,212,0.08)',   title: 'Lend & Borrow',     desc: 'Supply assets to earn interest or borrow against your collateral. Full control, no middlemen.',      link: '/lend',      badge: 'Non-custodial' },
];

const STEPS = [
  { num: '01', title: 'Connect Your Wallet',  desc: 'Link MetaMask, WalletConnect, or any EVM-compatible wallet in one click. No registration, no KYC.',           color: '#818cf8' },
  { num: '02', title: 'Choose Your Strategy', desc: 'Stake for passive yields, swap for price exposure, pool for fee income, or lend to earn interest on assets.', color: '#10b981' },
  { num: '03', title: 'Deploy Your Capital',  desc: 'Supply assets to lending pools, add liquidity to AMM pools, or stake tokens — all from one dashboard.',        color: '#06b6d4' },
  { num: '04', title: 'Earn & Compound',      desc: 'Watch rewards grow in real time. Claim, reinvest, and compound to maximise your on-chain yield.',              color: '#f59e0b' },
];

/* ─── Stats ──────────────────────────────────────────────────────────────── */
const STATS = [
  { prefix: '$', value: 2.4,  suffix: 'M+', decimals: 1, label: 'Total Value Locked',  color: '#818cf8' },
  { prefix: '$', value: 18.7, suffix: 'M+', decimals: 1, label: 'Total Volume Traded',  color: '#10b981' },
  { prefix: '',  value: 1420, suffix: '+',  decimals: 0, label: 'Active Stakers',       color: '#f59e0b' },
  { prefix: '',  value: 99.9, suffix: '%',  decimals: 1, label: 'Uptime',               color: '#06b6d4' },
];

function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <section
      ref={ref}
      className="landing-stack-layer"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="landing-section-glow-line" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(36px,5vw,56px) clamp(16px,4vw,32px)', position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}
        >
          {STATS.map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} style={{
              textAlign: 'center', padding: 'clamp(16px,2vw,24px)',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, color: '#e6edf3', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
                <span style={{ color: s.color }}><Counter to={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} /></span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────────────────── */
function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section
      id="features"
      ref={ref}
      className="landing-stack-layer"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="landing-section-glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.35), rgba(139,92,246,0.35), transparent)' }} />
      <div className="landing-section-pad landing-section-pad--features-head" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Protocol Features</span>
            <h2 style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.03em', color: '#e6edf3' }}>
              Everything DeFi.{' '}
              <span className="landing-gradient-text-animated">One Platform.</span>
            </h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>Built for speed, designed for crypto natives. No compromises.</p>
          </motion.div>

          <motion.div className="landing-features-grid" style={{ marginTop: 32 }} variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} style={{ height: '100%' }}>
                <TiltCard maxTilt={8} style={{ height: '100%' }}>
                  <motion.div
                    whileHover={{ borderColor: `${f.color}30`, boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${f.color}20` }}
                    transition={{ duration: 0.2 }}
                    onClick={() => window.location.href = f.link}
                    className="landing-glass-card"
                    style={{ height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    {/* Icon row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}14`, border: `1px solid ${f.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FeatureIcon name={f.iconKey} color={f.color} />
                      </div>
                      <span style={{ background: `${f.color}12`, border: `1px solid ${f.color}25`, color: f.color, borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                        {f.badge}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#e6edf3' }}>{f.title}</h3>
                    <p style={{ margin: '0 0 auto', fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{f.desc}</p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: f.color }}>Open →</span>
                      <span style={{ fontSize: 10, color: '#374151', fontWeight: 600, letterSpacing: '0.04em' }}>0{i + 1}</span>
                    </div>
                  </motion.div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────────── */
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section
      ref={ref}
      className="landing-stack-layer"
      style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%,rgba(16,185,129,0.07) 0%,transparent 70%), var(--bg-secondary)',
      }}
    >
      <div className="landing-section-glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), rgba(6,182,212,0.3), transparent)' }} />
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1, padding: 'clamp(48px,6vw,72px) clamp(16px,4vw,32px)' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</span>
          <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#e6edf3' }}>Get started in four steps.</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((s, i) => (
            <motion.div key={s.num} variants={fadeUp} style={{ position: 'relative' }}>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', left: 21, top: 'calc(100% - 20px)', width: 1, height: 40, background: `linear-gradient(to bottom, ${s.color}40, transparent)`, zIndex: 1 }} />
              )}
              <div className="landing-how-step" style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'flex-start',
                gap: 20, marginBottom: i < STEPS.length - 1 ? 24 : 0,
              }}>
                {/* Number circle */}
                <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', background: `${s.color}14`, border: `1.5px solid ${s.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: '0.02em', marginTop: 2 }}>
                  {s.num}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#e6edf3' }}>{s.title}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA + footer (merged closing block; footer fixed on desktop) ─────── */
function CTAAndFooter() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <>
      <section
        ref={ref}
        className="landing-stack-layer landing-section-pad"
        style={{ textAlign: 'center', background: 'radial-gradient(ellipse 70% 70% at 50% 40%, rgba(99,102,241,0.1) 0%, transparent 65%), var(--bg-primary)' }}
      >
        <div className="landing-section-glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(139,92,246,0.6), transparent)' }} />
        <motion.div variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <motion.div variants={fadeUp}>
            <span style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)', color: '#818cf8', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>Get Started Today</span>
          </motion.div>
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px,5vw,58px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', margin: '0 0 20px', color: '#e6edf3' }}>
            Your yield.{' '}
            <span className="landing-gradient-text-animated">Your rules.</span>
          </motion.h2>
          <motion.p variants={fadeUp} style={{ fontSize: 17, color: '#9ca3af', margin: '0 0 40px', lineHeight: 1.65 }}>
            Join 1,420+ users already earning rewards. Stake, swap, pool, or lend — non-custodial, permissionless, yours.
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <Link to="/stake">
              <TiltCard maxTilt={8} hoverScale={1.04}>
                <motion.button
                  animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.3)', '0 0 48px rgba(99,102,241,0.7)', '0 0 20px rgba(99,102,241,0.3)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 14, padding: '16px 40px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
                  Start Earning →
                </motion.button>
              </TiltCard>
            </Link>
            <Link to="/swap">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{ background: 'var(--bg-secondary)', color: '#e6edf3', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                Try Swapping
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </section>
      <footer
        className="landing-footer-bar landing-footer-pad"
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div className="landing-footer-inner" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>FS</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#f9fafb' }}>FLUX SWAP</span>
          </div>
          <div className="landing-footer-links">
            {['Terms', 'Privacy', 'Security', 'Docs'].map(l => (
              <a key={l} href="#" style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>{l}</a>
            ))}
          </div>
          <span style={{ fontSize: 12, color: '#4b5563' }}>© 2026 Flux Swap · The Digital Sanctuary</span>
        </div>
      </footer>
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing-page-root" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <ScrollProgressBar />
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <CTAAndFooter />
    </div>
  );
}
