import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

interface TiltCardProps {
  children: ReactNode;
  /** Max tilt angle in degrees (default 12) */
  maxTilt?: number;
  /** Scale on hover (default 1.02) */
  hoverScale?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * Apple-style 3D tilt card.
 * Tracks the mouse cursor and tilts on X/Y axes with a moving specular highlight.
 */
export default function TiltCard({
  children,
  maxTilt = 12,
  hoverScale = 1.02,
  style,
  className,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const xRaw = useMotionValue(0);
  const yRaw = useMotionValue(0);
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });

  const spring = { stiffness: 380, damping: 30, mass: 0.8 };
  const rotateX = useSpring(useTransform(yRaw, [-0.5, 0.5], [maxTilt, -maxTilt]), spring);
  const rotateY = useSpring(useTransform(xRaw, [-0.5, 0.5], [-maxTilt, maxTilt]), spring);
  const scale   = useSpring(1, { stiffness: 280, damping: 24 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    xRaw.set(relX);
    yRaw.set(relY);
    scale.set(hoverScale);
    setShine({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      opacity: 0.13,
    });
  };

  const handleMouseLeave = () => {
    xRaw.set(0);
    yRaw.set(0);
    scale.set(1);
    setShine(s => ({ ...s, opacity: 0 }));
  };

  return (
    /* Perspective container */
    <div style={{ perspective: '1000px', ...style }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
          position: 'relative',
          willChange: 'transform',
        }}
      >
        {children}

        {/* Specular shine that follows the cursor — Apple card trick */}
        <div
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            zIndex: 10,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.13), transparent 55%)`,
            opacity: shine.opacity,
            transition: 'opacity 0.25s ease',
          }}
        />
      </motion.div>
    </div>
  );
}
