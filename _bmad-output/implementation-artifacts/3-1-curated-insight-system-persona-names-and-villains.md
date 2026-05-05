# Story 3.1: Curated Insight System, Persona Names & Villains

Status: ready-for-dev

## Story

As a user who has just completed the test,
I want to receive a persona name, a behavioral insight, and a list of 3 conflict types specific to my MBTI type,
so that I experience a result that feels substantive and personally meaningful before AI enhancement is applied.

## Acceptance Criteria

**AC1:** Given a `test_results` D1 row with a calculated `mbti_type`
When the result page loads and calls `GET /api/results/{resultId}/insight`
Then the response includes `personaName` (from `PERSONA_NAMES` constant in `@mbti/shared`), `insight` (from `curated_insights` D1 table via `getCuratedInsight(db, mbtiType)` in `lib/db.ts`), and `villains` (from `VILLAINS_MAP` constant in `@mbti/shared`) — all in `{ data: {...}, error: null }` envelope

**AC2:** Given the `curated_insights` D1 table seeded via `migrations/0002_curated_insights_seed.sql`
When `getCuratedInsight(db, mbtiType)` is called for any of the 16 MBTI types
Then at least one row is returned with `mbti_type`, `content` (behavioral description string), `source: 'curated'`

**AC3:** Given the `PERSONA_NAMES` and `VILLAINS_MAP` constants in `packages/shared/src/constants.ts`
When imported in the API route
Then every MBTI type maps to exactly one persona name string and exactly three villain type codes with explanation strings — no `PLACEHOLDER_REASON` references remain

**AC4:** Given the `curated_insights` table has no active row for a type (edge case)
When `GET /api/results/{resultId}/insight` is called
Then the API returns a safe default insight string rather than a 500 error — the route handler uses a fallback constant, not raw null access

**AC5:** Given a user is on the result page after `PersonaReveal` renders
When Beat 2 fires (800ms delay after Beat 1)
Then the behavioral insight text slides up and fades in below the persona name (Framer Motion, 400ms `slide-up + fade`), followed by Beat 3 (type code at 1400ms)

**AC6:** Given `InsightCard` renders the curated insight text
When displayed
Then it shows the insight string from the API response in Inter 16px, `text-slate-300`, with a `VillainsSection` below it showing 3 villain type chips and their reason strings

## Tasks / Subtasks

- [ ] Task 1 — Replace placeholder content in `packages/shared/src/constants.ts` (AC: 3)
  - [ ] 1.1 Replace all 16 `PERSONA_NAMES` values with production copy (see Dev Notes — Curated Copy)
  - [ ] 1.2 Replace all 48 `PLACEHOLDER_REASON` strings in `VILLAINS_MAP` with production villain reason copy (see Dev Notes — Curated Copy)
  - [ ] 1.3 Delete the `const PLACEHOLDER_REASON` line and its TODO comment — no placeholder references remain after this task

- [ ] Task 2 — Create migration `migrations/0006_curated_insights_content.sql` (AC: 2)
  - [ ] 2.1 UPDATE all 16 placeholder rows with production curated insight strings (see Dev Notes — Curated Copy)
  - [ ] 2.2 Use `WHERE id = 'placeholder-insight-{TYPE}-v1'` to target exact rows
  - [ ] 2.3 Set `updated_at = '2026-05-05T00:00:00.000Z'` on all updated rows
  - [ ] 2.4 Apply migration locally: `wrangler d1 execute mbti --local --file=migrations/0006_curated_insights_content.sql`

- [ ] Task 3 — Add schema + query key to `packages/shared` (AC: 1)
  - [ ] 3.1 In `packages/shared/src/schemas/insight.ts` — add `VillainEntrySchema`, `ResultInsightResponseSchema` (see Dev Notes — Schema)
  - [ ] 3.2 In `packages/shared/src/queryKeys.ts` — add `resultInsight: (resultId: string) => ['resultInsight', resultId] as const`
  - [ ] 3.3 Verify `packages/shared/src/index.ts` already re-exports `./schemas/insight` (it does — no change needed)

- [ ] Task 4 — Add `getCuratedInsight` helper to `apps/api/src/lib/db.ts` (AC: 2, 4)
  - [ ] 4.1 Add `getCuratedInsight(db: D1Database, mbtiType: MBTIType): Promise<CuratedInsightRow | null>` — SELECT first active row for type, ORDER BY created_at ASC, LIMIT 1; throw on `!result.success`; return `result.results[0] ?? null`
  - [ ] 4.2 Do NOT modify existing `getActiveCuratedInsights` — that is the multi-row helper owned by Story 3.2

