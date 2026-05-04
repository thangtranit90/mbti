import type { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';

describe('apps/web smoke', () => {
  it('renders trivial JSX', () => {
    const node: ReactElement = <span data-testid="smoke">ok</span>;
    // ReactElement.props is typed as `unknown` in React 19 — narrow before access.
    const props = node.props as { ['data-testid']?: string };
    expect(props['data-testid']).toBe('smoke');
  });
});
