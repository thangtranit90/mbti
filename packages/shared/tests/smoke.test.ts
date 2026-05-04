import { describe, it, expect } from 'vitest';
import { MBTI_TYPES } from '../src';

describe('packages/shared smoke', () => {
  it('exports 16 MBTI types', () => {
    expect(MBTI_TYPES).toHaveLength(16);
  });
});
