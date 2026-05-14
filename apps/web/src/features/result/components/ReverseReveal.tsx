import { motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';
import { PERSONA_NAMES } from '@mbti/shared';

type Props = {
  declaredType: MBTIType | null;
  calculatedType: MBTIType;
  personaName: string;
};

export function ReverseReveal({ declaredType, calculatedType, personaName }: Props) {
  const rm = useReducedMotion() ?? false;

  if (declaredType === null) return null;
  if (!(declaredType in PERSONA_NAMES)) return null;

  const isMatch = declaredType === calculatedType;

  return (
    <motion.section
      className="mt-12"
      initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 2.4 }}
      aria-labelledby="reverse-reveal-heading"
    >
      <h2
        id="reverse-reveal-heading"
        className="text-[13px] uppercase tracking-[0.2em] text-slate-500 mb-4"
      >
        {isMatch ? 'Bạn đã đúng' : 'Bạn nghĩ — và bạn thực sự'}
      </h2>

      {isMatch ? (
        <div
          className={`rounded-xl border border-type-${calculatedType} bg-white/5 p-5 text-center`}
        >
          <p className="text-slate-300 text-[14px] leading-relaxed mb-2">
            Bạn đã đoán đúng kiểu của mình:
          </p>
          <p className={`text-[18px] font-semibold text-type-${calculatedType}`}>
            {personaName}
          </p>
          <p className={`text-[12px] tracking-[0.2em] uppercase text-type-${calculatedType} mt-1`}>
            {calculatedType}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center opacity-60">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500 mb-2">
              Bạn nghĩ
            </p>
            <p className="text-[14px] text-slate-400 line-through decoration-slate-600">
              {PERSONA_NAMES[declaredType]}
            </p>
            <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500 mt-1">
              {declaredType}
            </p>
          </div>
          <div className={`rounded-xl border border-type-${calculatedType} bg-white/5 p-4 text-center`}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500 mb-2">
              Thực ra
            </p>
            <p className={`text-[14px] font-semibold text-type-${calculatedType}`}>
              {personaName}
            </p>
            <p className={`text-[11px] tracking-[0.2em] uppercase text-type-${calculatedType} mt-1`}>
              {calculatedType}
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
