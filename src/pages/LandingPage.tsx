import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValue,
} from 'framer-motion';
import TiltCard from '../components/common/TiltCard';

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

const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.11 } } };

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        background: scrolled ? 'rgba(10,14,26,0.88)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(55,65,100,0.4)' : 'none',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white' }}>FS</div>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#f9fafb' }}>FLUX <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SWAP</span></span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['Stake', 'Swap', 'Pool', 'Positions'].map(l => (
          <Link key={l} to={`/${l.toLowerCase()}`} style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
          >{l}</Link>
        ))}
      </div>
      <Link to="/stake">
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Launch App
        </motion.button>
      </Link>
    </motion.nav>
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
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 80% 60% at 60% 0%, rgba(99,102,241,0.14) 0%, transparent 70%), var(--bg-primary)',
    }}>
      <ParticlesCanvas />
      {/* Glow blobs */}
      {[
        { top: '10%', left: '5%', w: 380, h: 380, color: 'rgba(99,102,241,0.1)', blur: 90 },
        { top: '50%', right: '2%', w: 300, h: 300, color: 'rgba(139,92,246,0.09)', blur: 80 },
        { top: '65%', left: '35%', w: 220, h: 220, color: 'rgba(16,185,129,0.06)', blur: 70 },
      ].map((b, i) => (
        <div key={i} style={{ position: 'absolute', top: b.top, left: b.left, right: b.right as string | undefined, width: b.w, height: b.h, background: b.color, borderRadius: '50%', filter: `blur(${b.blur}px)`, pointerEvents: 'none' }} />
      ))}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 0', width: '100%', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 60 }}>

        {/* ── Left: copy ── */}
        <motion.div style={{ y: textY, opacity: textOp, flex: 1, minWidth: 0 }}>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ marginBottom: 28 }}>
            <span style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.34)', color: '#818cf8', borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
              ⚡ NOW LIVE ON TESTNET
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontSize: 'clamp(38px, 5.5vw, 72px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.04em', margin: '0 0 20px', color: '#e6edf3' }}
          >
            The Future of{' '}
            <span style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              DeFi
            </span>{' '}
            is Here.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: '#9ca3af', maxWidth: 440, margin: '0 0 40px', lineHeight: 1.7 }}
          >
            Stake, swap and provide liquidity — all in one protocol. Earn up to{' '}
            <span style={{ color: '#10b981', fontWeight: 700 }}>12% APR</span>{' '}
            with audited, transparent smart contracts.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/stake">
              <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 36px rgba(99,102,241,0.55)' }} whileTap={{ scale: 0.97 }}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }}
            style={{ display: 'flex', gap: 32, marginTop: 44 }}>
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
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}
        >
          {/* Outer perspective wrapper (scroll tilt) */}
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
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
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

/* ─── Apple-style scroll-driven 3-D showcase ─────────────────────────────── */
function ScrollShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', '0.65 start'],
  });

  /* Drive rotation from scroll */
  const rX  = useTransform(scrollYProgress, [0, 1], [28,  0]);
  const rY  = useTransform(scrollYProgress, [0, 1], [-22, 0]);
  const sc  = useTransform(scrollYProgress, [0, 1], [0.6, 1]);
  const op  = useTransform(scrollYProgress, [0, 0.15, 1], [0, 1, 1]);
  const sY  = useTransform(scrollYProgress, [0, 1], [60, 0]);

  const srX = useSpring(rX, { stiffness: 55, damping: 16 });
  const srY = useSpring(rY, { stiffness: 55, damping: 16 });
  const sSc = useSpring(sc, { stiffness: 55, damping: 18 });

  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (`
  
  `);
}

