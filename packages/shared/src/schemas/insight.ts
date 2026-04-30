import { z } from 'zod';
import { MBTITypeSchema } from './mbti';

export const InsightResponseSchema = z.object({
  mbtiType: MBTITypeSchema,
  content: z.string().min(1),
  source: z.enum(['ai', 'curated']),
});

export type InsightResponse = z.infer<typeof InsightResponseSchema>;