- [ ] Task 5 — Create `apps/api/src/routes/insights.ts` (AC: 1, 4)
  - [ ] 5.1 `GET /:resultId/insight` — NO `requireSession` (public route; result is shareable)
  - [ ] 5.2 Fetch test result via `getTestResult(db, c.req.param('resultId'))` — return 404 `NOT_FOUND` if null
  - [ ] 5.3 Derive `personaName = PERSONA_NAMES[mbtiType]` from `@mbti/shared`
  - [ ] 5.4 Derive `villains = VILLAINS_MAP[mbtiType]` from `@mbti/shared`
  - [ ] 5.5 Fetch insight via `getCuratedInsight(db, mbtiType)`; if null use fallback: `FALLBACK_INSIGHT` const (see Dev Notes — Fallback)
  - [ ] 5.6 Return `c.json({ data: { personaName, insight: row.content, villains }, error: null })`
  - [ ] 5.7 Import `withDb` from `../lib/db` — never call `c.env.DB` directly

- [ ] Task 6 — Mount insights route in `apps/api/src/index.ts` (AC: 1)
  - [ ] 6.1 Import `insights` from `./routes/insights`
  - [ ] 6.2 Add `app.route('/api/results', insights)` after the `tests` route line

- [ ] Task 7 — Create `apps/web/src/features/result/components/InsightCard.tsx` (AC: 5, 6)
  - [ ] 7.1 Props: `insight: string`
  - [ ] 7.2 Framer Motion Beat 2 (800ms delay, 400ms `y: 16 → 0` + `opacity: 0 → 1`): wrap content in `<motion.div>`
  - [ ] 7.3 Text: `<p className="text-[16px] leading-relaxed text-slate-300 text-center max-w-xs">` with insight string
  - [ ] 7.4 `prefers-reduced-motion`: `const rm = useReducedMotion() ?? false` — when `rm=true` skip y-animation and set initial opacity to 1

