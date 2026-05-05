import { describe, it, expect } from 'vitest';
import { selectNextQuestion, calculateMBTIType } from '../../lib/cat';
import type { QuestionRow } from '@mbti/shared';

const makeQuestion = (
  id: string,
  dimension: QuestionRow['dimension'],
  discrimination = 1.0,
): QuestionRow => ({
  id,
  text: `Question ${id}`,
  dimension,
  answer_options: JSON.stringify([
    { label: 'A', value: 1 },
    { label: 'B', value: 2 },
  ]),
  discrimination,
  difficulty: 0.0,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
});

// 4 questions per dimension (3 needed + 1 spare)
const ALL = [
  makeQuestion('ei-1', 'E_I', 0.9),
  makeQuestion('ei-2', 'E_I', 0.8),
  makeQuestion('ei-3', 'E_I', 0.7),
  makeQuestion('ei-4', 'E_I', 0.6),
  makeQuestion('sn-1', 'S_N', 0.9),
  makeQuestion('sn-2', 'S_N', 0.8),
  makeQuestion('sn-3', 'S_N', 0.7),
  makeQuestion('sn-4', 'S_N', 0.6),
  makeQuestion('tf-1', 'T_F', 0.9),
  makeQuestion('tf-2', 'T_F', 0.8),
  makeQuestion('tf-3', 'T_F', 0.7),
  makeQuestion('tf-4', 'T_F', 0.6),
  makeQuestion('jp-1', 'J_P', 0.9),
  makeQuestion('jp-2', 'J_P', 0.8),
  makeQuestion('jp-3', 'J_P', 0.7),
  makeQuestion('jp-4', 'J_P', 0.6),
];

describe('selectNextQuestion', () => {
  it('(a) empty answers → returns E_I question (first dimension)', () => {
    const result = selectNextQuestion(ALL, []);
    expect(result).not.toBeNull();
    expect(result!.dimension).toBe('E_I');
    expect(result!.id).toBe('ei-1'); // highest discrimination
  });

  it('(b) 3 E_I answers → returns S_N question (next dimension)', () => {
    const answers = [
      { questionId: 'ei-1', value: 1 },
      { questionId: 'ei-2', value: 2 },
      { questionId: 'ei-3', value: 1 },
    ];
    const result = selectNextQuestion(ALL, answers);
    expect(result).not.toBeNull();
    expect(result!.dimension).toBe('S_N');
  });

  it('(c) 12 answers (3 per dimension) → returns null (complete)', () => {
    const answers = [
      { questionId: 'ei-1', value: 1 },
      { questionId: 'ei-2', value: 2 },
      { questionId: 'ei-3', value: 1 },
      { questionId: 'sn-1', value: 2 },
      { questionId: 'sn-2', value: 1 },
      { questionId: 'sn-3', value: 2 },
      { questionId: 'tf-1', value: 1 },
      { questionId: 'tf-2', value: 1 },
      { questionId: 'tf-3', value: 2 },
      { questionId: 'jp-1', value: 2 },
      { questionId: 'jp-2', value: 2 },
      { questionId: 'jp-3', value: 1 },
    ];
    const result = selectNextQuestion(ALL, answers);
    expect(result).toBeNull();
  });

  it('picks highest-discrimination unanswered question within target dimension', () => {
    // Give each dimension 1 answer so they're tied; E_I wins tie-break.
    // ei-1 (disc 0.9) already answered → next E_I should be ei-2 (disc 0.8).
    const answers = [
      { questionId: 'ei-1', value: 1 },
      { questionId: 'sn-1', value: 1 },
      { questionId: 'tf-1', value: 1 },
      { questionId: 'jp-1', value: 1 },
    ];
    const result = selectNextQuestion(ALL, answers);
    expect(result!.dimension).toBe('E_I');
    expect(result!.id).toBe('ei-2');
  });
});

describe('calculateMBTIType', () => {
  it('(d) all value=1 answers → ESTJ', () => {
    const answers = [
      { questionId: 'ei-1', value: 1 },
      { questionId: 'ei-2', value: 1 },
      { questionId: 'ei-3', value: 1 },
      { questionId: 'sn-1', value: 1 },
      { questionId: 'sn-2', value: 1 },
      { questionId: 'sn-3', value: 1 },
      { questionId: 'tf-1', value: 1 },
      { questionId: 'tf-2', value: 1 },
      { questionId: 'tf-3', value: 1 },
      { questionId: 'jp-1', value: 1 },
      { questionId: 'jp-2', value: 1 },
      { questionId: 'jp-3', value: 1 },
    ];
    expect(calculateMBTIType(ALL, answers)).toBe('ESTJ');
  });

  it('(e) all value=2 answers → INFP', () => {
    const answers = [
      { questionId: 'ei-1', value: 2 },
      { questionId: 'ei-2', value: 2 },
      { questionId: 'ei-3', value: 2 },
      { questionId: 'sn-1', value: 2 },
      { questionId: 'sn-2', value: 2 },
      { questionId: 'sn-3', value: 2 },
      { questionId: 'tf-1', value: 2 },
      { questionId: 'tf-2', value: 2 },
      { questionId: 'tf-3', value: 2 },
      { questionId: 'jp-1', value: 2 },
      { questionId: 'jp-2', value: 2 },
      { questionId: 'jp-3', value: 2 },
    ];
    expect(calculateMBTIType(ALL, answers)).toBe('INFP');
  });
});
