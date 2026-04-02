import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TOOLTIP_WIDTH = 260;
const TOOLTIP_GAP = 8;

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 8));
    // Position tooltip above the trigger (fixed coords; not clipped by overflow:hidden parents)
    const top = rect.top - TOOLTIP_GAP;
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!show) return;
    updatePosition();
  }, [show, updatePosition]);

  useLayoutEffect(() => {
    if (!show) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [show, updatePosition]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <span
      ref={triggerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => {
        updatePosition();
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {show && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  left: pos.left,
                  top: pos.top,
                  width: TOOLTIP_WIDTH,
                  transform: 'translateY(-100%)',
                  background: '#1E2330',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#C4CAD4',
                  lineHeight: 1.5,
                  zIndex: 100_000,
                  pointerEvents: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                {text}
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </span>
  );
}

export function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip text={tooltip}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '1px solid #6B7280',
          color: '#6B7280',
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'default',
          marginLeft: 4,
          flexShrink: 0,
        }}
      >
        i
      </span>
    </Tooltip>
  );
}
