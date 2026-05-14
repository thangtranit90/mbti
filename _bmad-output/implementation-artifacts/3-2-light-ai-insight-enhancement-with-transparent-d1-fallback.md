# Story 3.2: Light AI Insight Enhancement with Transparent D1 Fallback

Status: done

## Story

As a user viewing my result,
I want the behavioral insight to feel specific to my actual responses — not just my type label,
so that the "uncomfortably accurate" delight moment is achieved, while the platform degrades gracefully if AI is unavailable.

## Acceptance Criteria

**AC1:** Given `POST /api/insights/generate` is called with `{ resultId }`
When the Anthropic Claude API (`claude-sonnet-4-6`) responds within 2500ms
Then the response is `{ data: { content: string, source: 'ai' }, error: null }` with HTTP 200; the insight content references behavioral patterns specific to the user's answers (not generic type descriptions)

**AC2:** Given the Anthropic API call exceeds 2500ms or throws any error
When the `Promise.race` timeout fires in `apps/api/src/lib/ai.ts`
Then the system falls back immediately to `getCuratedInsight(db, mbtiType)` from D1 and returns `{ data: { content: string, source: 'curated' }, error: null }` — no user-visible failure, same HTTP 200 (NFR17)

**AC3:** Given the insight is served with `source: 'ai'`
When the result page renders the insight section
Then a shadcn `Badge` with `variant="outline"` and text `"AI-generated for self-reflection"` appears below the insight text in `InsightCard`; badge uses `text-[11px] text-slate-500` — subtle, not prominent

**AC4:** Given the insight is served with `source: 'curated'`
When the result page renders
Then NO badge appears — `source === 'curated'` is silent, indistinguishable from user's perspective

**AC5:** Given either path (AI or curated)
When the full flow completes (test submission → result page → insight loaded)
Then total time from page load to insight rendered is ≤3 seconds (NFR3)
And PostHog captures `insight_served` server-side with `{ source: 'ai' | 'curated', mbtiType }` from the POST handler

**AC6:** Given `POST /api/insights/generate` is called with an unknown `resultId`
When processed
Then response is `{ data: null, error: { code: 'NOT_FOUND', message: '...' } }` with HTTP 404

**AC7:** Given the AI endpoint call completes (any source)
When `ResultPage` receives the response
Then `ResultPage` passes `insight`, `villains`, and `source` to `PersonaReveal`; `PersonaReveal` passes `insight` and `source` to `InsightCard`; `InsightCard` conditionally renders the badge

## Tasks / Subtasks

- [x] Task 1 — Add `GenerateInsightRequestSchema` to `packages/shared/src/schemas/insight.ts` (AC: 1)
  - [x] 1.1 Add below existing `InsightResponseSchema`:
    ```typescript
    export const GenerateInsightRequestSchema = z.object({
      resultId: z.string().uuid(),
    });
    export type GenerateInsightRequest = z.infer<typeof GenerateInsightRequestSchema>;
    ```
  - [x] 1.2 Verify `packages/shared/src/index.ts` re-exports `./schemas/insight` — no change needed if already present

- [x] Task 2 — Create `apps/api/src/lib/ai.ts` (AC: 1, 2, 5)
  - [x] 2.1 Import `Anthropic` from `@anthropic-ai/sdk`; construct client lazily per request: `new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })`
  - [x] 2.2 Export `generateInsight(db, env, mbtiType, declaredType, answers, curatedVariants)` — see exact signature in Dev Notes
  - [x] 2.3 Implement `buildPrompt(mbtiType, declaredType, answers, curatedVariants)` — see prompt template in Dev Notes
  - [x] 2.4 Implement `Promise.race` with `AI_TIMEOUT_MS = 2500` — see pattern in Dev Notes
  - [x] 2.5 On AI success: return `{ content: aiText, source: 'ai' as const }`
  - [x] 2.6 On timeout or any error: call `getCuratedInsight(db, mbtiType)`; return `{ content: row?.content ?? FALLBACK_INSIGHT, source: 'curated' as const }`
  - [x] 2.7 `FALLBACK_INSIGHT` constant in `ai.ts` (module-level, not exported): same string as Story 3.1's fallback in `insights.ts` — keep them in sync

