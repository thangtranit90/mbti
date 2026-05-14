import { motion, useReducedMotion } from 'framer-motion';
import type { MBTIType } from '@mbti/shared';

type Props = {
  villains: Array<{ type: MBTIType; reason: string }>;
};

export function VillainsSection({ villains }: Props) {
  const rm = useReducedMotion() ?? false;

  return (
    <motion.section
      initial={{ opacity: rm ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 2.2 }}
      aria-labelledby="villains-heading"
    >
      <h2
        id="villains-heading"
        className="text-[13px] uppercase tracking-[0.2em] text-slate-500 mb-4"
      >
        3 kiểu người dễ mâu thuẫn với bạn
      </h2>
      <div className="flex flex-col gap-3">
        {villains.map((v) => (
          <div key={v.type} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className={`text-[15px] font-semibold tracking-wider text-type-${v.type} mb-1`}>
              {v.type}
            </div>
            <p className="text-slate-400 text-[14px] leading-relaxed">{v.reason}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
