import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement } from 'react';
import type { HTMLAttributes } from 'react';

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    section: ({ children, ...rest }: HTMLAttributes<HTMLElement>) =>
      createElement('section', rest, children),
  },
}));

import { ReverseReveal } from './ReverseReveal';

type Root = ReturnType<typeof createRoot>;

describe('ReverseReveal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('renders nothing when declaredType === null', () => {
    act(() => {
      root = createRoot(container);
      root.render(
        <ReverseReveal
          declaredType={null}
          calculatedType="INFP"
          personaName="The Hidden Compass"
        />,
      );
    });
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders confirmation card when declared === calculated', () => {
    act(() => {
      root = createRoot(container);
      root.render(
        <ReverseReveal
          declaredType="INFP"
          calculatedType="INFP"
          personaName="The Hidden Compass"
        />,
      );
    });
    const heading = container.querySelector('h2');
    expect(heading?.textContent).toBe('Bạn đã đúng');
    expect(container.textContent).toContain('The Hidden Compass');
    expect(container.textContent).toContain('INFP');
  });

  it('renders side-by-side comparison when declared !== calculated', () => {
    act(() => {
      root = createRoot(container);
      root.render(
        <ReverseReveal
          declaredType="INFJ"
          calculatedType="INFP"
          personaName="The Hidden Compass"
        />,
      );
    });
    const heading = container.querySelector('h2');
    expect(heading?.textContent).toBe('Bạn nghĩ — và bạn thực sự');
    expect(container.textContent).toContain('INFJ');
    expect(container.textContent).toContain('INFP');
    expect(container.textContent).toContain('The Hidden Compass');
  });
});
