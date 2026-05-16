import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareToFacebook, copyToClipboard } from './share';

afterEach(() => vi.restoreAllMocks());

describe('shareToFacebook', () => {
  it('opens the FB sharer dialog with the URL-encoded target', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    shareToFacebook('https://mbti.thanghost.io.vn/invite/abc-123');
    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0]![0] as string;
    expect(url).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent('https://mbti.thanghost.io.vn/invite/abc-123'),
    );
  });
});

describe('copyToClipboard', () => {
  it('returns true when clipboard write succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    vi.unstubAllGlobals();
  });

  it('returns false (never throws) when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });
    await expect(copyToClipboard('x')).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