- [x] Task 3 — Add `POST /generate` handler to `apps/api/src/routes/insights.ts` (AC: 1, 2, 5, 6)
  - [x] 3.1 Add `insights.post('/generate', async (c) => { ... })` at bottom of file — Story 3.1 created `insights.get('/:resultId/insight', ...)` above it
  - [x] 3.2 Parse body: `GenerateInsightRequestSchema.parse(await c.req.json())` — Zod error handled by `app.onError` in `index.ts`
  - [x] 3.3 Fetch test result: `const row = await getTestResult(db, resultId)` — return 404 if null
  - [x] 3.4 Parse stored answers: `JSON.parse(row.answers)` into `Array<{ questionId: string; value: number }>`
  - [x] 3.5 Fetch curated variants: `const variants = await getActiveCuratedInsights(db, row.calculated_type)` (multi-row, for prompt context)
  - [x] 3.6 Call `generateInsight(db, c.env, row.calculated_type, row.declared_type, answers, variants)` from `lib/ai.ts`
  - [x] 3.7 Capture PostHog: `safeCapture('insight_served', { source, mbtiType: row.calculated_type })` — import from `lib/posthog` (check if posthog helper exists in `apps/api`; if not, use direct PostHog SDK call — see Dev Notes)
  - [x] 3.8 Return `c.json({ data: { content, source }, error: null })`
  - [x] 3.9 This route requires `requireSession` middleware — see Dev Notes for rationale

- [x] Task 4 — Mount insights at `/api/insights` in `apps/api/src/index.ts` (AC: 1)
  - [x] 4.1 Add `app.route('/api/insights', insights)` AFTER the existing `app.route('/api/results', insights)` line (Story 3.1 adds that line)
  - [x] 4.2 Both mountings use the same `insights` import — `POST /generate` becomes reachable at `/api/insights/generate`; `GET /:resultId/insight` also becomes reachable at `/api/insights/:resultId/insight` (harmless alias — clients always use `/api/results/:resultId/insight` for Story 3.1)

- [x] Task 5 — Update `apps/web/src/features/result/components/ResultPage.tsx` (AC: 1, 2, 7)
  - [x] 5.1 Add second TanStack Query: `queryKey: queryKeys.insightGenerate(resultId!)`, `queryFn: () => apiCall<InsightGenerateApiResponse>('/api/insights/generate', { method: 'POST', body: JSON.stringify({ resultId }) })`, `staleTime: Infinity`, `enabled: !!resultId && !!result` (wait for first query)
  - [x] 5.2 Add `queryKeys.insightGenerate` to `packages/shared/src/queryKeys.ts`: `insightGenerate: (resultId: string) => ['insightGenerate', resultId] as const`
  - [x] 5.3 Add local type `InsightGenerateApiResponse` — shape: `{ data: { content: string; source: 'ai' | 'curated' } | null; error: { code: string; message: string } | null }`
  - [x] 5.4 Show `ResultSkeleton` while EITHER query is loading (`isLoading || insightLoading`)
  - [x] 5.5 Pass `insight` and `source` to `PersonaReveal`: `<PersonaReveal ... insight={insightData.content} source={insightData.source} />`
  - [x] 5.6 If `insightData` is null/error, fall through to the curated insight from Story 3.1's insight (defensive: `insightData?.content ?? ''`)

- [x] Task 6 — Update `apps/web/src/features/result/components/PersonaReveal.tsx` (AC: 3, 4, 7)
  - [x] 6.1 Add `source: 'ai' | 'curated'` to `PersonaReveal` props
  - [x] 6.2 Pass `source` down to `InsightCard`: `<InsightCard insight={insight} source={source} />`

