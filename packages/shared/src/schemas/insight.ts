import { z } from 'zod';
import { MBTITypeSchema } from './mbti';

export const InsightResponseSchema = z.object({
  mbtiType: MBTITypeSchema,
  content: z.string().min(1),
  source: z.enum(['ai', 'curated']),
});

export type InsightResponse = z.infer<typeof InsightResponseSchema>;

export const VillainEntrySchema = z.object({
  type: MBTITypeSchema,
  reason: z.string().min(1),
});

export const ResultInsightResponseSchema = z.object({
  personaName: z.string().min(1),
  insight: z.string().min(1),
  villains: z.array(VillainEntrySchema).length(3),
});

export type ResultInsightResponse = z.infer<typeof ResultInsightResponseSchema>;

export const GenerateInsightRequestSchema = z.object({
  resultId: z
    .string()
    .uuid()
    .transform((s) => s.toLowerCase()),
});

export type GenerateInsightRequest = z.infer<typeof GenerateInsightRequestSchema>;
