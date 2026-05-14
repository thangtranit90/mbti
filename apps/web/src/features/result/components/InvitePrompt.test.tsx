import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement, type ComponentProps, type ReactNode } from 'react';
import type { HTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('framer-motion', () => {
  const passthrough = (tag: string) =>
    ({ children, ...rest }: HTMLAttributes<HTMLElement>) =>
      createElement(tag, rest, children);
  return {
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      createElement('div', {}, children),
    motion: new Proxy(
      {},
      {
        get: (_t, key) => passthrough(key as string),
      },
    ),
  };
});

const { mockApiCall } = vi.hoisted(() => ({ mockApiCall: vi.fn() }));
vi.mock('@/lib/api', () => ({
  apiCall: mockApiCall,
}));

const { mockSafeCapture } = vi.hoisted(() => ({ mockSafeCapture: vi.fn() }));
vi.mock('@/lib/posthog', () => ({
  safeCapture: mockSafeCapture,
}));

import { InvitePrompt } from './InvitePrompt';

type Root = ReturnType<typeof createRoot>;

function renderInvitePrompt(props?: Partial<ComponentProps<typeof InvitePrompt>>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  act(() => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(InvitePrompt, {
          resultId: '11111111-2222-4333-8444-555555555555',
          personaName: 'The Hidden Compass',
          mbtiType: 'INFP',
          ...props,
        } as ComponentProps<typeof InvitePrompt>),
      ),
    );
  });
  return { container, root };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('InvitePrompt', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockApiCall.mockReset();
    mockSafeCapture.mockReset();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    vi.restoreAllMocks();
  });

  it('renders the Ghost CTA with expected copy', () => {
    ({ container, root } = renderInvitePrompt());
    const cta = container.querySelector('[data-testid="test-your-friends-cta"]');
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain('Xem bạn bè thấy bạn thế nào');
  });

  it('on CTA click → calls /api/invites/generate and opens sheet with inviteUrl', async () => {
    mockApiCall.mockResolvedValueOnce({
      data: {
        inviteUrl: 'https://test.example/invite/abc',
        token: 'abc',
        expiredAt: '2026-06-14T00:00:00.000Z',
      },
      error: null,
    });
    ({ container, root } = renderInvitePrompt());
    const cta = container.querySelector(
      '[data-testid="test-your-friends-cta"]',
    ) as HTMLButtonElement;
    await act(async () => {
      cta.click();
      await flush();
      await flush();
    });

    expect(mockApiCall).toHaveBeenCalledWith(
      '/api/invites/generate',
      expect.objectContaining({ method: 'POST' }),
    );
    const url = container.querySelector('[data-testid="invite-url"]');
    expect(url?.textContent).toContain('https://test.example/invite/abc');
    expect(mockSafeCapture).toHaveBeenCalledWith('invite_generated', {
      resultId: '11111111-2222-4333-8444-555555555555',
      token: 'abc',
    });
  });

  it('copy button → writes invite URL to clipboard and shows confirmation', async () => {
    mockApiCall.mockResolvedValueOnce({
      data: {
        inviteUrl: 'https://test.example/invite/xyz',
        token: 'xyz',
        expiredAt: '2026-06-14T00:00:00.000Z',
      },
      error: null,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    ({ container, root } = renderInvitePrompt());
    const cta = container.querySelector(
      '[data-testid="test-your-friends-cta"]',
    ) as HTMLButtonElement;
    await act(async () => {
      cta.click();
      await flush();
      await flush();
    });

    const copyBtn = container.querySelector(
      '[data-testid="invite-copy-btn"]',
    ) as HTMLButtonElement;
    await act(async () => {
      copyBtn.click();
      await flush();
    });

    expect(writeText).toHaveBeenCalledWith('https://test.example/invite/xyz');
    expect(container.textContent).toContain('Đã sao chép link!');
  });

  it('share button hidden when navigator.share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    mockApiCall.mockResolvedValueOnce({
      data: {
        inviteUrl: 'https://test.example/invite/no-share',
        token: 't',
        expiredAt: '2026-06-14T00:00:00.000Z',
      },
      error: null,
    });

    ({ container, root } = renderInvitePrompt());
    const cta = container.querySelector(
      '[data-testid="test-your-friends-cta"]',
    ) as HTMLButtonElement;
    await act(async () => {
      cta.click();
      await flush();
      await flush();
    });

    expect(container.querySelector('[data-testid="invite-share-btn"]')).toBeNull();
  });
});