- [x] Task 7 — Update `apps/web/src/features/result/components/InsightCard.tsx` (AC: 3, 4)
  - [x] 7.1 Add `source: 'ai' | 'curated'` to `InsightCard` props
  - [x] 7.2 Import shadcn `Badge` from `@/components/ui/badge`
  - [x] 7.3 Below the insight `<p>` tag, conditionally render:
    ```tsx
    {source === 'ai' && (
      <Badge variant="outline" className="mt-3 text-[11px] text-slate-500 border-slate-700">
        AI-generated for self-reflection
      </Badge>
    )}
    ```
  - [x] 7.4 Ensure `prefers-reduced-motion` guard from Task 3.1 is NOT duplicated — badge has no animation; it's static

- [x] Task 8 — Write tests (AC: 1, 2)
  - [x] 8.1 Create `apps/api/src/tests/lib/ai.test.ts` — unit test `generateInsight`:
    - Happy path: Claude returns content within timeout → `source: 'ai'`
    - Timeout path: `Promise.race` fires after 2500ms → `source: 'curated'`
    - Error path: Claude throws → `source: 'curated'`
    - Mock Anthropic client with `vi.mock('@anthropic-ai/sdk')`
  - [x] 8.2 Create `apps/api/src/tests/routes/insights-generate.test.ts` — route tests for `POST /generate`:
    - Valid resultId → 200 `{ data: { content, source }, error: null }`
    - Unknown resultId → 404
    - No session token → 401 (route requires session)
    - Anthropic error → 200 with `source: 'curated'` (fallback — not 500)
    - Follow factory pattern from Story 3.1: `makeTestResultRow`, `makeCuratedInsightRow`

---

## Dev Notes

### Critical Prerequisite: Story 3.1 Must Be Complete

Story 3.2 modifies files created by Story 3.1:
- `apps/api/src/routes/insights.ts` — Story 3.1 creates this file; Story 3.2 adds `POST /generate` to it
- `apps/web/src/features/result/components/InsightCard.tsx` — Story 3.1 creates this; Story 3.2 adds the badge prop
- `apps/web/src/features/result/components/PersonaReveal.tsx` — Story 3.1 adds `insight`/`villains` props; Story 3.2 adds `source` prop
- `apps/api/src/index.ts` — Story 3.1 adds `app.route('/api/results', insights)`; Story 3.2 adds the second mounting

**Do not start Story 3.2 until `3-1-curated-insight-system-persona-names-and-villains` is `done` in sprint-status.yaml.**

### Architecture Compliance Guardrails

Non-negotiable — violating any causes immediate review failure:

1. **D1 boundary**: `withDb(c)` — never `c.env.DB` in route handler
2. **KV boundary**: Use `requireSession` on `POST /generate` — this is NOT a public route (AI costs money; requires authenticated session to prevent abuse)
3. **Response envelope**: `{ data: {...}, error: null }` success / `{ data: null, error: { code, message } }` error
4. **No raw `c.env` in lib**: `ai.ts` receives `env` (Workers bindings) as a parameter — never imports Hono context
5. **@anthropic-ai/sdk, NOT @anthropic-ai/node**: Cloudflare Workers uses the standard SDK; it uses Fetch API under the hood — no Node.js `http` module needed
6. **Promise.race, NOT setTimeout with callbacks**: Use the pattern in Dev Notes exactly
7. **getActiveCuratedInsights** (multi-row) for PROMPT CONTEXT; **getCuratedInsight** (single-row, Story 3.1) for FALLBACK — they are different helpers for different purposes

### `apps/api/src/lib/ai.ts` — Complete Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { MBTIType, CuratedInsightRow } from '@mbti/shared';
import type { Bindings } from '../types/bindings';
import { getCuratedInsight } from './db';

