import { motion } from 'framer-motion';

interface BtnProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'outline';
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
}

export function Btn({
  label, color = '#46BC8C', variant = 'solid',
  onClick, small = false, disabled = false,
}: BtnProps) {
  return (
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
      }}
    >
      {label}
    </motion.button>
  );
}
