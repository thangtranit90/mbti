import { toPng } from 'html-to-image';

export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'error';

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

export async function generateAndShare(
  node: HTMLElement,
  fileName: string,
  shareText: string,
  pageUrl: string,
): Promise<ShareResult> {
  try {
    // Ensure web fonts are ready before rasterizing — otherwise the PNG can
    // render with fallback fonts instead of Clash Display / Inter.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
    const dataUrl = await toPng(node, {
      pixelRatio: 1,
      cacheBust: false,
    });
    const file = await dataUrlToFile(dataUrl, fileName);

    const shareData: ShareData = {
      title: shareText,
      text: shareText,
      url: pageUrl,
      files: [file],
    };

    if (typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'cancelled';
      }
    }

    // Fallback: trigger download of the PNG.
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'downloaded';
  } catch (err) {
    // Final fallback: copy URL to clipboard.
    try {
      await navigator.clipboard.writeText(pageUrl);
      return 'copied';
    } catch {
      console.error('share failed:', err);
      return 'error';
    }
  }
}
