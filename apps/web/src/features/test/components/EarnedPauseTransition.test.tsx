import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement } from 'react';
import React from 'react';
import type { HTMLAttributes } from 'react';

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    div: ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) =>
      createElement('div', rest, children),
    span: ({ children, ...rest }: HTMLAttributes<HTMLSpanElement>) =>
      createElement('span', rest, children),
  },
}));

import { EarnedPauseTransition } from './EarnedPauseTransition';

type Root = ReturnType<typeof createRoot>;

describe('EarnedPauseTransition', () => {
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

  it('onComplete is called after exactly 1200ms', () => {
    const onComplete = vi.fn();
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(EarnedPauseTransition, { onComplete }));
    });

    // Not called before 1200ms
    act(() => { vi.advanceTimersByTime(1199); });
    expect(onComplete).not.toHaveBeenCalled();

    // Called at 1200ms
    act(() => { vi.advanceTimersByTime(1); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('onComplete is called exactly once (not twice or zero)', () => {
    const onComplete = vi.fn();
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(EarnedPauseTransition, { onComplete }));
    });

    act(() => { vi.advanceTimersByTime(5000); });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
