import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

type Props = {
  insight: string;
  source: 'ai' | 'curated';
};

export function InsightCard({ insight, source }: Props) {
  const rm = useReducedMotion() ?? false;

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: rm ? 0 : 0.4, delay: rm ? 0 : 0.8 }}
    >
      <p className="text-[17px] leading-relaxed text-slate-200 text-center max-w-sm text-balance">
        {insight}
      </p>
      {source === 'ai' && (
        <Badge
          variant="outline"
          className="text-[11px] text-slate-400 border-[var(--hairline-strong)] bg-white/[0.03] font-normal"
        >
          AI-generated for self-reflection
        </Badge>
      )}
    </motion.div>
  );
}
