import { describe, it, expect } from 'vitest';
import { MBTI_TYPES } from '@mbti/shared';
import { TYPE_GROUPS, TYPE_META } from './typeGroups';

describe('TYPE_GROUPS', () => {
  it('covers all 16 MBTI_TYPES exactly once across groups', () => {
    const flat = TYPE_GROUPS.flatMap((g) => g.types);
    expect(flat).toHaveLength(MBTI_TYPES.length);
    expect(new Set(flat).size).toBe(MBTI_TYPES.length);
    for (const t of MBTI_TYPES) {
      expect(flat).toContain(t);
    }
  });

  it('has exactly 4 types per group', () => {
    for (const group of TYPE_GROUPS) {
      expect(group.types).toHaveLength(4);
    }
  });

  it('has 4 distinct group keys', () => {
    const keys = TYPE_GROUPS.map((g) => g.key);
    expect(new Set(keys).size).toBe(4);
    expect(keys).toEqual(['analysts', 'diplomats', 'sentinels', 'explorers']);
  });
});

describe('TYPE_META', () => {
  it('has exactly 16 entries — one per MBTIType', () => {
    expect(Object.keys(TYPE_META)).toHaveLength(16);
    for (const t of MBTI_TYPES) {
      expect(TYPE_META[t]).toBeDefined();
    }
  });

  it('every entry has non-empty vietnameseName and recognition strings', () => {
    for (const t of MBTI_TYPES) {
      const meta = TYPE_META[t];
      expect(meta.code).toBe(t);
      expect(meta.vietnameseName.length).toBeGreaterThan(0);
      expect(meta.recognition.length).toBeGreaterThan(0);
    }
  });
});
