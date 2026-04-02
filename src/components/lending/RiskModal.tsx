import { motion } from 'framer-motion';
import type { UserAccountData } from '../../services/lending/lendingService';
import { fmt, hfColor } from './lendingUtils';

interface RiskModalProps {
  userData: UserAccountData;
  onClose: () => void;
}

export function RiskModal({ userData, onClose }: RiskModalProps) {
  const hf           = parseFloat(userData.healthFactor === '∞' ? '999' : userData.healthFactor);
  const ltv          = parseFloat(userData.ltv);           // e.g. 75 (from "75%")
  const liqThreshold = parseFloat(userData.liquidationThreshold); // e.g. 80

  const hfBarPct  = (Math.min(hf, 3) / 3) * 100;
  const ltvBarPct = Math.min(ltv, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Liquidation risk parameters
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 20 }}>
          Your health factor and loan to value determine the assurance of your collateral.
          To avoid liquidations you can supply more collateral or repay borrow positions.{' '}
          <a
            href="https://ethereum.org/en/defi/"
            target="_blank" rel="noreferrer"
            style={{ color: 'var(--color-accent-light)' }}
          >
            Learn more
          </a>
        </p>

        {/* ── Health factor block ─────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          padding: '16px 18px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Health factor</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5, maxWidth: 280 }}>
                Safety of your deposited collateral against the borrowed assets and its underlying value.
              </div>
            </div>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: hfColor(userData.healthFactor),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0,
            }}>
              {userData.healthFactor === '∞' ? '∞' : fmt(parseFloat(userData.healthFactor), 2)}
            </div>
          </div>

          {/* HF gradient bar */}
          <div style={{
            position: 'relative', height: 8, borderRadius: 4, marginBottom: 8,
            background: 'linear-gradient(to right, #F44336 0%, #F89F1A 40%, #46BC8C 100%)',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: `${Math.min(hfBarPct, 97)}%`,
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14, borderRadius: '50%',
              background: 'white', border: '2px solid #1A1F2E',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.4)',
            }} />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: hfColor(userData.healthFactor), marginBottom: 6 }}>
            {userData.healthFactor === '∞' ? '∞' : fmt(parseFloat(userData.healthFactor), 2)}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            <span style={{ color: '#F44336', fontWeight: 600 }}>1.00</span> Liquidation value
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
            If the health factor goes below 1, the liquidation of your collateral might be triggered.
          </p>
        </div>

        {/* ── Current LTV block ────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Current LTV</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5, maxWidth: 280 }}>
                Your current loan to value based on your collateral supplied.
              </div>
            </div>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#F89F1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12, color: 'white', flexShrink: 0,
            }}>
              {fmt(ltv, 2)}%
            </div>
          </div>

          {/* LTV bar */}
          <div style={{
            position: 'relative', height: 8, borderRadius: 4,
            background: 'rgba(255,255,255,0.1)', marginBottom: 6,
          }}>
            <div style={{
              height: '100%', width: `${ltvBarPct}%`, borderRadius: 4,
              background: ltv > liqThreshold * 0.9 ? '#F44336' : '#F89F1A',
            }} />
            {liqThreshold > 0 && (
              <div style={{
                position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
                left: `${Math.min(liqThreshold, 97)}%`,
                width: 2, height: 16, background: '#F44336',
              }} />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#F89F1A', fontWeight: 600 }}>{fmt(ltv, 2)}%</span>
            <span style={{ color: '#9CA3AF' }}>MAX {fmt(liqThreshold, 2)}%</span>
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            <span style={{ color: '#F44336', fontWeight: 600 }}>{fmt(liqThreshold, 2)}%</span>{' '}
            Liquidation threshold
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
            If your loan to value goes above the liquidation threshold your collateral supplied may be liquidated.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
