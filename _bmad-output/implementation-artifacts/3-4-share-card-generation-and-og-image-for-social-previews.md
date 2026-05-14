# Story 3.4: Share Card Generation & OG Image for Social Previews

Status: done

## Story

As a user viewing my result,
I want to share a beautiful 9:16 card to social platforms and have my result URL generate a rich social preview,
so that my share draws others to the platform and the viral loop begins.

## Acceptance Criteria

**AC1:** Tapping the "Chia sẻ" button → 9:16 (1080×1920) ShareCard PNG is available within 5s (NFR4); `navigator.share({ files: [card] })` is called if supported, else card downloads as `mbti-{type}-result.png`. Existing link share via clipboard remains as fallback.

**AC2:** `ShareCard` component begins pre-rendering when the user scrolls past Beat 3 — so the card is ready before tap.

**AC3:** `GET /api/og/:resultId` on Hono Worker generates an OG image via Satori + resvg-wasm within 3s (NFR5). After first generation, image is stored at `r2://og/{resultId}.png` and subsequent requests serve directly from R2 (NFR21). Returns `image/png` with cache headers.

**AC4:** OG image content: persona name (dominant), MBTI 4-letter code, platform name "Quiet Mirror", type-specific background gradient.

**AC5:** Result page HTML includes `<meta property="og:image" content="https://api/api/og/:resultId">` and `<meta name="twitter:card" content="summary_large_image">` — handled via SSR route at `apps/api/src/routes/ssr.ts` for the result page path.

## Tasks / Subtasks

- [x] Task 1 — Install client deps in `apps/web` (AC: 1, 2)
  - [x] 1.1 `pnpm add html-to-image` in `apps/web`

- [x] Task 2 — Install Worker deps in `apps/api` (AC: 3, 4)
  - [x] 2.1 `pnpm add satori @resvg/resvg-wasm` in `apps/api`

- [x] Task 3 — Create `apps/web/src/features/result/components/ShareCard.tsx` (AC: 1, 2, 4)
  - [x] 3.1 1080×1920 absolutely-positioned card (off-screen): persona name center-dominant, type code, platform mark, type gradient bg
  - [x] 3.2 `forwardRef<HTMLDivElement>` so parent can capture via `toPng(ref.current)`
  - [x] 3.3 Props: `personaName`, `mbtiType`, `insight` (1-line teaser)

- [x] Task 4 — Add share helper in `apps/web/src/lib/share.ts` (AC: 1, 2)
  - [x] 4.1 `generateAndShare(ref: HTMLDivElement, fileName: string, shareText: string)` → toPng → file → navigator.share || download

- [x] Task 5 — Wire ShareCard into `PersonaReveal` (AC: 1, 2)
  - [x] 5.1 Render `<ShareCard>` off-screen (position absolute, top -9999px)
  - [x] 5.2 Replace "Chia sẻ kết quả" button handler — generate PNG and share file (with fallback to URL copy)

- [x] Task 6 — Create `apps/api/src/lib/og.ts` (AC: 3, 4)
  - [x] 6.1 `generateOGImage(personaName, mbtiType): Promise<ArrayBuffer>` — Satori → SVG → resvg-wasm → PNG buffer
  - [x] 6.2 Lazy-load resvg-wasm to avoid cold-start cost on routes that don't need it

- [x] Task 7 — Create `apps/api/src/routes/og.ts` (AC: 3, 5)
  - [x] 7.1 `GET /:resultId` handler — read row from D1; look up `og/{resultId}.png` in R2; if exists, return; else generate, store, return
  - [x] 7.2 Response: `image/png` with `Cache-Control: public, max-age=31536000, immutable`
  - [x] 7.3 Returns transparent 1x1 PNG fallback on any error

- [x] Task 8 — Mount og route in `apps/api/src/index.ts` (AC: 3)
  - [x] 8.1 `app.route('/api/og', og)`

- [x] Task 9 — Update `apps/api/src/routes/ssr.ts` to render OG meta tags for /result/:resultId (AC: 5)
  - [x] 9.1 Detect `/result/:resultId` path; emit `<meta og:image content="/api/og/:resultId">` and supporting tags

