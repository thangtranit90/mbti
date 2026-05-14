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
      <p className="text-[16px] leading-relaxed text-slate-300 text-center max-w-xs">
        {insight}
      </p>
      {source === 'ai' && (
        <Badge
          variant="outline"
          className="text-[11px] text-slate-500 border-slate-700 font-normal"
        >
          AI-generated for self-reflection
        </Badge>
      )}
    </motion.div>
  );
}
