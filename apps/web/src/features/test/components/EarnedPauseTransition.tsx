import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  onComplete: () => void;
};

const PARTICLE_COUNT = 8;
const DURATION_MS = 1200;

// Deterministic offsets so tests can rely on consistent render
const PARTICLE_OFFSETS = [
  { x: -60, y: -60 }, { x: 0, y: -80 }, { x: 60, y: -60 }, { x: 80, y: 0 },
  { x: 60, y: 60 }, { x: 0, y: 80 }, { x: -60, y: 60 }, { x: -80, y: 0 },
];

export function EarnedPauseTransition({ onComplete }: Props) {
  const rm = useReducedMotion() ?? false;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onComplete, DURATION_MS);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [onComplete]);

  return (
    <div
      className="min-h-svh bg-surface-base flex items-center justify-center relative overflow-hidden"
      aria-label="Đang phân tích kết quả"
      aria-live="polite"
    >
      {rm ? (
        <motion.div
          className="w-24 h-24 rounded-full bg-cta-primary/30 blur-2xl"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      ) : (
        <>
          {PARTICLE_OFFSETS.slice(0, PARTICLE_COUNT).map((offset, i) => (
            <motion.span
              key={i}
              className="absolute w-2 h-2 rounded-full bg-cta-primary"
              initial={{ x: offset.x, y: offset.y, opacity: 0.8 }}
              animate={{ x: 0, y: 0, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeIn', delay: i * 0.04 }}
            />
          ))}
          <motion.div
            className="w-20 h-20 rounded-full bg-cta-primary/20 blur-xl"
            initial={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.9 }}
          />
        </>
      )}
    </div>
  );
}
