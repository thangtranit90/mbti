import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MBTIType } from '@mbti/shared';

type Answer = { questionId: string; value: number };

type TestState = {
  declaredType: MBTIType | null;
  answers: Answer[];
  currentIndex: number;
  setDeclaredType: (type: MBTIType | null) => void;
  setAnswer: (questionId: string, value: number) => void;
  setCurrentIndex: (index: number) => void;
  reset: () => void;
};

// Wraps localStorage access to silently absorb quota-exceeded / blocked-storage errors
// (private browsing mode on some browsers, storage quota exhaustion). The store
// remains fully functional in memory; writes simply do not persist to disk.
const safeLocalStorage = {
  getItem: (name: string): string | null => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string): void => {
    try { localStorage.setItem(name, value); } catch { /* quota exceeded / blocked */ }
  },
  removeItem: (name: string): void => {
    try { localStorage.removeItem(name); } catch { /* ignore */ }
  },
};

// `name` is the literal localStorage key per architecture.md#Communication Patterns
// and epics.md:129 — required by NFR18 (24h test progress preservation).
export const useTestStore = create<TestState>()(
  persist(
    (set) => ({
      declaredType: null,
      answers: [],
      currentIndex: 0,
      setDeclaredType: (type) => set({ declaredType: type }),
      setAnswer: (questionId, value) =>
        set((s) => ({
          answers: [
            ...s.answers.filter((a) => a.questionId !== questionId),
            { questionId, value },
          ],
        })),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      reset: () => set({ declaredType: null, answers: [], currentIndex: 0 }),
    }),
    {
      name: 'mbti-test-progress',
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
