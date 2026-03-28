import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from 'framer-motion';

/* ─── Particles canvas ───────────────────────────────────────────────────── */
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', onMouse);

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
    }
    const COUNT = 90;
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const LINK_DIST = 130;
    const MOUSE_DIST = 160;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // move
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      // mouse repulsion — subtle drift toward cursor
      particles.forEach(p => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST;
          p.vx += dx * force * 0.00015;
          p.vy += dy * force * 0.00015;
        }
        // dampen
        p.vx *= 0.999;
        p.vy *= 0.999;
      });

      // lines between close particles
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const opacity = (1 - d / LINK_DIST) * 0.25;
            ctx.strokeStyle = `rgba(99,102,241,${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // dots
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}

/* ─── Animated counter ───────────────────────────────────────────────────── */
function Counter({ to, prefix = '', suffix = '', decimals = 0 }: {
  to: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();
    const dur = 1800;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(ease * to);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, to]);

  return (
    <span ref={ref}>
      {prefix}{val.toFixed(decimals)}{suffix}
    </span>
  );
}

/* ─── Fade-up variant ────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 32px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        background: scrolled ? 'rgba(10,14,26,0.85)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(55,65,100,0.4)' : 'none',
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'white',
        }}>
          FS
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#f9fafb' }}>
          FLUX <span style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>SWAP</span>
        </span>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['Stake', 'Swap', 'Pool', 'Positions'].map(label => (
          <Link
            key={label}
            to={`/${label.toLowerCase()}`}
            style={{
              color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
              textDecoration: 'none', transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* CTA */}
      <Link to="/stake">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none',
            borderRadius: 12, padding: '9px 22px',
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.01em',
          }}
        >
          Launch App
        </motion.button>
      </Link>
    </motion.nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 60]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%), var(--bg-primary)',
    }}>
      <ParticlesCanvas />

      {/* Glow blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '8%',
        width: 320, height: 320,
        background: 'rgba(99,102,241,0.12)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '8%',
        width: 280, height: 280,
        background: 'rgba(139,92,246,0.1)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '20%',
        width: 180, height: 180,
        background: 'rgba(16,185,129,0.07)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <motion.div
        style={{ y, opacity, position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: 780 }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}
        >
          <span style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.35)',
            color: '#818cf8', borderRadius: 999,
            padding: '6px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
          }}>
            ⚡ NOW LIVE ON TESTNET
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: 900, lineHeight: 1.08,
            letterSpacing: '-0.04em', margin: '0 0 20px',
            color: 'var(--text-primary)',
          }}
        >
          The Future of{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            DeFi
          </span>{' '}
          is Here.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 44px',
            lineHeight: 1.65,
          }}
        >
          Stake, swap and provide liquidity — all in one protocol. Earn up to{' '}
          <span style={{ color: '#10b981', fontWeight: 700 }}>12% APR</span>{' '}
          with audited, transparent smart contracts.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Link to="/stake">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 32px rgba(99,102,241,0.5)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none',
                borderRadius: 14, padding: '15px 36px',
                fontSize: 16, fontWeight: 800,
                cursor: 'pointer', letterSpacing: '0.01em',
              }}
            >
              Launch App →
            </motion.button>
          </Link>

          <motion.button
            whileHover={{ scale: 1.04, borderColor: 'rgba(99,102,241,0.6)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid rgba(55,65,100,0.7)',
              borderRadius: 14, padding: '15px 36px',
              fontSize: 16, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.01em',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s',
            }}
          >
            Explore Features
          </motion.button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          style={{ marginTop: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ width: 20, height: 34, border: '1.5px solid rgba(99,102,241,0.4)', borderRadius: 999, display: 'flex', justifyContent: 'center', paddingTop: 5 }}
          >
            <motion.div style={{ width: 3, height: 8, borderRadius: 999, background: 'rgba(99,102,241,0.7)' }} />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Live Stats ─────────────────────────────────────────────────────────── */
function LiveStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const stats = [
    { label: 'Total Value Locked', value: 2.4, prefix: '$', suffix: 'M', decimals: 1, color: 'var(--text-primary)' },
    { label: 'Current APR', value: 12.00, suffix: '%', decimals: 2, color: '#10b981' },
    { label: 'Active Stakers', value: 1420, suffix: '+', decimals: 0, color: '#818cf8' },
    { label: 'Transactions', value: 48.7, suffix: 'K', decimals: 1, color: '#f59e0b' },
  ];

  return (
    <section ref={ref} style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '48px 32px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
          }}
        >
          {stats.map(s => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {isInView && (
                  <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────────────────── */
const featureCards = [
  {
    icon: '⚡',
    iconBg: 'rgba(99,102,241,0.15)',
    iconBorder: 'rgba(99,102,241,0.3)',
    iconColor: '#818cf8',
    title: 'Stake & Earn',
    desc: 'Lock your tokens and earn up to 12% APR. Rewards accrue every block and can be claimed anytime.',
    link: '/stake',
    glow: 'rgba(99,102,241,0.12)',
  },
  {
    icon: '↔',
    iconBg: 'rgba(139,92,246,0.15)',
    iconBorder: 'rgba(139,92,246,0.3)',
    iconColor: '#a78bfa',
    title: 'Instant Swaps',
    desc: 'Trade tokens at the best rates with minimal slippage. Powered by automated market makers.',
    link: '/swap',
    glow: 'rgba(139,92,246,0.12)',
  },
  {
    icon: '◈',
    iconBg: 'rgba(16,185,129,0.12)',
    iconBorder: 'rgba(16,185,129,0.25)',
    iconColor: '#10b981',
    title: 'Provide Liquidity',
    desc: 'Deposit token pairs into pools, earn LP fees from every swap and unlock deeper yields.',
    link: '/pool',
    glow: 'rgba(16,185,129,0.08)',
  },
  {
    icon: '◎',
    iconBg: 'rgba(245,158,11,0.12)',
    iconBorder: 'rgba(245,158,11,0.25)',
    iconColor: '#f59e0b',
    title: 'Manage Positions',
    desc: 'Track all your active positions, pending rewards, and portfolio performance in real time.',
    link: '/positions',
    glow: 'rgba(245,158,11,0.08)',
  },
];

function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="features" ref={ref} style={{ padding: '100px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <motion.div
        variants={fadeUp} initial="hidden" animate={isInView ? 'show' : 'hidden'}
        style={{ textAlign: 'center', marginBottom: 64 }}
      >
        <span style={{
          display: 'inline-block',
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          color: '#818cf8', borderRadius: 999, padding: '5px 16px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18,
        }}>
          Protocol Features
        </span>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, margin: '0 0 16px',
          letterSpacing: '-0.03em', color: 'var(--text-primary)',
        }}>
          Everything DeFi.{' '}
          <span style={{
            background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            One Platform.
          </span>
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
          Built for speed, designed for crypto natives. No compromises.
        </p>
      </motion.div>

      <motion.div
        variants={stagger} initial="hidden" animate={isInView ? 'show' : 'hidden'}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}
      >
        {featureCards.map(card => (
          <motion.div
            key={card.title}
            variants={fadeUp}
            whileHover={{ y: -6, boxShadow: `0 16px 48px ${card.glow}` }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20, padding: '28px 24px',
              cursor: 'pointer',
              transition: 'border-color 0.3s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = card.iconBorder)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            onClick={() => window.location.href = card.link}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: card.iconBg, border: `1px solid ${card.iconBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: card.iconColor, marginBottom: 20,
            }}>
              {card.icon}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {card.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {card.desc}
            </p>
            <div style={{
              marginTop: 20, fontSize: 13, fontWeight: 700, color: card.iconColor,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Explore →
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────────── */
const steps = [
  {
    num: '01',
    title: 'Connect Your Wallet',
    desc: 'Link MetaMask, WalletConnect, or any EVM-compatible wallet in one click.',
    color: '#818cf8',
  },
  {
    num: '02',
    title: 'Choose Your Strategy',
    desc: 'Stake for passive yields, swap for price exposure, or pool for fee income.',
    color: '#10b981',
  },
  {
    num: '03',
    title: 'Earn & Compound',
    desc: 'Watch rewards grow in real time. Claim and restake to compound your earnings.',
    color: '#f59e0b',
  },
];

function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} style={{
      padding: '100px 32px',
      background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.07) 0%, transparent 70%), var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div
          variants={fadeUp} initial="hidden" animate={isInView ? 'show' : 'hidden'}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <span style={{
            display: 'inline-block',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            color: '#10b981', borderRadius: 999, padding: '5px 16px',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18,
          }}>
            How It Works
          </span>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 900, margin: 0,
            letterSpacing: '-0.03em', color: 'var(--text-primary)',
          }}>
            Three steps to DeFi freedom.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger} initial="hidden" animate={isInView ? 'show' : 'hidden'}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 28,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 20, padding: '28px 32px',
              }}
            >
              <div style={{
                flexShrink: 0,
                fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 900,
                color: step.color, opacity: 0.25, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {step.num}
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {step.title}
                </h3>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ─────────────────────────────────────────────────────────── */
function CTABanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} style={{ padding: '100px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)',
      }} />

      <motion.div
        variants={stagger} initial="hidden" animate={isInView ? 'show' : 'hidden'}
        style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}
      >
        <motion.div variants={fadeUp}>
          <span style={{
            display: 'inline-block',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#818cf8', borderRadius: 999, padding: '5px 16px',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24,
          }}>
            Get Started Today
          </span>
        </motion.div>

        <motion.h2
          variants={fadeUp}
          style={{
            fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.04em', margin: '0 0 20px', color: 'var(--text-primary)',
          }}
        >
          Your yield.{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Your rules.
          </span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          style={{ fontSize: 17, color: 'var(--text-secondary)', margin: '0 0 40px', lineHeight: 1.65 }}
        >
          Join 1,420+ stakers already earning rewards on Flux Swap. Non-custodial. Permissionless. Yours.
        </motion.p>

        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/stake">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none',
                borderRadius: 14, padding: '16px 40px',
                fontSize: 16, fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Start Earning →
            </motion.button>
          </Link>
          <Link to="/swap">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: '16px 40px',
                fontSize: 16, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
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
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '40px 32px',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: 'white',
          }}>
            FS
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f9fafb' }}>FLUX SWAP</span>
        </div>

        <div style={{ display: 'flex', gap: 28 }}>
          {['Terms', 'Privacy', 'Security', 'Docs'].map(label => (
            <a key={label} href="#" style={{
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              {label}
            </a>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © 2026 Flux Swap · The Digital Sanctuary
        </span>
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