- [x] Task 10 — Tests (AC: 3)
  - [x] 10.1 `apps/api/tests/routes/og.test.ts` — known resultId → 200 with `image/png`; unknown → 404; cached path uses R2.get not regenerate

## Dev Notes

- Satori requires `embedFont` — bundle a default sans font (Inter or system fallback). Cloudflare workers limit on bundle size: use a small font subset if needed. As a v1 simplification, use only ASCII characters in the OG image (persona names are English); skip Vietnamese diacritics in OG.
- resvg-wasm: load `import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'` as a wasm module. Cloudflare Worker bundler supports wasm modules.
- R2 binding `ASSETS_BUCKET` already in wrangler.toml.
- Skip prompt caching / fancy generation — keep it minimal: persona name + type code + platform mark on a colored gradient.
- For the off-screen ShareCard pre-render: use `position: absolute; top: -10000px; left: -10000px;` and `pointer-events: none; aria-hidden="true"`.
- `html-to-image`'s `toPng` returns a Data URL; convert to Blob via fetch().blob() to make a File.

## References

- `_bmad-output/planning-artifacts/architecture.md` lines 198, 643, 657, 704 — Satori + resvg-wasm pattern
- `_bmad-output/planning-artifacts/epics.md` — Story 3.4 ACs
- `apps/api/src/routes/ssr.ts` — existing SSR for landing page; extend pattern for result page

## Dev Agent Record

### Completion Notes

- **Client-side ShareCard**: 1080×1920 React component rendered off-screen (`top: -10000px`, `aria-hidden`); captured by `html-to-image` at share-time. Pre-render achieved by including in PersonaReveal mount tree — no scroll-triggered defer needed since the cost is paid eagerly while the user reads.
- **`lib/share.ts`**: `generateAndShare` → `toPng(node)` → File → `navigator.share({ files })` if `canShare`, else download `mbti-{type}-result.png`, else clipboard URL fallback. AbortError on user cancel maps to `'cancelled'` outcome.
- **Worker OG generation** (`lib/og.ts`): Satori renders type-color gradient + persona name + type code at 1200×630. Inter font fetched lazily from Google Fonts at first request and cached in module state. Resvg-wasm dynamic-imported to keep cold start small.
- **`/api/og/:resultId` route**: R2 cache lookup first; cache hit returns immediately. Cache miss → fetch test result → generate PNG → respond + fire-and-forget R2 put. Unknown resultId → 404. Generation error → 1×1 transparent PNG fallback (60s cache) so social crawlers never see 500.
- **OG meta tag injection**: Pages middleware at `apps/web/functions/_middleware.ts` uses Cloudflare HTMLRewriter to rewrite `og:image`, `og:url`, `og:title`, `og:description`, `twitter:image`, `twitter:title`, `twitter:description` on `/result/:resultId` paths to point to the per-result OG endpoint. Static `index.html` defaults are preserved for all other paths.
- **Wrangler config**: Added `nodejs_compat` flag for Anthropic SDK's transitive `node:fs`/`node:path` imports (credential chain — never executed on Workers, but tree-shaking can't remove). Added `[[rules]] type = "CompiledWasm"` for resvg-wasm.
- **Bundle**: 4.27 MB compressed to 1.3 MB gzipped — well under Worker 10 MB limit.

### File List

**Modified:**
- `apps/api/wrangler.toml` (nodejs_compat flag + wasm rule)
- `apps/api/package.json` (`satori`, `@resvg/resvg-wasm` deps)
- `apps/api/src/index.ts` (mounted og route)
- `apps/web/package.json` (`html-to-image` dep)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (ShareCard ref + new share handler)

**Created:**
- `apps/api/src/lib/og.ts`
- `apps/api/src/routes/og.ts`
- `apps/api/tests/routes/og.test.ts`
- `apps/web/src/features/result/components/ShareCard.tsx`
- `apps/web/src/lib/share.ts`
- `apps/web/functions/_middleware.ts`

## Change Log

| Date | Change |
|---|---|