- [ ] Task 8 — Create `apps/web/src/features/result/components/VillainsSection.tsx` (AC: 6)
  - [ ] 8.1 Props: `villains: Array<{ type: MBTIType; reason: string }>`
  - [ ] 8.2 Framer Motion: enter at 2200ms delay (after scroll chevron), 300ms fade-in
  - [ ] 8.3 Heading: `<h2 className="text-[13px] uppercase tracking-[0.2em] text-slate-500 mb-4">3 kiểu người dễ mâu thuẫn với bạn</h2>`
  - [ ] 8.4 Three villain chips: `<div className="flex flex-col gap-3">` — each chip: type code in `text-type-{villain.type}` + reason text below in `text-slate-400 text-[14px]`
  - [ ] 8.5 Tailwind JIT: chip text uses `text-type-{type}` — already safelisted in `PersonaReveal.tsx` comments (DO NOT duplicate the safelist block; it's global)
  - [ ] 8.6 `prefers-reduced-motion`: skip fade animation, render immediately

- [ ] Task 9 — Update `apps/web/src/features/result/components/PersonaReveal.tsx` (AC: 5)
  - [ ] 9.1 Add props: `insight: string`, `villains: Array<{ type: MBTIType; reason: string }>`
  - [ ] 9.2 Render `<InsightCard insight={insight} />` between the HR divider and the type code — Beat 2 at 800ms delay handles its own animation internally
  - [ ] 9.3 Render `<VillainsSection villains={villains} />` below the scroll chevron in the scrollable area — wrap the bottom section in a `<div className="mt-16 w-full max-w-sm">` after the centered reveal block
  - [ ] 9.4 Do NOT change Beat 1 (persona name, 0ms), Beat 3 (type code, 1400ms), or chevron (2000ms) timing — only add Beat 2 inside the existing flow

- [ ] Task 10 — Update `apps/web/src/features/result/components/ResultPage.tsx` (AC: 1, 5, 6)
  - [ ] 10.1 Add second TanStack Query for insight: `queryKey: queryKeys.resultInsight(resultId!)`, `queryFn: () => apiCall<ResultInsightApiResponse>('/api/results/${resultId}/insight')`, `staleTime: Infinity`, `enabled: !!resultId`
  - [ ] 10.2 Add local type `ResultInsightApiResponse` with shape `{ data: { personaName: string; insight: string; villains: Array<{ type: MBTIType; reason: string }> } | null; error: ... | null }`
  - [ ] 10.3 Loading state: wait for BOTH queries to resolve before rendering; show full-screen `bg-[#0D0F1A]` while either is loading
  - [ ] 10.4 Pass `insight` and `villains` to `<PersonaReveal>`: `<PersonaReveal personaName={...} mbtiType={...} insight={insightData.insight} villains={insightData.villains} />`
  - [ ] 10.5 Use the `personaName` from the insight API response (authoritative) over the one from the test result response — they are the same value but the insight endpoint is the canonical source for this screen

- [ ] Task 11 — Write tests for `GET /api/results/:resultId/insight` in `apps/api/tests/routes/insights.test.ts` (AC: 1, 4)
  - [ ] 11.1 Valid resultId → 200 with `{ data: { personaName, insight, villains }, error: null }` — all fields present and non-empty
  - [ ] 11.2 Unknown resultId → 404 `NOT_FOUND` envelope
  - [ ] 11.3 No session token → still 200 (public route)
  - [ ] 11.4 Mock `getCuratedInsight` returning null → response uses fallback string (not 500)
  - [ ] 11.5 `villains` array length === 3 for all valid responses

---

## Dev Notes

### Architecture Compliance Guardrails

These are non-negotiable rules carried from Stories 1.x–2.x. Violating any causes immediate review failure.

1. **D1 boundary**: Use `withDb(c)` — never `c.env.DB` directly in a route handler
2. **KV boundary**: Not applicable to this story (public endpoint, no session required)
3. **Response envelope**: Always `{ data: {...}, error: null }` or `{ data: null, error: { code, message } }`
4. **No PLACEHOLDER_REASON after Task 1**: Zero remaining references to `PLACEHOLDER_REASON` in the codebase after Task 1.3
5. **Explicit snake→camel rename**: `calculated_type` → `mbtiType` (already done in `getTestResult`); do NOT re-derive mbtiType in the insight route — read it from `getTestResult`
6. **Public route**: `GET /api/results/:resultId/insight` must NOT have `requireSession` — result pages are shareable without login (same pattern as `GET /api/tests/:resultId`)
7. **Tailwind JIT safelist**: `text-type-{type}` classes in `VillainsSection` already covered by the 48-class safelist comment block in `PersonaReveal.tsx` — do NOT add a duplicate safelist block in `VillainsSection.tsx`
8. **`useReducedMotion() ?? false`** — coerce null to boolean as established in Stories 2.4–2.5; this pattern is project-wide
9. **`safeCapture`**: PostHog event `insight_viewed` — fire from `ResultPage.tsx` inside a `useEffect` on insight data load: `safeCapture('insight_viewed', { resultId, mbtiType })`

### Files Being Modified — What Exists Today

| File | Status | What exists / what to preserve |
|---|---|---|
| `packages/shared/src/constants.ts` | UPDATE | 16 PERSONA_NAMES with English names + TODO; 48 PLACEHOLDER_REASON entries; runtime invariant loop at bottom (lines 119–132) — DO NOT touch the invariant loop |
| `packages/shared/src/schemas/insight.ts` | UPDATE | `InsightResponseSchema` (mbtiType, content, source) — owned by Story 3.2 AI endpoint; only ADD new schemas below it |
| `packages/shared/src/queryKeys.ts` | UPDATE | 5 existing keys; add `resultInsight` below existing entries |
| `packages/shared/src/db/rows.ts` | READ-ONLY | `CuratedInsightRow` interface exists; `getActiveCuratedInsights` returns all rows for type; do not change row interface |
| `apps/api/src/lib/db.ts` | UPDATE | `getActiveCuratedInsights` (multi-row, Story 3.2) exists; add `getCuratedInsight` (single row) |
| `apps/api/src/index.ts` | UPDATE | Mounts sessions, tests, ssr; add `insights` route at `/api/results` |
| `apps/web/src/features/result/components/ResultPage.tsx` | UPDATE | Already has one query for test result; add second query for insight; both must resolve before render |
| `apps/web/src/features/result/components/PersonaReveal.tsx` | UPDATE | Beat 1 (0ms), HR (1200ms), Beat 3 type code (1400ms), chevron (2000ms) — add Beat 2 (insight, 800ms) and villains section below; do NOT change existing beat timing |
| `migrations/0002_curated_insights_seed.sql` | READ-ONLY | 16 placeholder rows with `INSERT OR IGNORE` — do NOT edit this file; create a new migration 0006 to UPDATE content |

### New Files to Create

| File | Purpose |
|---|---|
| `migrations/0006_curated_insights_content.sql` | UPDATE 16 placeholder rows with production copy |
| `apps/api/src/routes/insights.ts` | `GET /:resultId/insight` — combined insight endpoint |
| `apps/web/src/features/result/components/InsightCard.tsx` | Beat 2 behavioral insight display |
| `apps/web/src/features/result/components/VillainsSection.tsx` | 3 villain chips below insight |
| `apps/api/tests/routes/insights.test.ts` | Route tests for insight endpoint |

### Schema — New Additions to `packages/shared/src/schemas/insight.ts`

Add below the existing `InsightResponseSchema`:

```typescript
export const VillainEntrySchema = z.object({
  type: MBTITypeSchema,
  reason: z.string().min(1),
});

export type VillainEntry = z.infer<typeof VillainEntrySchema>;

export const ResultInsightResponseSchema = z.object({
  personaName: z.string().min(1),
  insight: z.string().min(1),
  villains: z.array(VillainEntrySchema).length(3),
});

export type ResultInsightResponse = z.infer<typeof ResultInsightResponseSchema>;
```

Note: `VillainEntry` type is currently declared in `constants.ts` (`export type VillainEntry`). The schema version here is the Zod-parsed shape used at the API boundary. They are compatible — the schema is authoritative for API responses; the constants type is authoritative for the in-memory constants. Both can coexist.

### DB Helper — `getCuratedInsight`

```typescript
export async function getCuratedInsight(
  db: D1Database,
  mbtiType: MBTIType,
): Promise<CuratedInsightRow | null> {
  const result = await db
    .prepare(
      `SELECT id, mbti_type, variant, content, is_active, created_at, updated_at
       FROM curated_insights
       WHERE mbti_type = ? AND is_active = 1
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind(mbtiType)
    .all<CuratedInsightRow>();
  if (!result.success) {
    throw new Error(`getCuratedInsight: D1 query failed: ${result.error ?? 'unknown error'}`);
  }
  return result.results[0] ?? null;
}
```

### Fallback Insight Constant

In `apps/api/src/routes/insights.ts`, define a module-level fallback (not exported):

```typescript
const FALLBACK_INSIGHT =
  'Bạn có cách nhìn độc đáo về thế giới — và cách bạn xử lý mọi thứ thường khác với những người xung quanh.';
