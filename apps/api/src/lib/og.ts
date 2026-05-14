import satori from 'satori';
import type { MBTIType } from '@mbti/shared';

// Type-specific accent colors (matching tailwind text-type-{TYPE} palette).
const TYPE_COLORS: Record<MBTIType, { accent: string; bgGradient: string }> = {
  INTJ: { accent: '#a78bfa', bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f0a1a 100%)' },
  INTP: { accent: '#8b5cf6', bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f0a1a 100%)' },
  ENTJ: { accent: '#f87171', bgGradient: 'linear-gradient(135deg, #450a0a 0%, #1a0606 100%)' },
  ENTP: { accent: '#fb923c', bgGradient: 'linear-gradient(135deg, #431407 0%, #1a0a04 100%)' },
  INFJ: { accent: '#c084fc', bgGradient: 'linear-gradient(135deg, #2e1065 0%, #0d0420 100%)' },
  INFP: { accent: '#f472b6', bgGradient: 'linear-gradient(135deg, #500724 0%, #1a0210 100%)' },
  ENFJ: { accent: '#fbbf24', bgGradient: 'linear-gradient(135deg, #422006 0%, #1a0c02 100%)' },
  ENFP: { accent: '#facc15', bgGradient: 'linear-gradient(135deg, #422006 0%, #1a0c02 100%)' },
  ISTJ: { accent: '#60a5fa', bgGradient: 'linear-gradient(135deg, #172554 0%, #0a0f1f 100%)' },
  ISFJ: { accent: '#34d399', bgGradient: 'linear-gradient(135deg, #022c22 0%, #010f0c 100%)' },
  ESTJ: { accent: '#3b82f6', bgGradient: 'linear-gradient(135deg, #172554 0%, #0a0f1f 100%)' },
  ESFJ: { accent: '#10b981', bgGradient: 'linear-gradient(135deg, #022c22 0%, #010f0c 100%)' },
  ISTP: { accent: '#9ca3af', bgGradient: 'linear-gradient(135deg, #1f2937 0%, #0a0d12 100%)' },
  ISFP: { accent: '#fde68a', bgGradient: 'linear-gradient(135deg, #422006 0%, #1a0c02 100%)' },
  ESTP: { accent: '#f87171', bgGradient: 'linear-gradient(135deg, #450a0a 0%, #1a0606 100%)' },
  ESFP: { accent: '#fb7185', bgGradient: 'linear-gradient(135deg, #500724 0%, #1a0210 100%)' },
};

let cachedFont: ArrayBuffer | null = null;
let inFlightFontFetch: Promise<ArrayBuffer> | null = null;
let wasmInitialized = false;

async function getInterFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;
  // Dedupe concurrent cold-start requests: cache the in-flight promise so all
  // callers await the same fetch.
  if (inFlightFontFetch) return inFlightFontFetch;
  inFlightFontFetch = (async () => {
    try {
      // Satori requires OTF/TTF (not WOFF2). Fontsource on JsDelivr serves TTF.
      const res = await fetch(
        'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf',
        { signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) throw new Error(`Font binary fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      cachedFont = buf;
      return buf;
    } finally {
      inFlightFontFetch = null;
    }
  })();
  return inFlightFontFetch;
}

export async function generateOGSvg(
  personaName: string,
  mbtiType: MBTIType,
): Promise<string> {
  const { accent, bgGradient } = TYPE_COLORS[mbtiType];
  const fontData = await getInterFont();

  const svg = await satori(
    // satori accepts a JSX-like plain object tree at runtime; its typings expect
    // ReactNode which doesn't match the literal shape, but the runtime is fine.
    // @ts-expect-error satori runtime accepts this shape
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '1200px',
          height: '630px',
          padding: '60px 80px',
          background: bgGradient,
          color: '#fff',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '20px',
                color: '#94a3b8',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              },
              children: 'Quiet Mirror',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontSize: '88px',
                      fontWeight: 700,
                      color: accent,
                      lineHeight: 1.1,
                    },
                    children: personaName,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontSize: '32px',
                      color: accent,
                      letterSpacing: '0.3em',
                    },
                    children: mbtiType,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '18px',
                color: '#64748b',
              },
              children: 'Discover your personality type',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontData, weight: 700, style: 'normal' },
      ],
    },
  );

  return svg;
}

export async function generateOGPng(
  personaName: string,
  mbtiType: MBTIType,
): Promise<Uint8Array> {
  const svg = await generateOGSvg(personaName, mbtiType);
  // Lazy-load resvg-wasm (heavy module; only loaded on cache-miss).
  const { Resvg, initWasm } = await import('@resvg/resvg-wasm');
  if (!wasmInitialized) {
    // wasm asset bundled by wrangler (see wrangler.toml [[rules]] CompiledWasm).
    // @ts-expect-error wasm module lacks TS declarations
    const wasm = await import('@resvg/resvg-wasm/index_bg.wasm');
    await initWasm(wasm.default);
    wasmInitialized = true;
  }
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}
