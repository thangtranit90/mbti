import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement, type ReactNode } from 'react';
import type { HTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Enable React's act() environment so state updates from resolved react-query
// promises flush synchronously inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('framer-motion', () => {
  const passthrough = (tag: string) =>
    ({ children, ...rest }: HTMLAttributes<HTMLElement>) =>
      createElement(tag, rest, children);
  return {
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      createElement('div', {}, children),
    motion: new Proxy({}, { get: (_t, key) => passthrough(key as string) }),
  };
});

const { mockApiCall } = vi.hoisted(() => ({ mockApiCall: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiCall: mockApiCall }));

const { mockSafeCapture } = vi.hoisted(() => ({ mockSafeCapture: vi.fn() }));
vi.mock('@/lib/posthog', () => ({ safeCapture: mockSafeCapture }));

vi.mock('@/features/social/hooks/useSocialNotification', () => ({
  setLatestResultId: vi.fn(),
}));

const RESULT_ID = '11111111-2222-4333-8444-555555555555';

vi.mock('react-router', () => ({
  useParams: () => ({ resultId: RESULT_ID }),
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) =>
    createElement('a', { href: to, ...rest }, children),
}));

// Isolate ResultPage gate logic — stub the (heavy) reveal.
vi.mock('./PersonaReveal', () => ({
  PersonaReveal: (props: { personaName: string }) =>
    createElement('div', { 'data-testid': 'persona-reveal' }, props.personaName),
}));

import { ResultPage } from './ResultPage';

type Root = ReturnType<typeof createRoot>;
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function routeApi(access: {
  unlocked: boolean;
  paid: boolean;
  friendCount: number;
  threshold: number;
}) {
  mockApiCall.mockImplementation(async (path: string) => {
    if (path === `/api/results/${RESULT_ID}/access`) {
      return { data: access, error: null };
    }
    if (path === '/api/invites/generate') {
      return {
        data: { inviteUrl: 'https://x.test/invite/tok', token: 'tok', expiredAt: '2026-12-01' },
        error: null,
      };
    }
    if (path === `/api/tests/${RESULT_ID}`) {
      return {
        data: {
          id: RESULT_ID,
          locked: false,
          mbtiType: 'INFP',
          declaredType: null,
          personaName: 'The Hidden Compass',
          createdAt: '2026-05-05T00:00:00.000Z',
        },
        error: null,
      };
    }
    if (path === `/api/results/${RESULT_ID}/insight`) {
      return {
        data: { locked: false, personaName: 'The Hidden Compass', insight: 'x', villains: [] },
        error: null,
      };
    }
    if (path === '/api/insights/generate') {
      return { data: { content: 'ai', source: 'ai' }, error: null };
    }
    return { data: null, error: null };
  });
}

async function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  await act(async () => {
    root.render(
      createElement(QueryClientProvider, { client }, createElement(ResultPage)),
    );
  });
  // Settle: access query → (if unlocked) content queries → re-render.
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await flush();
    });
  }
  return { container, root };
}

describe('ResultPage paywall gate', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockApiCall.mockReset();
    mockSafeCapture.mockReset();
  });
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.restoreAllMocks();
  });

  it('locked → renders the gate, withholds result content', async () => {
    routeApi({ unlocked: false, paid: false, friendCount: 0, threshold: 2 });
    ({ container, root } = await render());

    expect(container.textContent).toContain('Kết quả của bạn đã sẵn sàng');
    expect(container.querySelector('[data-testid="gate-pay-btn"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="persona-reveal"]')).toBeNull();
    // Content endpoints must NOT be called while locked.
    const paths = mockApiCall.mock.calls.map((c) => c[0]);
    expect(paths).not.toContain(`/api/tests/${RESULT_ID}`);
    expect(paths).not.toContain(`/api/results/${RESULT_ID}/insight`);
  });

  it('locked → friend progress reflects access.friendCount', async () => {
    routeApi({ unlocked: false, paid: false, friendCount: 1, threshold: 2 });
    ({ container, root } = await render());

    const progress = container.querySelector('[data-testid="friend-progress"]');
    expect(progress?.textContent).toBe('1/2 bạn đã hoàn thành');
    expect(container.textContent).toContain('Còn 1 bạn nữa');
  });

  it('unlocked → fetches content and renders PersonaReveal', async () => {
    routeApi({ unlocked: true, paid: false, friendCount: 2, threshold: 2 });
    ({ container, root } = await render());

    const paths = mockApiCall.mock.calls.map((c) => c[0]);
    expect(paths).toContain(`/api/tests/${RESULT_ID}`);
    const reveal = container.querySelector('[data-testid="persona-reveal"]');
    expect(reveal).not.toBeNull();
    expect(reveal?.textContent).toContain('The Hidden Compass');
  });
});