```

Used only when `getCuratedInsight` returns null. This prevents a 500 when the DB is empty or a type row is missing.

### Route Handler Pattern — `apps/api/src/routes/insights.ts`

```typescript
import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/bindings';
import { withDb, getTestResult, getCuratedInsight } from '../lib/db';
import { PERSONA_NAMES, VILLAINS_MAP } from '@mbti/shared';

const FALLBACK_INSIGHT =
  'Bạn có cách nhìn độc đáo về thế giới — và cách bạn xử lý mọi thứ thường khác với những người xung quanh.';

const insights = new Hono<{ Bindings: Bindings; Variables: Variables }>();

insights.get('/:resultId/insight', async (c) => {
  const db = withDb(c);
  const resultId = c.req.param('resultId');
  const row = await getTestResult(db, resultId);
  if (!row) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } }, 404);
  }
  const mbtiType = row.calculated_type;
  const insightRow = await getCuratedInsight(db, mbtiType);
  return c.json({
    data: {
      personaName: PERSONA_NAMES[mbtiType],
      insight: insightRow?.content ?? FALLBACK_INSIGHT,
      villains: VILLAINS_MAP[mbtiType],
    },
    error: null,
  });
});

export default insights;
```

### Test Mock Pattern

Follow the established factory pattern from `apps/api/tests/routes/tests.test.ts`:

```typescript
import { vi } from 'vitest';
import * as db from '../../../src/lib/db';

// Before each test:
vi.spyOn(db, 'getTestResult').mockResolvedValue(makeTestResultRow({ calculated_type: 'INFP' }));
vi.spyOn(db, 'getCuratedInsight').mockResolvedValue(makeCuratedInsightRow({ mbti_type: 'INFP' }));

function makeTestResultRow(overrides = {}) {
  return {
    id: 'test-result-id',
    user_id: 'user-id',
    calculated_type: 'INFP',
    declared_type: null,
    answers: '[]',
    persona_name: 'The Hidden Compass',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    deleted_at: null,
    retention_flag: null,
    ...overrides,
  };
}