const AI_TIMEOUT_MS = 2500;
const FALLBACK_INSIGHT =
  'Bạn có cách nhìn độc đáo về thế giới — và cách bạn xử lý mọi thứ thường khác với những người xung quanh.';

function buildPrompt(
  mbtiType: MBTIType,
  declaredType: MBTIType | null,
  answers: Array<{ questionId: string; value: number }>,
  curatedVariants: CuratedInsightRow[],
): string {
  const exampleInsights = curatedVariants
    .slice(0, 2)
    .map((r) => `- ${r.content}`)
    .join('\n');

  const selfAwareness =
    declaredType && declaredType !== mbtiType
      ? `The user thought they were ${declaredType} but calculated as ${mbtiType}.`
      : declaredType === mbtiType
        ? `The user correctly predicted their type as ${mbtiType}.`
        : `The user did not declare a type.`;

  return `You are writing a behavioral personality insight in Vietnamese for someone who just completed an MBTI assessment.

Type: ${mbtiType}
${selfAwareness}
Answer pattern summary: ${answers.length} responses recorded (values 1–5 scale per question).

Write ONE sentence of behavioral insight in Vietnamese. Rules:
- Reference observable behavior, not type theory
- Avoid words: MBTI, introvert, extrovert, type, personality
- Tone: precise and slightly uncomfortable — the reader should think "how does it know?"
- Length: exactly 1 sentence, 20–40 words
- Language: Vietnamese only

Example style (do not copy, write something new):
${exampleInsights}

Respond with ONLY the single Vietnamese sentence. No preamble, no quotes, no explanation.`;
}

export async function generateInsight(
  db: D1Database,
  env: Bindings,
  mbtiType: MBTIType,
  declaredType: MBTIType | null,
  answers: Array<{ questionId: string; value: number }>,
  curatedVariants: CuratedInsightRow[],
): Promise<{ content: string; source: 'ai' | 'curated' }> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const prompt = buildPrompt(mbtiType, declaredType, answers, curatedVariants);

  const aiCall = anthropic.messages
    .create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })
    .then((msg) => {
      const block = msg.content[0];
      if (block.type !== 'text') throw new Error('Unexpected non-text response from Claude');
      return block.text.trim();
    });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS),
  );

  try {
    const content = await Promise.race([aiCall, timeout]);
    return { content, source: 'ai' };
  } catch {
    const fallback = await getCuratedInsight(db, mbtiType);
    return { content: fallback?.content ?? FALLBACK_INSIGHT, source: 'curated' };
  }
}
```

### `POST /generate` Handler — Route Addition to `insights.ts`

Add at the bottom of the existing `insights.ts` file (after Story 3.1's `GET /:resultId/insight` handler):

```typescript
// --- Story 3.2: AI Insight Generation ---
import { requireSession } from '../middleware/auth';
import { GenerateInsightRequestSchema } from '@mbti/shared';
import { generateInsight } from '../lib/ai';
import { getActiveCuratedInsights } from '../lib/db'; // already imported via withDb file

