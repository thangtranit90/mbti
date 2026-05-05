import { describe, it, expect, beforeEach } from 'vitest';
import { useTestStore } from './useTestStore';

beforeEach(() => {
  // Reset to defaults between cases. Persistence (localStorage) is verified
  // implicitly by zustand's `persist` middleware — Node's experimental web
  // storage shadows jsdom's in this test env, so behavioral coverage here
  // sticks to in-memory state.
  useTestStore.getState().reset();
});

describe('useTestStore', () => {
  it('starts with declaredType=null, empty answers, currentIndex=0', () => {
    const s = useTestStore.getState();
    expect(s.declaredType).toBeNull();
    expect(s.answers).toEqual([]);
    expect(s.currentIndex).toBe(0);
  });

  it('setDeclaredType("INFP") writes the value', () => {
    useTestStore.getState().setDeclaredType('INFP');
    expect(useTestStore.getState().declaredType).toBe('INFP');
  });

  it('setDeclaredType(null) writes the skip value', () => {
    useTestStore.getState().setDeclaredType('INTJ');
    useTestStore.getState().setDeclaredType(null);
    expect(useTestStore.getState().declaredType).toBeNull();
  });

  it('reset() clears all three fields back to defaults', () => {
    useTestStore.getState().setDeclaredType('ENFP');
    useTestStore.getState().reset();
    const s = useTestStore.getState();
    expect(s.declaredType).toBeNull();
    expect(s.answers).toEqual([]);
    expect(s.currentIndex).toBe(0);
  });

  it('setAnswer appends a new answer to answers', () => {
    useTestStore.getState().setAnswer('q-ei-01', 1);
    expect(useTestStore.getState().answers).toEqual([{ questionId: 'q-ei-01', value: 1 }]);
  });

  it('setAnswer replaces an existing answer with the same questionId', () => {
    useTestStore.getState().setAnswer('q-ei-01', 1);
    useTestStore.getState().setAnswer('q-ei-01', 2);
    const { answers } = useTestStore.getState();
    expect(answers).toHaveLength(1);
    expect(answers[0]).toEqual({ questionId: 'q-ei-01', value: 2 });
  });

  it('setCurrentIndex(5) sets currentIndex to 5', () => {
    useTestStore.getState().setCurrentIndex(5);
    expect(useTestStore.getState().currentIndex).toBe(5);
  });
});