function makeCuratedInsightRow(overrides = {}) {
  return {
    id: 'insight-id',
    mbti_type: 'INFP',
    variant: 'v1',
    content: 'Test insight content.',
    is_active: 1,
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    ...overrides,
  };
}
```

### Learnings from Story 2.5 (Carry Forward)

1. **`useReducedMotion() ?? false`** — coerce null; do NOT use `const rm = useReducedMotion()` directly as boolean
2. **`hasFired.current` guard** — not needed here (insight is a read query, not a mutation)
3. **`staleTime: Infinity`** for result queries — same for insight query; result pages are immutable
4. **`navigate(..., { replace: true })`** — not applicable here (no navigation after insight load)
5. **Two parallel TanStack queries** — `useQuery` can be called twice in the same component; both have `enabled: !!resultId`; show loading until BOTH `isLoading === false`
6. **`VillainsSection` chip `text-type-{type}` classes** — Tailwind JIT already covered by the safelist in `PersonaReveal.tsx`; do NOT add another safelist comment block in VillainsSection
7. **Explicit field rename in response builder** — `row.calculated_type` → `mbtiType` already handled by `getTestResult`; insight route reads `row.calculated_type` directly (no rename needed in insight route)

### Deferred from This Story (out of scope)

- `ReverseReveal` component (declared vs actual type comparison) — Story 3.3
- AI-enhanced insight with Anthropic Claude API — Story 3.2 (uses the `getActiveCuratedInsights` multi-row helper + `InsightResponseSchema`)
- `ShareCard` / `ShareActions` generation — Story 3.4
- OG image generation (`/api/og/:resultId`) — Story 3.4
- PostHog server-side event from insight endpoint — client-side only for now

---

## Curated Copy

### PERSONA_NAMES (replace all 16 values in `constants.ts`)

```typescript
export const PERSONA_NAMES: Readonly<Record<MBTIType, string>> = {
  INTJ: 'The Quiet Architect',
  INTP: 'The Lone Theorist',
  ENTJ: 'The Iron Vision',
  ENTP: "The Devil's Advocate",
  INFJ: 'The Silent Oracle',
  INFP: 'The Hidden Compass',
  ENFJ: 'The Invisible Conductor',
  ENFP: 'The Boundless Spark',
  ISTJ: 'The Steady Keeper',
  ISFJ: 'The Memory Holder',
  ESTJ: 'The Framework Builder',
  ESFJ: 'The Warm Anchor',
  ISTP: 'The Quiet Mechanic',
  ISFP: 'The Still Water',
  ESTP: 'The Living Edge',
  ESFP: 'The Living Flame',
};
```

### VILLAINS_MAP — Replace All 48 `PLACEHOLDER_REASON` Values

```typescript
export const VILLAINS_MAP: Readonly<Record<MBTIType, ReadonlyArray<VillainEntry>>> = {
  INTJ: [
    { type: 'ESFP', reason: 'Nhu cầu bộc phát của họ phá vỡ hệ thống dài hạn của bạn trước khi nó có cơ hội hoạt động.' },
    { type: 'ENFP', reason: 'Họ tạo ra sự hứng khởi cho mọi ý tưởng nhưng khó theo đuổi đến cùng — bạn thấy đó là tiềm năng bị lãng phí.' },
    { type: 'ESFJ', reason: 'Họ đề cao sự hòa thuận và truyền thống theo những cách làm chậm lại những thay đổi cơ cấu mà bạn cho là hiển nhiên.' },
  ],
  INTP: [
    { type: 'ESFJ', reason: 'Họ ưu tiên cảm xúc nhóm hơn phân tích logic — khiến việc giải quyết vấn đề cùng nhau trở thành một cuộc đàm phán mà bạn không đăng ký tham gia.' },
    { type: 'ESTJ', reason: 'Sự chắc chắn về các quy trình đã có sẵn khiến họ dễ kháng cự những cách tiếp cận lý thuyết chưa được thử nghiệm.' },
    { type: 'ENFJ', reason: 'Họ đọc được các động lực giữa người với người mà bạn chưa nắm bắt — và đôi khi dùng điều đó để định hướng cuộc trò chuyện theo cách không minh bạch với bạn.' },
  ],
  ENTJ: [
    { type: 'ISFP', reason: 'Nhịp độ và nhu cầu tự chủ của họ trông như sự kháng cự khi bạn đang cố kéo cả nhóm tiến lên nhanh.' },
    { type: 'INFP', reason: 'Họ có những giá trị cốt lõi thường xung đột với sự cần thiết về mặt chiến lược — và không chịu nhượng bộ theo cách bạn cho là thực dụng.' },
    { type: 'ESFP', reason: 'Họ mang lại năng lượng nhưng không mang lại cấu trúc — điều có thể phá vỡ một kế hoạch đúng lúc cần kỷ luật thực thi.' },
  ],
  ENTP: [
    { type: 'ISFJ', reason: 'Sự trung thành với các quy trình đã thiết lập của họ trở thành rào cản khi bạn đang cố thử xem liệu những quy trình đó có thực sự là tốt nhất không.' },
    { type: 'ISTJ', reason: 'Họ muốn làm đúng như cách đã được chứng minh. Bạn muốn biết liệu cách đó có thực sự là tốt nhất không. Điều này hiếm khi kết thúc nhanh.' },
    { type: 'ESFJ', reason: 'Họ không thoải mái với kiểu thách thức trực tiếp mà bạn dùng để kiểm tra ý tưởng — khiến tranh luận hiệu quả trở nên rủi ro khi có mặt họ.' },
  ],
  INFJ: [
    { type: 'ESTP', reason: 'Họ hành động nhanh dựa trên dữ liệu nhìn thấy được — điều này bỏ qua các kiểu mẫu sâu hơn mà bạn đang theo dõi, khiến bạn cảm thấy cuộc trò chuyện diễn ra ở tầng quá nông.' },
    { type: 'ESTJ', reason: 'Trọng tâm vào cấu trúc đã có thể bác bỏ những lo ngại về tầm nhìn dài hạn trước khi chúng được xem xét đầy đủ.' },
    { type: 'ENTP', reason: 'Họ tranh luận về mọi thứ, kể cả những điều đối với bạn đã được giải quyết — điều này có thể khơi lại những vết thương mà bạn đã sẵn sàng buông bỏ.' },
  ],
  INFP: [
    { type: 'ESTJ', reason: 'Sự ưu tiên hệ thống khách quan hơn giá trị cá nhân khiến bạn cảm thấy vô hình trong các cấu trúc họ thiết kế.' },
    { type: 'ENTJ', reason: 'Cách tiếp cận đặt hiệu quả lên hàng đầu của họ có thể xem giá trị của bạn là những điểm kém hiệu quả cần được tối ưu hóa.' },
    { type: 'ESTP', reason: 'Họ hành động trước, suy nghĩ sau — điều này có thể đưa những việc quan trọng vào chuyển động trước khi các hàm ý đạo đức được cân nhắc.' },
  ],
  ENFJ: [
    { type: 'ISTP', reason: 'Sự ưu tiên sự độc lập và giao tiếp tối thiểu của họ trông như sự từ chối kết nối mà bạn đang cố xây dựng.' },
    { type: 'INTP', reason: 'Họ đánh giá trí tuệ cảm xúc của bạn qua bộ lọc logic — điều này khiến bạn cảm thấy công cụ tốt nhất của mình đang bị bác bỏ.' },
    { type: 'ESTP', reason: 'Họ di chuyển qua con người và tình huống theo tốc độ không để lại chỗ cho mối quan hệ sâu hơn mà bạn đang cố tạo dựng.' },
  ],
  ENFP: [
    { type: 'ISTJ', reason: 'Sự gắn bó với các phương pháp đã được chứng minh trở thành trần giới hạn những gì có thể, khi bạn tin chắc có một cách tốt hơn.' },
    { type: 'ISFJ', reason: 'Sự thận trọng và ưa thích các chuẩn mực đã thiết lập khiến năng lượng của bạn trở nên quá mức hoặc gây bất ổn — và ngược lại.' },
    { type: 'INTJ', reason: 'Họ coi sự hứng khởi của bạn là tiếng ồn cho đến khi bạn chứng minh được ý tưởng hoạt động — điều này khiến sự hợp tác cảm thấy như một cuộc thử nghiệm liên tục.' },
  ],
  ISTJ: [
    { type: 'ENFP', reason: 'Những thay đổi đột ngột trong kế hoạch đã thỏa thuận của họ làm xáo trộn cấu trúc đáng tin cậy mà bạn đã mất thời gian xây dựng.' },
    { type: 'ENTP', reason: 'Họ sẽ tranh luận về ưu điểm của một kế hoạch mà bạn đã cam kết thực hiện — điều này tạo ra sự ma sát không cần thiết khi việc thực thi đã bắt đầu.' },
    { type: 'INFP', reason: 'Những quyết định dựa trên giá trị cá nhân thay vì các quy trình đã thiết lập có thể làm cho việc phối hợp nhóm trở nên khó khăn hơn.' },
  ],
  ISFJ: [
    { type: 'ENTP', reason: 'Sự liên tục đặt câu hỏi về các hệ thống mà bạn đã tin tưởng trở thành sự bất ổn mang danh đổi mới.' },
    { type: 'ESTP', reason: 'Mức độ chấp nhận rủi ro của họ vượt quá những gì cảm thấy an toàn với bạn — và đôi khi họ kéo người khác về phía rủi ro đó trước khi mọi người sẵn sàng.' },
    { type: 'ENTJ', reason: 'Tốc độ và sự chắc chắn của họ có thể áp đảo cách tiếp cận cẩn thận, đặt mối quan hệ lên hàng đầu — điều giúp bạn làm việc hiệu quả.' },
  ],
  ESTJ: [
    { type: 'INFP', reason: 'Những quyết định bắt nguồn từ giá trị cá nhân hơn dữ liệu khách quan có thể gây khó khăn cho sự hợp tác có cấu trúc.' },
    { type: 'ENFP', reason: 'Sự hứng khởi về những hướng đi mới có thể làm gián đoạn các quy trình đáng tin cậy giúp mọi thứ vận hành trơn tru.' },
    { type: 'INTP', reason: 'Cách tiếp cận lý thuyết của họ hiếm khi chuyển thành các bước hành động cụ thể trong khung thời gian bạn đang làm việc.' },
  ],
  ESFJ: [
    { type: 'INTP', reason: 'Sự phân tích logic của họ có thể tỏ ra coi thường các động lực giữa con người mà bạn đang quản lý cẩn thận.' },
    { type: 'INTJ', reason: 'Sự ưu tiên hiệu quả hơn sự hòa thuận có thể làm tổn hại các mối quan hệ mà bạn đã dành thời gian duy trì.' },
    { type: 'ENTP', reason: 'Thói quen thách thức những gì đang hoạt động tốt của họ có thể gieo mầm nghi ngờ ở nơi bạn đã xây dựng được niềm tin.' },
  ],
  ISTP: [
    { type: 'ENFJ', reason: 'Nhu cầu có sự đồng thuận cảm xúc trong mọi tương tác của họ tạo ra áp lực thể hiện những cảm xúc mà bạn đơn giản là không có.' },
    { type: 'ESFJ', reason: 'Họ đọc sự im lặng độc lập của bạn là khoảng cách hoặc không tán thành — và phản ứng theo những cách tạo ra sự khó chịu mà chính họ đang cố tránh.' },
    { type: 'ENFP', reason: 'Cường độ cảm xúc và nhu cầu nhiệt tình chung của họ trở thành một cam kết mà bạn không thể thực sự thực hiện.' },
  ],
  ISFP: [
    { type: 'ENTJ', reason: 'Tốc độ và sự thẳng thắn của họ có thể lướt qua những điều bạn cần thời gian để xử lý.' },
    { type: 'ESTJ', reason: 'Sự tự tin vào hệ thống và quy tắc của họ có thể bác bỏ những sắc thái cá nhân quan trọng nhất với bạn.' },
    { type: 'INTJ', reason: 'Sự chắc chắn về câu trả lời đúng đắn của họ có thể đóng cửa sự khám phá mà bạn cần để tự tìm ra con đường của mình.' },
  ],
  ESTP: [
    { type: 'INFJ', reason: 'Những lo ngại trực giác về hướng đi của một việc gì đó trở thành lực kéo phanh đúng lúc bạn đang bắt đà.' },
    { type: 'INFP', reason: 'Nhu cầu căn chỉnh hành động với giá trị của họ có thể làm chậm những quyết định trông rõ ràng với bạn.' },
    { type: 'INTJ', reason: 'Tư duy dài hạn của họ có thể trở thành sự kỹ lưỡng thái quá với người ưa thích thích nghi khi mọi thứ diễn ra.' },
  ],
  ESFP: [
    { type: 'INTJ', reason: 'Thế giới nội tâm của họ đã được trang bị đầy đủ — và họ không luôn tìm kiếm bạn đồng hành trong đó. Điều đó có thể cảm thấy như sự loại trừ.' },
    { type: 'INTP', reason: 'Sự ưu tiên phân tích hơn trải nghiệm chung của họ khiến sự kết nối trở nên như một công việc.' },
    { type: 'INFJ', reason: 'Sự hiện diện có chọn lọc và cường độ âm thầm của họ trở thành một cánh cửa gần như — nhưng không hoàn toàn — mở.' },
  ],
};
```

### Curated Insight Content — `migrations/0006_curated_insights_content.sql`

Full UPDATE statements for migration file:

```sql
-- Story 3.1 / Migration 0006_curated_insights_content
-- Purpose: Replace placeholder curated insight text with production copy.
-- All rows were seeded in 0002_curated_insights_seed.sql.

