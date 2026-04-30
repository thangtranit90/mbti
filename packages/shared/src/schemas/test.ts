import { z } from 'zod';
import { MBTITypeSchema } from './mbti';

const ANSWER_VALUE_MIN = 1;
const ANSWER_VALUE_MAX = 5; // Likert scale; Story 2.4 may tighten further
const ANSWERS_MAX = 50;

const AnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.number().int().min(ANSWER_VALUE_MIN).max(ANSWER_VALUE_MAX),
});

export const TestSubmitSchema = z
  .object({
    declaredType: MBTITypeSchema.nullable(),
    answers: z.array(AnswerSchema).min(1).max(ANSWERS_MAX),
  })
  .strict();

export type TestSubmit = z.infer<typeof TestSubmitSchema>;

export const TestResultSchema = z.object({
  id: z.string().uuid(),
  mbtiType: MBTITypeSchema,
  declaredType: MBTITypeSchema.nullable(),
  personaName: z.string(),
  createdAt: z.string().datetime({ offset: false }),
});

export type TestResult = z.infer<typeof TestResultSchema>;
