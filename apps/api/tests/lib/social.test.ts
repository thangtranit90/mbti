import { describe, it, expect } from 'vitest';
import {
  aggregateFriendAnswers,
  deriveFriendTags,
  deriveSelfTags,
} from '../../src/lib/social';

describe('deriveFriendTags', () => {
  it('high values produce HIGH labels', () => {
    const tags = deriveFriendTags([
      { questionId: 'p1-decision', value: 5 },
      { questionId: 'p2-social', value: 4 },
      { questionId: 'p3-conflict', value: 5 },
    ]);
    expect(tags).toEqual(['Quyết đoán', 'Hướng ngoại', 'Thẳng thắn']);
  });

  it('low values produce LOW labels', () => {
    const tags = deriveFriendTags([
      { questionId: 'p1-decision', value: 1 },
      { questionId: 'p2-social', value: 2 },
      { questionId: 'p3-conflict', value: 1 },
    ]);
    expect(tags).toEqual(['Cân nhắc', 'Hướng nội', 'Né tránh']);
  });
});

describe('deriveSelfTags', () => {
  it('reads E_I / T_F / J_P dimension question IDs', () => {
    const tags = deriveSelfTags([
      { questionId: 'q-ei-1', value: 5 },
      { questionId: 'q-tf-1', value: 5 },
      { questionId: 'q-jp-1', value: 5 },
    ]);
    expect(tags).toEqual(['Quyết đoán', 'Hướng ngoại', 'Thẳng thắn']);
  });
});

describe('aggregateFriendAnswers', () => {
  it('flattens multiple votes; skips malformed JSON', () => {
    const flat = aggregateFriendAnswers([
      { behavioral_answers: JSON.stringify([{ questionId: 'p1-decision', value: 5 }]) },
      { behavioral_answers: 'not-json' },
      { behavioral_answers: JSON.stringify([{ questionId: 'p2-social', value: 1 }]) },
    ]);
    expect(flat).toHaveLength(2);
    expect(flat[0]?.questionId).toBe('p1-decision');
    expect(flat[1]?.questionId).toBe('p2-social');
  });
});