insights.post('/generate', requireSession, async (c) => {
  const db = withDb(c);
  const body = GenerateInsightRequestSchema.parse(await c.req.json());
  const row = await getTestResult(db, body.resultId);
  if (!row) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } }, 404);
  }
  const answers = JSON.parse(row.answers) as Array<{ questionId: string; value: number }>;
  const variants = await getActiveCuratedInsights(db, row.calculated_type);
  const { content, source } = await generateInsight(
    db,
    c.env,
    row.calculated_type,
    row.declared_type as MBTIType | null,
    answers,
    variants,
  );
  // PostHog server-side — see Dev Notes for posthog pattern in Workers
  return c.json({ data: { content, source }, error: null });
});
```

### Why `requireSession` on `POST /generate`

`GET /api/results/:resultId/insight` (Story 3.1) is public — result pages are shareable without login (FR16).
`POST /api/insights/generate` is NOT public — it calls Anthropic Claude which costs money. Requiring a valid KV session token prevents anonymous abuse. Result-sharing users (different browser, no session) use Story 3.1's public GET endpoint instead.

### PostHog in API Workers

Check if `apps/api/src/lib/posthog.ts` exists (Story 3.1 may create it). If NOT:
- Use PostHog Node.js SDK for server-side capture in Workers: `import { PostHog } from 'posthog-node'`
- Pattern: `new PostHog(c.env.POSTHOG_API_KEY).capture({ distinctId: userId, event: 'insight_served', properties: { source, mbtiType } })`
- Do NOT await it — fire-and-forget (Workers terminate after response)
- If PostHog key is not yet a Worker binding, skip the capture for now and add a TODO comment — do NOT throw or fail silently with a try-catch that swallows errors

### `index.ts` Second Mounting

After Story 3.1 adds `app.route('/api/results', insights)`, Story 3.2 adds:

```typescript
// Story 3.2: also mount at /api/insights for POST /generate
app.route('/api/insights', insights);
```

These two mountings share the same router instance. Hono handles them independently — `GET /api/results/:resultId/insight` and `POST /api/insights/generate` both resolve correctly.

### `ResultPage.tsx` — How the Two Queries Interact

After Story 3.1, `ResultPage` has TWO queries:
1. `queryKeys.testResult(resultId)` → `GET /api/tests/:resultId` (test result data + personaName)
2. `queryKeys.resultInsight(resultId)` → `GET /api/results/:resultId/insight` (curated insight, public)

After Story 3.2, the insight query CHANGES from GET to POST:
- REPLACE query #2 with: `queryKeys.insightGenerate(resultId)` → `POST /api/insights/generate` (AI or curated)
- Remove the `GET /api/results/:resultId/insight` call from `ResultPage` (Story 3.2 supersedes it for the primary user flow)
- The GET endpoint still exists and is used by any other consumers (e.g., shared link on different browser where no session exists — handled server-side via Story 3.1's fallback)

Wait — if `POST /generate` requires session token, then shared-link users (no session) cannot use it. Those users should fall back to the GET endpoint. Handle this in `ResultPage`:

```typescript
// ResultPage: try POST first (session users), fallback GET (no session)
const { data: insightRes } = useQuery({
  queryKey: queryKeys.insightGenerate(resultId!),
  queryFn: async () => {
    try {
      return await apiCall<InsightGenerateApiResponse>('/api/insights/generate', {
        method: 'POST',
        body: JSON.stringify({ resultId }),
      });
    } catch {
      // 401 = no session; fall back to public GET endpoint
      return apiCall<InsightGenerateApiResponse>(`/api/results/${resultId}/insight`);
    }
  },
  staleTime: Infinity,
  enabled: !!resultId && !!result,
});
```

Note: This fallback returns curated insight with no `source` field — normalize it: treat missing `source` as `'curated'`.

### AI Prompt Notes

- Claude model: **`claude-sonnet-4-6`** (NOT `claude-3-5-sonnet-20241022` or any other variant) — match exactly
- `max_tokens: 150` — one Vietnamese sentence is ~30–60 tokens; 150 is safe headroom
- Prompt is in English but output must be Vietnamese — Claude handles this correctly
- Do NOT use streaming — `anthropic.messages.create()` (not `.stream()`)
- Do NOT add prompt caching (`cache_control`) — this is a per-user personalized prompt, no cache benefit

### `queryKeys` Addition to `packages/shared`

In `packages/shared/src/queryKeys.ts`, add after existing entries:

```typescript
insightGenerate: (resultId: string) => ['insightGenerate', resultId] as const,
```

### File State After Story 3.1 (What Story 3.2 Will Find)

| File | Post-3.1 State | Story 3.2 Change |
|---|---|---|
| `apps/api/src/routes/insights.ts` | Has `GET /:resultId/insight` | ADD `POST /generate` at bottom |
| `apps/api/src/index.ts` | Has `app.route('/api/results', insights)` | ADD `app.route('/api/insights', insights)` |
| `apps/web/src/features/result/components/InsightCard.tsx` | Props: `insight: string` | ADD `source: 'ai' \| 'curated'` prop + badge |
| `apps/web/src/features/result/components/PersonaReveal.tsx` | Props: `insight: string`, `villains: [...]` | ADD `source: 'ai' \| 'curated'` prop |
| `apps/web/src/features/result/components/ResultPage.tsx` | Has 2 queries (testResult + resultInsight GET) | REPLACE insight query with POST `insightGenerate` |
| `packages/shared/src/schemas/insight.ts` | Has `InsightResponseSchema` | ADD `GenerateInsightRequestSchema` |
| `packages/shared/src/queryKeys.ts` | Has `resultInsight` key (added by 3.1) | ADD `insightGenerate` key |
| `apps/api/src/lib/db.ts` | Has `getActiveCuratedInsights`, `getCuratedInsight` | READ-ONLY — import both helpers |
| `apps/api/src/lib/ai.ts` | Does NOT exist | CREATE |

### New Files to Create

| File | Purpose |
|---|---|
| `apps/api/src/lib/ai.ts` | Anthropic client + `Promise.race` timeout + fallback orchestration |
| `apps/api/src/tests/lib/ai.test.ts` | Unit tests: happy path, timeout, error → all three branches |
| `apps/api/src/tests/routes/insights-generate.test.ts` | Route tests for `POST /generate` |

### Learnings from Stories 2.x and 3.1 (Carry Forward)

1. **`useReducedMotion() ?? false`** — Badge has no animation; irrelevant here
2. **`staleTime: Infinity`** — insight data is immutable once generated; correct for both insight queries
3. **`withDb(c)` boundary** — already established; never call `c.env.DB` directly
4. **`FALLBACK_INSIGHT` constant** — keep in sync with Story 3.1's version in `insights.ts`; they should be identical strings
5. **Test factory pattern** — `makeTestResultRow`, `makeCuratedInsightRow` established in Story 3.1's test file; reuse them
6. **`safeCapture` exists in web** (`@/lib/posthog`) — but for API Workers, check if `apps/api/src/lib/posthog.ts` exists before importing

### NFR Compliance

- **NFR3** (≤3s total): AI call has 2500ms hard limit; network + D1 adds ~200ms; total stays under 3s on curated path (<<1s) and AI path (~2.7s)
- **NFR14** (AI pipeline scales independently): Anthropic API calls are stateless; each Worker invocation is independent — no coupling to frontend scaling
- **NFR17** (transparent fallback): `Promise.race` pattern ensures fallback fires before the request times out; client receives 200 regardless of path

## References

- `_bmad-output/planning-artifacts/epics.md` — Epic 3 Story 3.2 ACs
- `_bmad-output/planning-artifacts/architecture.md` — `lib/ai.ts` pattern, Anthropic integration, PostHog events
- `_bmad-output/implementation-artifacts/3-1-curated-insight-system-persona-names-and-villains.md` — prerequisite story; file table, patterns to preserve
- `packages/shared/src/schemas/insight.ts` — `InsightResponseSchema` (existing base)
- `apps/api/src/lib/db.ts` — `getActiveCuratedInsights` (multi-row), `getCuratedInsight` (single-row), `withDb`, `getTestResult`
- `apps/api/src/routes/insights.ts` — Story 3.1 creates this; Story 3.2 extends it
- `apps/web/src/features/result/components/ResultPage.tsx` — current state (1 query); Story 3.1 adds insight query, Story 3.2 replaces it

---

## Dev Agent Record

### Agent Model Used

Sonnet 4.6 (claude-sonnet-4-6)

### Completion Notes List

Story 3.2 complete per spec. All 8 tasks done with 10 new tests across `src/tests/lib/ai.test.ts` (5) and `tests/routes/insights-generate.test.ts` (5). Full regression: 46 api / 23 web / 10 shared tests pass; typecheck + lint clean.

- **Anthropic SDK** (`@anthropic-ai/sdk@^0.96.0`) installed as a runtime dep in `apps/api`.
- **`ai.ts`**: `generateInsight` uses `Promise.race` with 2500ms timeout; on any failure (timeout, throw, non-text response, empty content) falls back to `getCuratedInsight(db, mbtiType)`; if curated row missing, returns `FALLBACK_INSIGHT` constant (same text as Story 3.1's fallback — kept in sync). Anthropic client constructed lazily inside the async IIFE to avoid impacting the timeout race.
- **`POST /api/insights/generate`**: gated by `requireSession` middleware (architecture guardrail #2 — AI costs $; prevents anonymous abuse). Mounted at `/api/insights` AND `/api/results` (Story 3.1's path) since both share the `insights` router.
- **Schema**: `GenerateInsightRequestSchema = z.object({ resultId: z.string().uuid() })` added below existing schemas.
- **`queryKeys.insightGenerate`** added.
- **`ResultPage`**: now runs THREE queries in parallel — `testResult` (GET /api/tests/:id), `resultInsight` (GET /api/results/:id/insight, public, provides personaName + villains), `insightGenerate` (POST /api/insights/generate, session-gated, provides AI or curated content). AI content takes precedence; curated GET endpoint is the fallback for shared-link viewers without a session. The POST queryFn catches errors and returns `{ data: null }` so loading completes gracefully without erroring the UI.
- **`InsightCard`**: accepts `source: 'ai' | 'curated'`. When `source === 'ai'`, renders shadcn-style `Badge variant="outline"` with `"AI-generated for self-reflection"` label in `text-[11px] text-slate-500`. New `Badge` component created at `apps/web/src/components/ui/badge.tsx` (project did not have one yet).
- **`PersonaReveal`**: adds `source: 'ai' | 'curated'` prop and passes it through to `InsightCard`. No animation/timing changes.
- **PostHog server-side**: TODO comment placed in route — `POSTHOG_API_KEY` not yet bound on Workers. Per Dev Notes guidance, did NOT add a try/catch swallow; just commented out the capture call until the binding is provisioned. Client-side `safeCapture('insight_viewed', { source })` from `ResultPage` reports the served source in the meantime.

**Test mock note**: The Anthropic SDK is CommonJS. A plain `vi.fn().mockImplementation(() => ({...}))` mock worked in the unit test but did NOT propagate when imported transitively through the route. Replaced with a class-based mock (`class MockAnthropic { messages = { create: mockCreate } }`) which correctly intercepts `new Anthropic(...)` through the route's import chain. The unit test in `ai.test.ts` still uses the function-style mock since it works in that direct-import context.

### File List

**Modified:**
- `packages/shared/src/schemas/insight.ts` (added `GenerateInsightRequestSchema`)
- `packages/shared/src/queryKeys.ts` (added `insightGenerate` key)
- `apps/api/package.json` (added `@anthropic-ai/sdk` dep)
- `apps/api/src/routes/insights.ts` (added `POST /generate` handler)
- `apps/api/src/index.ts` (mounted `insights` at `/api/insights` alias)
- `apps/web/src/features/result/components/InsightCard.tsx` (added `source` prop + Badge)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (added `source` prop pass-through)
- `apps/web/src/features/result/components/ResultPage.tsx` (added third query for AI insight + precedence logic)

**Created:**
- `apps/api/src/lib/ai.ts`
- `apps/api/src/tests/lib/ai.test.ts`
- `apps/api/tests/routes/insights-generate.test.ts`
- `apps/web/src/components/ui/badge.tsx`
