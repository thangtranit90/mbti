import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement, Fragment } from 'react';
import React from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import type { Question } from '@mbti/shared';

// Strip framer-motion so motion components render as plain DOM elements
vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children),
  motion: {
    div: ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) =>
      createElement('div', rest, children),
  },
}));

import { QuestionCard } from './QuestionCard';

const mockQuestion: Question = {
  id: 'q-ei-01',
  text: 'Sau một ngày làm việc mệt mỏi, bạn thích làm gì nhất?',
  dimension: 'E_I',
  options: [
    { label: 'Gặp gỡ bạn bè, ra ngoài xã giao', value: 1 },
    { label: 'Ở nhà một mình, nạp lại năng lượng', value: 2 },
  ],
};

type Root = ReturnType<typeof createRoot>;

describe('QuestionCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
  });

  function renderCard(onAnswer: () => void, questionIndex = 0) {
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(QuestionCard, {
          question: mockQuestion,
          questionIndex,
          onAnswer,
        }),
      );
    });
  }

  function getRadios() {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  }

  it('renders question text and all option labels', () => {
    renderCard(vi.fn());
    expect(container.textContent).toContain(mockQuestion.text);
    expect(container.textContent).toContain('Gặp gỡ bạn bè, ra ngoài xã giao');
    expect(container.textContent).toContain('Ở nhà một mình, nạp lại năng lượng');
  });

  it('tapping an option sets aria-checked=true on that option, false on others', () => {
    renderCard(vi.fn());
    const [opt1, opt2] = getRadios();

    act(() => { opt1.click(); });

    expect(opt1.getAttribute('aria-checked')).toBe('true');
    expect(opt2.getAttribute('aria-checked')).toBe('false');
  });

  it('onAnswer is called with (questionId, value) after selection delay', () => {
    const onAnswer = vi.fn();
    renderCard(onAnswer);
    const [, opt2] = getRadios(); // second option value=2

    act(() => { opt2.click(); });
    expect(onAnswer).not.toHaveBeenCalled(); // timer still pending

    act(() => { vi.advanceTimersByTime(350); });

    expect(onAnswer).toHaveBeenCalledWith('q-ei-01', 2);
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('double-tap is ignored after first selection', () => {
    const onAnswer = vi.fn();
    renderCard(onAnswer);
    const [opt1, opt2] = getRadios();

    act(() => { opt1.click(); }); // first tap
    act(() => { opt2.click(); }); // second tap — ignored

    act(() => { vi.advanceTimersByTime(350); });

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith('q-ei-01', 1);
  });

  it('renders active progress dot for correct question index', () => {
    renderCard(vi.fn(), 3);
    const activeDot = container.querySelector<HTMLSpanElement>('[aria-label="Câu 4 / 12"]');
    expect(activeDot).not.toBeNull();
  });

  // Regression (invitee perception flow bug): selecting an option latches the
  // whole group disabled. A consumer that re-renders QuestionCard for the next
  // question WITHOUT changing its React key reuses this disabled state and the
  // user gets stuck. InviteeLanding/TestFlow must key on question id.
  it('latches all options disabled after a selection', () => {
    renderCard(vi.fn());
    const [opt1, opt2] = getRadios();
    act(() => { opt1.click(); });
    expect(opt1.disabled).toBe(true);
    expect(opt2.disabled).toBe(true);
  });

  it('a fresh mount (new key per question) starts enabled again', () => {
    const onAnswer = vi.fn();
    renderCard(onAnswer);
    act(() => { getRadios()[0].click(); });
    expect(getRadios().every((r) => r.disabled)).toBe(true);

    // Simulate the key-driven remount the parent must do for the next question.
    act(() => { root.unmount(); });
    act(() => {
      root = createRoot(container);
      root.render(
        React.createElement(QuestionCard, {
          question: { ...mockQuestion, id: 'p2-social' },
          questionIndex: 1,
          onAnswer,
        }),
      );
    });
    expect(getRadios().every((r) => !r.disabled)).toBe(true);
  });
});
