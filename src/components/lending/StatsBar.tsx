import { motion } from 'framer-motion';
import type { UserAccountData } from '../../services/lending/lendingService';
import { hfColor } from './lendingUtils';
import { InfoIcon } from './Tooltip';

interface StatsBarProps {
  userData: UserAccountData;
  netWorth: string;
  netAPY: string;
  onRiskDetails: () => void;
}

export function StatsBar({ userData, netWorth, netAPY, onRiskDetails }: StatsBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 0, marginBottom: 28, flexWrap: 'wrap',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      {/* Net worth */}
      <div style={{ padding: '18px 28px', borderRight: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Net worth</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>${netWorth}</div>
      </div>

      {/* Net APY */}
      <div style={{ padding: '18px 28px', borderRight: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Net APY
          <InfoIcon tooltip="Net APY is the combined effect of all supply and borrow positions on net worth, including incentives. It is possible to have a negative net APY if debt APY is higher than supply APY." />
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700,
          color: parseFloat(netAPY) >= 0 ? '#46BC8C' : '#F44336',
        }}>
          {netAPY}%
        </div>
      </div>

      {/* Health factor */}
      <div style={{ padding: '18px 28px', borderRight: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Health factor
          <InfoIcon tooltip="Health factor is the numeric representation of the safety of your deposited assets against the borrowed assets and its underlying value. The higher the value, the safer the state of your funds." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: hfColor(userData.healthFactor) }}>
            {userData.healthFactor}
          </span>
          <button
            onClick={onRiskDetails}
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5,
              background: 'rgba(248,159,26,0.12)', border: '1px solid rgba(248,159,26,0.35)',
              color: '#F89F1A', cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            RISK DETAILS
          </button>
        </div>
      </div>

      {/* Available rewards */}
      <div style={{ padding: '18px 28px', flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Available rewards</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>$0</span>
          <button style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5,
            background: 'rgba(70,188,140,0.12)', border: '1px solid rgba(70,188,140,0.3)',
            color: '#46BC8C', cursor: 'default', letterSpacing: '0.04em', opacity: 0.5,
          }}>
            CLAIM
          </button>
        </div>
      </div>
    </motion.div>
  );
}