/* ─── Live Stats ─────────────────────────────────────────────────────────── */
function LiveStats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const stats = [
    { label: 'Total Value Locked', value: 2.4, prefix: '$', suffix: 'M', decimals: 1, color: '#e6edf3' },
    { label: 'Current APR',        value: 12.00, suffix: '%', decimals: 2, color: '#10b981' },
    { label: 'Active Stakers',     value: 1420,  suffix: '+', decimals: 0, color: '#818cf8' },
    { label: 'Transactions',       value: 48.7,  suffix: 'K', decimals: 1, color: '#f59e0b' },
  ];
  return (
    <section ref={ref} style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '52px 32px' }}>
      <motion.div variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'}
        style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
        {stats.map(s => (
          <motion.div key={s.label} variants={fadeUp} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {inView && <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, fontWeight: 500 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '⚡', bg: 'rgba(99,102,241,0.14)',  border: 'rgba(99,102,241,0.28)',  color: '#818cf8', glow: 'rgba(99,102,241,0.14)',  title: 'Stake & Earn',        desc: 'Lock your tokens and earn up to 12% APR. Rewards accrue every block and can be claimed anytime.', link: '/stake'     },
  { icon: '↔',  bg: 'rgba(139,92,246,0.14)',  border: 'rgba(139,92,246,0.28)',  color: '#a78bfa', glow: 'rgba(139,92,246,0.12)',  title: 'Instant Swaps',       desc: 'Trade tokens at the best rates with minimal slippage. Powered by automated market makers.',        link: '/swap'      },
  { icon: '◈',  bg: 'rgba(16,185,129,0.11)',  border: 'rgba(16,185,129,0.24)',  color: '#10b981', glow: 'rgba(16,185,129,0.08)',  title: 'Provide Liquidity',   desc: 'Deposit token pairs into pools, earn LP fees from every swap and unlock deeper yields.',             link: '/pool'      },
  { icon: '◎',  bg: 'rgba(245,158,11,0.11)',  border: 'rgba(245,158,11,0.24)',  color: '#f59e0b', glow: 'rgba(245,158,11,0.08)',  title: 'Manage Positions',    desc: 'Track all your active positions, pending rewards, and portfolio performance in real time.',          link: '/positions' },
];

function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section id="features" ref={ref} style={{ padding: '100px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ textAlign: 'center', marginBottom: 64 }}>
        <span style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)', color: '#818cf8', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Protocol Features</span>
        <h2 style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.03em', color: '#e6edf3' }}>
          Everything DeFi.{' '}
          <span style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>One Platform.</span>
        </h2>
        <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 480, margin: '0 auto' }}>Built for speed, designed for crypto natives. No compromises.</p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
        {FEATURES.map(f => (
          <motion.div key={f.title} variants={fadeUp}>
            <TiltCard maxTilt={14} style={{ height: '100%' }}>
              <motion.div
                whileHover={{ borderColor: f.border, boxShadow: `0 20px 52px ${f.glow}` }}
                transition={{ duration: 0.25 }}
                onClick={() => window.location.href = f.link}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '28px 24px', cursor: 'pointer',
                  height: '100%', boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: f.bg, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: f.color, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: '#e6edf3' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#9ca3af', lineHeight: 1.65 }}>{f.desc}</p>
                <div style={{ marginTop: 20, fontSize: 13, fontWeight: 700, color: f.color }}>Explore →</div>
              </motion.div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────────── */
const STEPS = [
  { num: '01', title: 'Connect Your Wallet', desc: 'Link MetaMask, WalletConnect, or any EVM-compatible wallet in one click.', color: '#818cf8' },
  { num: '02', title: 'Choose Your Strategy', desc: 'Stake for passive yields, swap for price exposure, or pool for fee income.', color: '#10b981' },
  { num: '03', title: 'Earn & Compound',      desc: 'Watch rewards grow in real time. Claim and restake to compound your earnings.', color: '#f59e0b' },
];

function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section ref={ref} style={{ padding: '100px 32px', background: 'radial-gradient(ellipse 60% 50% at 50% 50%,rgba(99,102,241,0.07) 0%,transparent 70%), var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ textAlign: 'center', marginBottom: 60 }}>
          <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.24)', color: '#10b981', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>How It Works</span>
          <h2 style={{ fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#e6edf3' }}>Three steps to DeFi freedom.</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {STEPS.map(s => (
            <motion.div key={s.num} variants={fadeUp}>
              <TiltCard maxTilt={6}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '26px 30px', display: 'flex', alignItems: 'flex-start', gap: 26 }}>
                  <div style={{ flexShrink: 0, fontSize: 'clamp(34px,5vw,52px)', fontWeight: 900, color: s.color, opacity: 0.22, lineHeight: 1 }}>{s.num}</div>
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, color: '#e6edf3' }}>{s.title}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: '#9ca3af', lineHeight: 1.65 }}>{s.desc}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────────────────── */
function CTABanner() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} style={{ padding: '100px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 50%,rgba(99,102,241,0.11) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <motion.div variants={stagger} initial="hidden" animate={inView ? 'show' : 'hidden'} style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
        <motion.div variants={fadeUp}>
          <span style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)', color: '#818cf8', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>Get Started Today</span>
        </motion.div>
        <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px,5vw,58px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', margin: '0 0 20px', color: '#e6edf3' }}>
          Your yield.{' '}
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Your rules.</span>
        </motion.h2>
        <motion.p variants={fadeUp} style={{ fontSize: 17, color: '#9ca3af', margin: '0 0 40px', lineHeight: 1.65 }}>
          Join 1,420+ stakers already earning rewards. Non-custodial. Permissionless. Yours.
        </motion.p>
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/stake">
            <TiltCard maxTilt={8} hoverScale={1.04}>
              <motion.button whileHover={{ boxShadow: '0 0 44px rgba(99,102,241,0.55)' }} whileTap={{ scale: 0.97 }}
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
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 32px', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>FS</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f9fafb' }}>FLUX SWAP</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Terms', 'Privacy', 'Security', 'Docs'].map(l => (
            <a key={l} href="#" style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>{l}</a>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#4b5563' }}>© 2026 Flux Swap · The Digital Sanctuary</span>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav />
      <Hero />
      <LiveStats />
      <Features />
      <HowItWorks />
      <CTABanner />
      <Footer />
    </div>
  );
}
