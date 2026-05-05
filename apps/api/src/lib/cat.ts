import type { QuestionRow, MBTIType } from '@mbti/shared';

type Dimension = 'E_I' | 'S_N' | 'T_F' | 'J_P';
type Answer = { questionId: string; value: number };

const QUESTIONS_PER_DIMENSION = 3;
const DIMENSION_ORDER: Dimension[] = ['E_I', 'S_N', 'T_F', 'J_P'];

/**
 * Selects the next question using a simple CAT strategy:
 * 1. Find the dimension with fewest answers (ties broken by DIMENSION_ORDER)
 * 2. From that dimension, pick the unanswered question with highest discrimination
 * Returns null when all 12 questions (3 per dimension × 4 dimensions) have been answered.
 */
export function selectNextQuestion(
  allQuestions: QuestionRow[],
  answers: Answer[],
): QuestionRow | null {
  const answeredIds = new Set(answers.map((a) => a.questionId));

  const answeredPerDimension: Record<Dimension, number> = {
    E_I: 0,
    S_N: 0,
    T_F: 0,
    J_P: 0,
  };
  for (const q of allQuestions) {
    if (answeredIds.has(q.id)) {
      answeredPerDimension[q.dimension]++;
    }
  }

  const totalAnswered = Object.values(answeredPerDimension).reduce((a, b) => a + b, 0);
  if (totalAnswered >= QUESTIONS_PER_DIMENSION * DIMENSION_ORDER.length) {
    return null;
  }

  let targetDimension: Dimension | null = null;
  let minAnswered = Infinity;
  for (const dim of DIMENSION_ORDER) {
    if (
      answeredPerDimension[dim] < QUESTIONS_PER_DIMENSION &&
      answeredPerDimension[dim] < minAnswered
    ) {
      minAnswered = answeredPerDimension[dim];
      targetDimension = dim;
    }
  }
  if (!targetDimension) return null;

  const candidates = allQuestions
    .filter((q) => q.dimension === targetDimension && !answeredIds.has(q.id) && q.is_active === 1)
    .sort((a, b) => b.discrimination - a.discrimination);

  return candidates[0] ?? null;
}

const POLE_MAP: Record<Dimension, [string, string]> = {
  E_I: ['E', 'I'],
  S_N: ['S', 'N'],
  T_F: ['T', 'F'],
  J_P: ['J', 'P'],
};

/**
 * Calculates MBTI type from answers.
 * Value 1 = first pole (E, S, T, J); value 2 = second pole (I, N, F, P).
 * Simple average per dimension: ≤1.5 = first pole, >1.5 = second pole.
 */
export function calculateMBTIType(allQuestions: QuestionRow[], answers: Answer[]): MBTIType {
  const questionById = new Map(allQuestions.map((q) => [q.id, q]));
  const scores: Record<Dimension, number[]> = { E_I: [], S_N: [], T_F: [], J_P: [] };

  for (const answer of answers) {
    const q = questionById.get(answer.questionId);
    if (q) scores[q.dimension].push(answer.value);
  }

  const letters = DIMENSION_ORDER.map((dim) => {
    const vals = scores[dim];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 1.5;
    const [pole1, pole2] = POLE_MAP[dim];
    return avg <= 1.5 ? pole1 : pole2;
  });

  return letters.join('') as MBTIType;
}
