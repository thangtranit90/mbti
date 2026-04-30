import { z } from 'zod';

const ANSWER_VALUE_MIN = 1;
const ANSWER_VALUE_MAX = 5;
const ANSWERS_MAX = 50;

const PerceptionAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.number().int().min(ANSWER_VALUE_MIN).max(ANSWER_VALUE_MAX),
});

export const InviteGenerateSchema = z
  .object({
    resultId: z.string().uuid(),
  })
  .strict();

export type InviteGenerate = z.infer<typeof InviteGenerateSchema>;

export const PerceptionVoteSchema = z
  .object({
    inviteToken: z.string().uuid(),
    answers: z.array(PerceptionAnswerSchema).min(1).max(ANSWERS_MAX),
  })
  .strict();

export type PerceptionVote = z.infer<typeof PerceptionVoteSchema>;