UPDATE curated_insights SET content = 'Bạn thường đã hiểu toàn bộ hệ thống trước khi hầu hết mọi người thậm chí đặt tên được vấn đề — nhưng bạn giữ im lặng vì việc giải thích cảm thấy chậm hơn là tự làm.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INTJ-v1';

UPDATE curated_insights SET content = 'Bạn có thể theo đuổi hầu hết ý tưởng đến kết luận logic của nó — nhưng đôi khi bạn bị mắc kẹt ở đó, không phải vì công việc khó, mà vì một hướng đi hấp dẫn tiếp theo xuất hiện trước khi cái này xong.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INTP-v1';

UPDATE curated_insights SET content = 'Bạn không chỉ muốn lãnh đạo — bạn cần đội nhóm sắc bén như bạn. Khi ai đó không đạt được, bạn không tức giận; bạn lặng lẽ ngừng dựa vào họ.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENTJ-v1';

UPDATE curated_insights SET content = 'Bạn thích một cuộc tranh luận hay không phải để thắng, mà để tìm ra lỗ hổng trong lập luận của chính mình trước khi người khác làm. Điều khó nhất là biết khi nào nên dừng lại.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENTP-v1';

UPDATE curated_insights SET content = 'Bạn thường cảm nhận được kết quả trước khi ai nói lên xung đột — và bạn mang điều đó trong im lặng, chờ đợi thời điểm thích hợp để lên tiếng. Đôi khi thời điểm đó không đến.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INFJ-v1';

