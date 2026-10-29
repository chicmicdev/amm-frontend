import { motion } from 'framer-motion';
import { Tooltip } from './Tooltip';

interface BtnProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'outline';
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
  /** When set (and the button is disabled), shown as a hover card explaining why. */
  reason?: string | null;
}

export function Btn({
  label, color = '#46BC8C', variant = 'solid',
  onClick, small = false, disabled = false, reason,
}: BtnProps) {
  const button = (
    <motion.button
      whileHover={disabled ? {} : { opacity: 0.85 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '5px 14px' : '7px 18px',
        borderRadius: 6,
        border: variant === 'outline' ? `1px solid ${color}` : 'none',
        background: variant === 'outline' ? 'transparent' : color,
        color: variant === 'outline' ? color : 'white',
        fontWeight: 700, fontSize: small ? 12 : 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1,
        // Let hover reach the tooltip wrapper: disabled buttons swallow mouse events.
        pointerEvents: disabled && reason ? 'none' : undefined,
      }}
    >
      {label}
    </motion.button>
  );

  if (disabled && reason) {
    return (
      <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
        <Tooltip text={reason}>{button}</Tooltip>
      </span>
    );
  }
  return button;
}
