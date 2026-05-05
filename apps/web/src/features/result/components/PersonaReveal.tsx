// Tailwind JIT safelist — DO NOT DELETE these comments
// text-type-INTJ text-type-INTP text-type-ENTJ text-type-ENTP
// text-type-INFJ text-type-INFP text-type-ENFJ text-type-ENFP
// text-type-ISTJ text-type-ISFJ text-type-ESTJ text-type-ESFJ
// text-type-ISTP text-type-ISFP text-type-ESTP text-type-ESFP
// bg-type-INTJ bg-type-INTP bg-type-ENTJ bg-type-ENTP
// bg-type-INFJ bg-type-INFP bg-type-ENFJ bg-type-ENFP
// bg-type-ISTJ bg-type-ISFJ bg-type-ESTJ bg-type-ESFJ
// bg-type-ISTP bg-type-ISFP bg-type-ESTP bg-type-ESFP
// border-type-INTJ border-type-INTP border-type-ENTJ border-type-ENTP
// border-type-INFJ border-type-INFP border-type-ENFJ border-type-ENFP
// border-type-ISTJ border-type-ISFJ border-type-ESTJ border-type-ESFJ
// border-type-ISTP border-type-ISFP border-type-ESTP border-type-ESFP

import { motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';

type Props = {
  personaName: string;
  mbtiType: MBTIType;
};

export function PersonaReveal({ personaName, mbtiType }: Props) {
  const rm = useReducedMotion() ?? false;

  return (
    <div className="min-h-svh bg-[#0D0F1A] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Type-specific radial glow */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30 bg-type-${mbtiType}`}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-sm w-full">
        {/* Beat 1: Persona name */}
        <motion.h1
          className={`text-[56px] leading-tight font-display text-type-${mbtiType}`}
          initial={{ opacity: rm ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: rm ? 0 : 0.6, delay: 0 }}
          role="heading"
          aria-level={1}
        >
          {personaName}
        </motion.h1>

        {/* HR divider */}
        <motion.hr
          className={`border-type-${mbtiType} w-16 border-t`}
          initial={{ opacity: rm ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 1.2 }}
          aria-hidden="true"
        />

        {/* Beat 3: Type code */}
        <motion.p
          className={`text-[14px] tracking-[0.3em] uppercase text-type-${mbtiType}`}
          initial={{ opacity: rm ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 1.4 }}
        >
          {mbtiType}
        </motion.p>
      </div>

      {/* Scroll chevron */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500"
        animate={{ opacity: rm ? 1 : [0, 1, 0] }}
        transition={{ duration: rm ? 0 : 1.5, delay: rm ? 0 : 2, repeat: rm ? 0 : Infinity }}
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </motion.div>
    </div>
  );
}