UPDATE curated_insights SET content = 'Bạn có một la bàn nội tâm rất rõ ràng ít khi phù hợp với bản đồ mà mọi người khác đang dùng. Bạn sống với khoảng cách đó, nhưng nó tiêu tốn nhiều năng lượng hơn bạn thừa nhận.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INFP-v1';

UPDATE curated_insights SET content = 'Bạn đã học cách đọc những gì mọi người cần trước khi họ nói ra. Vấn đề là bạn quá giỏi điều này đến mức mọi người quên mất rằng bạn cũng có nhu cầu — và đôi khi chính bạn cũng quên.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENFJ-v1';

UPDATE curated_insights SET content = 'Bạn mang lại năng lượng thay đổi nhiệt độ của một căn phòng. Thử thách là bạn cảm nhận mọi thứ ở âm lượng đầy đủ — sự hứng khởi, nhưng cũng cả sự thất vọng khi mọi thứ không đạt đến tầm nhìn.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENFP-v1';

UPDATE curated_insights SET content = 'Bạn đã làm những điều đáng tin cậy nhiều lần đến mức mọi người đã ngừng nhận ra — điều đó ổn với bạn. Bạn không cần được công nhận. Điều bạn cần là mọi thứ được làm đúng.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISTJ-v1';

