import { z } from 'zod';
import { MBTITypeSchema } from './mbti';

const ANSWER_VALUE_MIN = 1;
const ANSWER_VALUE_MAX = 5; // Likert scale; Story 2.4 may tighten further
const ANSWERS_MAX = 50;

export const AnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.number().int().min(ANSWER_VALUE_MIN).max(ANSWER_VALUE_MAX),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.number().int().min(1).max(4),
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const QuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  dimension: z.enum(['E_I', 'S_N', 'T_F', 'J_P']),
  options: z.array(QuestionOptionSchema).min(2).max(4),
});
export type Question = z.infer<typeof QuestionSchema>;

export const NextQuestionRequestSchema = z
  .object({
    answers: z.array(AnswerSchema).max(12),
  })
  .strict();
export type NextQuestionRequest = z.infer<typeof NextQuestionRequestSchema>;

export const NextQuestionResponseSchema = z.union([
  z.object({
    data: z.object({
      question: QuestionSchema,
      questionIndex: z.number().int().min(0).max(11),
      total: z.literal(12),
    }),
    error: z.null(),
  }),
  z.object({
    data: z.null(),
    error: z.null(),
  }),
  z.object({
    data: z.null(),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);
export type NextQuestionResponse = z.infer<typeof NextQuestionResponseSchema>;

export const TestSubmitSchema = z
  .object({
    declaredType: MBTITypeSchema.nullable(),
    answers: z.array(AnswerSchema).min(1).max(ANSWERS_MAX),
    // Story 4.2 — optional invite token attaching this test to a social graph.
    inviteSource: z.string().uuid().optional().nullable(),
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

export const TestSubmitResponseSchema = z.object({
  data: z.object({
    resultId: z.string().uuid(),
    mbtiType: MBTITypeSchema,
  }),
  error: z.null(),
});

export type TestSubmitResponse = z.infer<typeof TestSubmitResponseSchema>;
