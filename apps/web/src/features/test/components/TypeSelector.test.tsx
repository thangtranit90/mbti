import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Mocks (hoisted before imports) ───────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({ useNavigate: () => mockNavigate }));

const mockSetDeclaredType = vi.fn();
vi.mock('../store/useTestStore', () => ({
  useTestStore: (sel: (s: unknown) => unknown) =>
    sel({ setDeclaredType: mockSetDeclaredType }),
}));

vi.mock('@/lib/posthog', () => ({ safeCapture: vi.fn() }));
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));
vi.mock('./AiDisclaimer', () => ({ AiDisclaimer: () => null }));

// Strip framer-motion animation props so motion.div/button render as plain DOM elements.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  type MotionProps = {
    children?: React.ReactNode;
    animate?: unknown; initial?: unknown; exit?: unknown;
    transition?: unknown; whileTap?: unknown;
    [k: string]: unknown;
  };
  const MOTION_KEYS = new Set(['animate', 'initial', 'exit', 'transition', 'whileTap']);
  const strip = ({ children, ...props }: MotionProps) => ({
    rest: Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_KEYS.has(k))),
    children,
  });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: {
      div: (p: MotionProps) => {
        const { rest, children } = strip(p);
        return React.createElement('div', rest as React.HTMLAttributes<HTMLDivElement>, children);
      },
      button: (p: MotionProps) => {
        const { rest, children } = strip(p);
        return React.createElement('button', rest as React.ButtonHTMLAttributes<HTMLButtonElement>, children);
      },
    },
    useReducedMotion: () => false,
  };
});

import { TypeSelector } from './TypeSelector';
import React from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

type Root = ReturnType<typeof createRoot>;

function findByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TypeSelector', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    mockSetDeclaredType.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(TypeSelector));
    });
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
  });

  it('skip button calls setDeclaredType(null) and navigates to /test immediately', () => {
    const skipBtn = findByText(container, 'không chắc');
    expect(skipBtn).toBeDefined();

    act(() => { skipBtn!.click(); });

    expect(mockSetDeclaredType).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith('/test');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('back arrow does not write to store or navigate', () => {
    // Enter Phase 2 by tapping the first group card
    const firstGroupCard = container.querySelector<HTMLButtonElement>(
      '[role="radiogroup"] [role="radio"]',
    );
    expect(firstGroupCard).not.toBeNull();
    act(() => { firstGroupCard!.click(); });

    // Back button is now visible in Phase 2 header
    const backBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Quay lại nhóm"]',
    );
    expect(backBtn).not.toBeNull();
    act(() => { backBtn!.click(); });

    expect(mockSetDeclaredType).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('tapping a type card calls setDeclaredType(code) and navigates after 450ms', () => {
    // Enter Phase 2
    const firstGroupCard = container.querySelector<HTMLButtonElement>(
      '[role="radiogroup"] [role="radio"]',
    );
    act(() => { firstGroupCard!.click(); });

    // Get first type card from Phase 2 grid
    const firstTypeCard = container.querySelector<HTMLButtonElement>(
      '[role="radiogroup"] [role="radio"]',
    );
    expect(firstTypeCard).not.toBeNull();

    // Derive expected MBTI code from aria-label: "{VN name} — {CODE}: {recognition}"
    const code = firstTypeCard!.getAttribute('aria-label')?.match(/— (\w{4}):/)?.[1];
    expect(code).toBeTruthy();

    act(() => { firstTypeCard!.click(); });
    // Timer is pending — no navigation yet
    expect(mockNavigate).not.toHaveBeenCalled();

    // Advance past the 450ms confirmation delay
    act(() => { vi.advanceTimersByTime(450); });

    expect(mockSetDeclaredType).toHaveBeenCalledWith(code);
    expect(mockNavigate).toHaveBeenCalledWith('/test');
  });
});