UPDATE curated_insights SET content = 'Bạn nhớ đúng điều gì đó ai đó nhắc đến thoáng qua sáu tháng trước và bạn đã lặng lẽ giữ lấy nó, chờ đợi để làm điều gì đó tử tế với nó. Hầu hết mọi người không biết bạn mang tất cả điều này.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISFJ-v1';

UPDATE curated_insights SET content = 'Bạn là người lên kế hoạch, chủ trì cuộc họp, và theo dõi vào ngày hôm sau. Điều bạn vẫn đang học là không phải ai cũng xử lý thông tin theo tốc độ của bạn — và đó không phải là sự lười biếng.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESTJ-v1';

UPDATE curated_insights SET content = 'Bạn thực sự muốn mọi người đều ổn, và bạn đã trở nên rất giỏi trong việc làm cho điều đó xảy ra. Chi phí là bạn đã học cách đặt sự không thoải mái của chính mình vào một nơi ngoài tầm nhìn.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESFJ-v1';

UPDATE curated_insights SET content = 'Bạn giải quyết vấn đề với chuyển động tối thiểu và độ chính xác tối đa. Bạn hiếm khi giải thích lý luận của mình cho đến khi xong, điều này có thể làm người khác bất an vì họ nhầm sự im lặng với sự thụ động.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISTP-v1';

UPDATE curated_insights SET content = 'Bạn cảm nhận mọi thứ sâu sắc nhưng thể hiện có chọn lọc. Hầu hết mọi người thấy bề mặt bình lặng và nhầm đó là sự xa cách — họ không thấy thế giới đầy đủ bạn đang quan sát bên dưới.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISFP-v1';

UPDATE curated_insights SET content = 'Bạn ở trạng thái tốt nhất khi tình huống cấp bách và lộn xộn. Bạn đọc được bầu không khí nhanh hơn hầu hết mọi người đọc tóm tắt — và bạn đã đang di chuyển trước khi cuộc họp kết thúc.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESTP-v1';

UPDATE curated_insights SET content = 'Bạn mang lại sự ấm áp cho mọi tương tác mà không có ý định — đó không phải là màn trình diễn, đó chỉ là cách bạn vốn vậy. Thử thách là không phải ai cũng biết cách nắm giữ loại năng lượng đó với sự trân trọng.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESFP-v1';
```

---

## UX Requirements (from ux-design-specification.md)

- **UX-DR1**: Result page background `#0D0F1A` (already in PersonaReveal)
- **UX-DR7**: Beat 2 is `800ms delay, 400ms slide-up + fade` — `y: 16 → 0`, `opacity: 0 → 1`
- **UX-DR14**: Villain chip text must meet 4.5:1 contrast; `text-type-{type}` classes use the type palette from Tailwind config
- **UX-DR15**: All animations collapse to instant when `useReducedMotion() === true`
- **Beat order in PersonaReveal (preserved exactly)**:
  - Beat 1: 0ms delay, 600ms fade-in — persona name (`motion.h1`)
  - HR: 1200ms delay, 300ms fade-in
  - Beat 2: 800ms delay, 400ms slide-up+fade — **InsightCard** (rendered between HR and type code)
  - Beat 3: 1400ms delay, 300ms fade-in — type code
  - Beat 4: 2000ms delay — chevron pulses
  - VillainsSection: 2200ms delay, 300ms fade-in — below the centered reveal block in the scroll area

Note: The VillainsSection is in the scrollable area BELOW the full-screen reveal block. PersonaReveal must become a scrollable page (`overflow-y: auto` or natural document flow) after the centered reveal. The villains are revealed by scroll, not part of the centered animation block.

## References

- `packages/shared/src/constants.ts` — PERSONA_NAMES, VILLAINS_MAP, runtime invariant loop
- `packages/shared/src/db/rows.ts` — CuratedInsightRow
- `packages/shared/src/schemas/insight.ts` — InsightResponseSchema (existing, owned by Story 3.2)
- `apps/api/src/lib/db.ts` — getActiveCuratedInsights (multi-row, Story 3.2), withDb, getTestResult
- `migrations/0001_initial_schema.sql` — curated_insights table DDL
- `migrations/0002_curated_insights_seed.sql` — 16 placeholder rows with IDs
- `_bmad-output/implementation-artifacts/2-5-test-submission-mbti-type-calculation-and-shareable-result-url.md` — PersonaReveal and ResultPage patterns
- `_bmad-output/planning-artifacts/architecture.md` — AI fallback pattern, API endpoints table
- `_bmad-output/planning-artifacts/ux-design-specification.md` — UX-DR7, UX-DR15, Beat timing
