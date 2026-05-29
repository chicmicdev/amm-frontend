import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  /** 'fadeUp' (default) | 'fadeIn' | 'scaleUp' */
  variant?: 'fadeUp' | 'fadeIn' | 'scaleUp';
  className?: string;
  style?: CSSProperties;
}

const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 28 },
    show:   { opacity: 1, y: 0  },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    show:   { opacity: 1 },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.94, y: 16 },
    show:   { opacity: 1, scale: 1,    y: 0  },
  },
};

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  variant = 'fadeUp',
  className,
  style,
}: ScrollRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={variants[variant]}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
