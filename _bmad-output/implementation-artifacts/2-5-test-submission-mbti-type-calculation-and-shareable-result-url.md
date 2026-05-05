# Story 2.5: Test Submission, MBTI Type Calculation & Shareable Result URL

Status: done

## Story

As a user who has completed all 12 questions,
I want my responses submitted and a unique result URL created instantly,
so that I can access and share my result without any login.

## Acceptance Criteria

**AC1:** Given the `EarnedPauseTransition` completes its 1200ms animation
When the animation ends
Then `POST /api/tests/submit` is called automatically with the answers array and declared type from Zustand; the `X-Session-Token` header is attached by the API client

**AC2:** Given the API receives a valid test submission
When processed in `apps/api/src/routes/tests.ts`
Then the MBTI type is calculated from the 12 responses via `lib/cat.ts`, a UUID `result_id` is generated, and a `test_results` row is inserted in D1 via `createTestResult(db, { id, userId, mbtiType, declaredType, answers, personaName })` in `lib/db.ts` — no raw `c.env.DB` calls in the route handler

**AC3:** Given the API responds with `{ data: { resultId, mbtiType }, error: null }`
When the React client receives it
Then the user is navigated to `/result/{resultId}` and the Zustand test store is cleared (`reset()`)

**AC4:** Given any user visits `/result/{resultId}` directly with no session token (fresh browser, different device)
When the page loads
Then result data loads via `GET /api/tests/{resultId}` (public route, no auth middleware) and displays correctly — no login prompt, no redirect (FR16)

## Tasks / Subtasks

- [x] Task 1 — Add `createTestResult` and `getTestResult` to `lib/db.ts` (AC: 2, 4)
  - [x] 1.1 `createTestResult(db, { id, userId, mbtiType, declaredType, answers, personaName })` — INSERT; lowercase UUID args; `new Date().toISOString()` for both `created_at` and `updated_at`; `JSON.stringify(answers)` for the `answers` column
  - [x] 1.2 `getTestResult(db, resultId)` → `TestResultRow | null` — lowercase `resultId` at bind boundary; include `WHERE deleted_at IS NULL`

- [x] Task 2 — Add `POST /api/tests/submit` to `routes/tests.ts` (AC: 1, 2, 3)
  - [x] 2.1 Add `tests.post('/submit', requireSession, async (c) => { ... })` — after the existing `/next-question` handler (do NOT touch that handler)
  - [x] 2.2 Parse body with `TestSubmitSchema.parse(payload)` — Zod errors bubble to `app.onError` → 400
  - [x] 2.3 Fetch all questions via `getAllActiveQuestions(db)` (already in db.ts), then call `calculateMBTIType(allQuestions, answers)` from `lib/cat.ts`
  - [x] 2.4 Derive `personaName = PERSONA_NAMES[mbtiType]` from `@mbti/shared`
  - [x] 2.5 Generate `id = crypto.randomUUID()` (Workers global — no import needed)
  - [x] 2.6 Insert via `createTestResult(db, { id, userId: c.get('userId'), mbtiType, declaredType: declaredType ?? null, answers, personaName })`
  - [x] 2.7 Return `c.json({ data: { resultId: id, mbtiType }, error: null }, 201)`
  - [x] 2.8 Add `safeCapture` call (server-side PostHog is out of scope — client handles this in TestSubmit.tsx)

- [x] Task 3 — Add `GET /api/tests/:resultId` to `routes/tests.ts` (AC: 4)
  - [x] 3.1 `tests.get('/:resultId', async (c) => { ... })` — NO `requireSession` (public route per FR16)
  - [x] 3.2 Fetch via `getTestResult(db, c.req.param('resultId'))`
  - [x] 3.3 Return 404 if `row === null`: `c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Result not found' }}, 404)`
  - [x] 3.4 Map row to response — explicit renames (NOT automatic snake→camel): `calculated_type` → `mbtiType`, `persona_name` → `personaName`, `declared_type` → `declaredType`, `created_at` → `createdAt`
  - [x] 3.5 Return `c.json({ data: { id, mbtiType, declaredType, personaName, createdAt }, error: null })`

- [x] Task 4 — Create `apps/web/src/features/test/components/TestSubmit.tsx` (AC: 1, 3)
  - [x] 4.1 On mount: read `answers` + `declaredType` from `useTestStore`; if `answers.length === 0` call `navigate('/', { replace: true })` and return early
  - [x] 4.2 Use `useRef(false)` double-fire guard — fire `mutate({ answers, declaredType })` exactly once on mount
  - [x] 4.3 `useMutation` → `apiCall<TestSubmitApiResponse>('/api/tests/submit', { method: 'POST', body: JSON.stringify(payload) })`
  - [x] 4.4 On success: `safeCapture('test_submitted', { mbtiType: res.data.mbtiType })`, then `reset()`, then `navigate('/result/${res.data.resultId}', { replace: true })`
  - [x] 4.5 While pending: render full-screen `bg-[#0D0F1A]` (matches EarnedPauseTransition) — no text, no spinner
  - [x] 4.6 On error: show retry UI with dark background and a "Thử lại" button (calls `mutate` again, resets `hasFired.current`)

- [x] Task 5 — Create `apps/web/src/features/result/components/ResultPage.tsx` (AC: 4)
  - [x] 5.1 Read `resultId` from route params: `const { resultId } = useParams<{ resultId: string }>()`
  - [x] 5.2 TanStack Query: `queryKey: queryKeys.testResult(resultId!)`, `queryFn: () => apiCall<TestResultApiResponse>('/api/tests/${resultId}')`, `staleTime: Infinity`, `enabled: !!resultId`
  - [x] 5.3 Loading state: full-screen `bg-[#0D0F1A]`
  - [x] 5.4 Error/404 state: dark screen with "Không tìm thấy kết quả" message and link back to `/`
  - [x] 5.5 Success: render `<PersonaReveal personaName={data.personaName} mbtiType={data.mbtiType} />`
  - [x] 5.6 `safeCapture('result_viewed', { resultId, mbtiType: data.mbtiType })` on data load (inside `useEffect` on data change)

- [x] Task 6 — Create `apps/web/src/features/result/components/PersonaReveal.tsx` (AC: 4)
  - [x] 6.1 Full-screen `min-h-svh bg-[#0D0F1A] flex flex-col items-center justify-center px-6`
  - [x] 6.2 Type-specific radial glow: `className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30 bg-type-{mbtiType}"` (Tailwind safelist — see Dev Notes)
  - [x] 6.3 Beat 1 (0ms delay, 600ms fade-in): `<motion.h1>` persona name — `text-[56px] font-display text-type-{mbtiType}` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0 }}`
  - [x] 6.4 Beat 3 (1400ms delay, 300ms fade-in): `<motion.p>` type code — `text-[14px] tracking-[0.3em] text-type-{mbtiType}` with `transition={{ duration: 0.3, delay: 1.4 }}`
  - [x] 6.5 Horizontal rule between beats: `<motion.hr className="border-type-{mbtiType} w-16" ...>` with `transition={{ duration: 0.3, delay: 1.2 }}`
  - [x] 6.6 Scroll chevron at 2000ms: pulsing chevron-down icon, `animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, delay: 2, repeat: Infinity }}`
  - [x] 6.7 `prefers-reduced-motion`: `const rm = useReducedMotion() ?? false` — when `rm=true`, all initial states set to `opacity: 1`, durations to 0
  - [x] 6.8 Tailwind JIT safelist comment block — 48-class pattern (text/bg/border × 16 types)

- [x] Task 7 — Update `apps/web/src/router.tsx` (AC: 3, 4)
  - [x] 7.1 Import `TestSubmit` from `../features/test/components/TestSubmit`
  - [x] 7.2 Import `ResultPage` from `../features/result/components/ResultPage`
  - [x] 7.3 Replace `/test/submit` placeholder div element with `element: <TestSubmit />`
  - [x] 7.4 Add after `/test/submit`: `{ path: '/result/:resultId', element: <ResultPage />, errorElement: <RootError /> }`

- [x] Task 8 — Add submit tests to `apps/api/tests/routes/tests.test.ts` (AC: 1, 2, 3)
  - [x] 8.1 `POST /api/tests/submit` — missing session token → 401 UNAUTHORIZED (no X-Session-Token header)
  - [x] 8.2 `POST /api/tests/submit` — empty answers `[]` → 400 VALIDATION_ERROR (TestSubmitSchema min:1 violation)
  - [x] 8.3 `POST /api/tests/submit` — 12 valid answers + `declaredType: null` → 201, response.data.resultId is a UUID string, response.data.mbtiType is a valid MBTI type
  - [x] 8.4 `POST /api/tests/submit` — 12 valid answers + valid `declaredType` → 201, stored correctly

- [x] Task 9 — Add get-result tests to `apps/api/tests/routes/tests.test.ts` (AC: 4)
  - [x] 9.1 `GET /api/tests/:resultId` — valid resultId, no session token → 200, response has all TestResultSchema fields
  - [x] 9.2 `GET /api/tests/:resultId` — unknown resultId → 404 NOT_FOUND envelope
  - [x] 9.3 `GET /api/tests/:resultId` — public access confirmed (no X-Session-Token, still 200)

- [x] Task 10 — Add `TestSubmitResponseSchema` to `packages/shared/src/schemas/test.ts` (AC: 3)
  - [x] 10.1 Export `TestSubmitResponseSchema = z.object({ data: z.object({ resultId: z.string().uuid(), mbtiType: MBTITypeSchema }), error: z.null() })`
  - [x] 10.2 Export `type TestSubmitResponse = z.infer<typeof TestSubmitResponseSchema>` — auto-exported via `packages/shared/src/index.ts → ./schemas/test`

## Dev Notes

### Files Being Modified (UPDATE — preserve all existing behavior)

| File | Status | MUST preserve |
|------|--------|---------------|
| `apps/api/src/routes/tests.ts` | UPDATE | `POST /api/tests/next-question` handler exactly as-is — do NOT touch it |
| `apps/api/src/lib/db.ts` | UPDATE | `withDb`, `getActiveCuratedInsights`, `getAllActiveQuestions` — all unchanged |
| `packages/shared/src/schemas/test.ts` | UPDATE | All existing exports: `AnswerSchema`, `QuestionOptionSchema`, `QuestionSchema`, `NextQuestionRequestSchema`, `NextQuestionResponseSchema`, `TestSubmitSchema`, `TestResultSchema` |
| `apps/web/src/router.tsx` | UPDATE | Routes `/`, `/consent`, `/declare`, `/test`, and `*` wildcard unchanged |
| `apps/api/tests/routes/tests.test.ts` | UPDATE | Existing 5 test cases for `/next-question` — append new tests, do NOT replace |

### Architecture Compliance Guardrails

1. **D1 boundary:** NEVER use `c.env.DB` in route handlers. Always `const db = withDb(c)` then pass `db` to typed helpers.
2. **KV boundary:** `requireSession` already sets `c.var.userId`. Read with `c.get('userId')` in handlers.
3. **Response envelope:** Every response is `{ data: ..., error: null }` OR `{ data: null, error: {...} }` — never both populated.
4. **Zod errors:** Throw from route handlers; the global `app.onError` in `index.ts` wraps them as 400 VALIDATION_ERROR.
5. **UUID normalization:** Lower-case ALL UUID args at the DB boundary (`.toLowerCase()`) — both on INSERT (`id`, `user_id`) and SELECT (`resultId`). This story introduces the first UUID-keyed helpers per the `lib/db.ts` JSDoc convention.
6. **Timestamps:** `new Date().toISOString()` — never `'now'` SQLite modifier or other Date formats.
7. **`calculated_type` → `mbtiType`:** This is NOT a mechanical snake→camel transform — `calculated_type` must be explicitly assigned to `mbtiType` in the GET handler response. Documented in `rows.ts` NOTE.
8. **Public GET route:** `GET /api/tests/:resultId` must have NO auth middleware (FR16). Do not add `requireSession`.
9. **TanStack Query typing:** `apiCall<{ data: { resultId: string; mbtiType: MBTIType }; error: null }>` — type the generic to get compile-time safety.
10. **PostHog:** `safeCapture(...)` from `@/lib/posthog` — never `window.posthog?.capture` or bare `posthog.capture`.
11. **Navigation after mutation:** Use `navigate(..., { replace: true })` to prevent back-button returning to the submission loading screen.
12. **`crypto.randomUUID()`:** Available as a global in Cloudflare Workers — no import needed.

### Exact DB Helper Implementations

```typescript
// apps/api/src/lib/db.ts — ADD these two helpers (after getAllActiveQuestions):

export async function createTestResult(
  db: D1Database,
  payload: {
    id: string;
    userId: string;
    mbtiType: MBTIType;
    declaredType: MBTIType | null;
    answers: Array<{ questionId: string; value: number }>;
    personaName: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO test_results (id, user_id, calculated_type, declared_type, answers, persona_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.id.toLowerCase(),
      payload.userId.toLowerCase(),
      payload.mbtiType,
      payload.declaredType,         // null is fine — D1 binds NULL for null values
      JSON.stringify(payload.answers),
      payload.personaName,
      now,
      now,
    )
    .run();
  if (!result.success) {
    throw new Error(`createTestResult: D1 insert failed: ${result.error ?? 'unknown error'}`);
  }
}

export async function getTestResult(
  db: D1Database,
  resultId: string,
): Promise<TestResultRow | null> {
  return db
    .prepare(
      `SELECT id, user_id, declared_type, calculated_type, answers, persona_name, created_at, updated_at
       FROM test_results WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(resultId.toLowerCase())
    .first<TestResultRow>();
}
```

### Exact Submit Route Implementation

```typescript
// apps/api/src/routes/tests.ts — ADD after the existing /next-question block:
import { calculateMBTIType } from '../lib/cat';
import { createTestResult, getAllActiveQuestions, withDb } from '../lib/db';
import { PERSONA_NAMES } from '@mbti/shared';
import { TestSubmitSchema } from '@mbti/shared';

tests.post('/submit', requireSession, async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      400,
    );
  }
  const { answers, declaredType } = TestSubmitSchema.parse(payload); // ZodError → app.onError

  const db = withDb(c);
  const userId = c.get('userId'); // set by requireSession
  const allQuestions = await getAllActiveQuestions(db);
  const mbtiType = calculateMBTIType(allQuestions, answers);
  const personaName = PERSONA_NAMES[mbtiType];
  const id = crypto.randomUUID(); // Cloudflare Workers global

  await createTestResult(db, {
    id,
    userId,
    mbtiType,
    declaredType: declaredType ?? null,
    answers,
    personaName,
  });

  return c.json({ data: { resultId: id, mbtiType }, error: null }, 201);
});
```

### Exact GET Route Implementation

```typescript
// apps/api/src/routes/tests.ts — ADD after /submit handler:
import { getTestResult } from '../lib/db';

tests.get('/:resultId', async (c) => {
  const db = withDb(c);
  const row = await getTestResult(db, c.req.param('resultId'));
  if (!row) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Result not found' } },
      404,
    );
  }
  return c.json({
    data: {
      id: row.id,
      mbtiType: row.calculated_type,   // explicit rename — NOT snake_case auto-transform
      declaredType: row.declared_type, // explicit rename
      personaName: row.persona_name,   // explicit rename
      createdAt: row.created_at,       // explicit rename
    },
    error: null,
  });
});
```

### TestSubmit Component Pattern

```typescript
// apps/web/src/features/test/components/TestSubmit.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useTestStore } from '../store/useTestStore';
import { apiCall } from '@/lib/api';
import { safeCapture } from '@/lib/posthog';
import type { MBTIType } from '@mbti/shared';

type SubmitResponse = { data: { resultId: string; mbtiType: MBTIType }; error: null };

export function TestSubmit() {
  const navigate = useNavigate();
  const answers = useTestStore((s) => s.answers);
  const declaredType = useTestStore((s) => s.declaredType);
  const reset = useTestStore((s) => s.reset);
  const hasFired = useRef(false);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (payload: { answers: typeof answers; declaredType: typeof declaredType }) =>
      apiCall<SubmitResponse>('/api/tests/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      safeCapture('test_submitted', { mbtiType: res.data.mbtiType });
      reset();
      navigate(`/result/${res.data.resultId}`, { replace: true });
    },
  });

  useEffect(() => {
    if (answers.length === 0) {
      navigate('/', { replace: true });
      return;
    }
    if (hasFired.current) return;
    hasFired.current = true;
    mutate({ answers, declaredType });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fire once on mount

  if (isError) {
    return (
      <div className="min-h-svh bg-[#0D0F1A] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-slate-300 text-[16px] mb-6">Có lỗi xảy ra. Vui lòng thử lại.</p>
          <button
            type="button"
            onClick={() => { hasFired.current = false; mutate({ answers, declaredType }); }}
            className="px-6 py-3 rounded-xl bg-[#818CF8] text-white font-medium text-[15px]"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Pending or initial state: dark screen matching EarnedPauseTransition
  return <div className="min-h-svh bg-[#0D0F1A]" aria-label="Đang lưu kết quả" />;
}
```

### PersonaReveal — Type-Specific Color System

TypeSelector.tsx (Story 2.3) uses `text-type-{TYPE}`, `bg-type-{TYPE}`, `border-type-{TYPE}` Tailwind custom utilities with a comment-based JIT safelist. Copy the exact pattern:

```typescript
// apps/web/src/features/result/components/PersonaReveal.tsx — top of file:
// Tailwind JIT safelist — DO NOT DELETE
// text-type-INTJ text-type-INTP text-type-ENTJ text-type-ENTP
// text-type-INFJ text-type-INFP text-type-ENFJ text-type-ENFP
// text-type-ISTJ text-type-ISFJ text-type-ESTJ text-type-ESFJ
// text-type-ISTP text-type-ISFP text-type-ESTP text-type-ESFP
// bg-type-INTJ bg-type-INTP bg-type-ENTJ bg-type-ENTP
// bg-type-INFJ bg-type-INFP bg-type-ENFJ bg-type-ENFP
// bg-type-ISTJ bg-type-ISFJ bg-type-ESTJ bg-type-ESFJ
// bg-type-ISTP bg-type-ISFP bg-type-ESTP bg-type-ESFP
// border-type-INTJ border-type-INTP border-type-ENTJ border-type-ENTP
// border-type-INFJ border-type-INFP border-type-ENFJ border-type-ENFP
// border-type-ISTJ border-type-ISFJ border-type-ESTJ border-type-ESFJ
// border-type-ISTP border-type-ISFP border-type-ESTP border-type-ESFP
```

### PersonaReveal — Framer Motion Timing (from `ux-design-specification.md#ResultCard`)

```typescript
// Beat 1: Persona name — 0ms delay, 600ms fade-in
initial={{ opacity: 0 }} animate={{ opacity: rm ? 1 : 0, ...(!rm && { opacity: 1 }) }}
// Simpler: initial={{ opacity: rm ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: rm ? 0 : 0.6, delay: rm ? 0 : 0 }}

// Beat 3: Type code — 1400ms delay, 300ms fade-in
initial={{ opacity: rm ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 1.4 }}

// HR divider — 1200ms delay, 300ms fade-in
initial={{ opacity: rm ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: rm ? 0 : 0.3, delay: rm ? 0 : 1.2 }}

// Scroll chevron — pulsing from 2000ms
animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, delay: rm ? 0 : 2, repeat: Infinity }}
```

Where `const rm = useReducedMotion() ?? false` — same as EarnedPauseTransition.tsx pattern.

### Test Mock Pattern for New Routes

The existing `tests.test.ts` uses `makeKv()` + `seedSession()` + `makeDb()`. Extend `makeDb()` for new helpers:

```typescript
// Additional makeDb() stubs needed for submit tests:
//   getAllActiveQuestions: returns 12 QuestionRow objects (3 per dimension × 4 dimensions)
//   createTestResult: returns { success: true, meta: {}, results: [] }
//
// Additional makeDb() stubs for get-result tests:
//   getTestResult: returns a TestResultRow or null
//
// Minimal QuestionRow factory for mocks:
const makeQuestion = (dim: 'E_I'|'S_N'|'T_F'|'J_P', i: number): QuestionRow => ({
  id: `q-${dim}-${i}`,
  text: 'Question text',
  dimension: dim,
  answer_options: JSON.stringify([{ label: 'A', value: 1 }, { label: 'B', value: 2 }]),
  discrimination: 1.0,
  difficulty: 0.0,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
});

const makeAllQuestions = (): QuestionRow[] =>
  (['E_I','S_N','T_F','J_P'] as const).flatMap((dim) => [1,2,3].map((i) => makeQuestion(dim, i)));
```

### Zustand Store Interface — READ-ONLY for this story

```typescript
// useTestStore.ts — do NOT add actions, do NOT change persist key 'mbti-test-progress'
// Read-only interface for Story 2.5:
answers: Answer[]           // → POST /api/tests/submit payload
declaredType: MBTIType | null  // → POST /api/tests/submit payload
reset: () => void           // → call AFTER navigate on submit success
```

### What Story 2.4 Owns That 2.5 Consumes

| Asset | Location | 2.5 consumes it as |
|-------|----------|--------------------|
| `useTestStore` with `answers`, `declaredType`, `reset()` | `apps/web/src/features/test/store/useTestStore.ts` | Read state, call `reset()` |
| `EarnedPauseTransition onComplete` → `navigate('/test/submit')` | `apps/web/src/features/test/components/TestFlow.tsx` | **Do NOT modify TestFlow.tsx** — `TestSubmit.tsx` is what mounts at `/test/submit` |
| `calculateMBTIType(allQuestions, answers)` | `apps/api/src/lib/cat.ts` | Call in submit handler |
| `getAllActiveQuestions(db)` | `apps/api/src/lib/db.ts` | Required before `calculateMBTIType` |
| `TestSubmitSchema` | `packages/shared/src/schemas/test.ts` | Server-side validation in submit handler |

### D1 Schema for `test_results` (from `migrations/0001_initial_schema.sql`)

```sql
CREATE TABLE test_results (
  id              TEXT PRIMARY KEY NOT NULL,  -- UUID, lowercase at boundary
  user_id         TEXT NOT NULL,              -- from KV session, lowercase at boundary
  declared_type   TEXT NULL,                  -- MBTIType or NULL
  calculated_type TEXT NOT NULL,              -- result of calculateMBTIType()
  answers         TEXT NOT NULL,              -- JSON.stringify(answers array)
  persona_name    TEXT NOT NULL,              -- PERSONA_NAMES[mbtiType]
  created_at      TEXT NOT NULL,              -- new Date().toISOString()
  updated_at      TEXT NOT NULL               -- new Date().toISOString()
  -- deleted_at and retention_flag added by 0004_pdpa_soft_delete.sql
  -- → getTestResult must include WHERE deleted_at IS NULL
  -- → createTestResult does NOT need to set these (default NULL)
);
```

### `PERSONA_NAMES` — Already in `@mbti/shared`

```typescript
// packages/shared/src/constants.ts — exported, import directly:
import { PERSONA_NAMES } from '@mbti/shared';
const personaName = PERSONA_NAMES[mbtiType];
// e.g., INFP → 'The Mediator', INTJ → 'The Architect'
// Note: Story 3.1 will replace with Vietnamese curated names — do NOT hardcode new names here
```

### Learnings from Story 2.4 (Carry Forward)

1. `useReducedMotion() ?? false` — always coerce; null is returned in SSR/test context
2. `useRef<ReturnType<typeof setTimeout> | null>(null)` — timer ref type for Workers/Node compatibility
3. **One-shot `useEffect`:** use `useRef(false)` guard (`hasFired.current`) to prevent StrictMode double-fire
4. `safeCapture(name, props?)` from `@/lib/posthog` — never `window.posthog?.capture`
5. `navigate(..., { replace: true })` — always use `replace` on redirect-after-action
6. Framer Motion: `AnimatePresence mode="wait"` on route-level transitions
7. TypeScript `eslint-disable-next-line react-hooks/exhaustive-deps` on intentional empty-deps `useEffect` (add comment explaining intent)

### Deferred from This Story

The following are NOT in scope for Story 2.5:

- `ReverseReveal` component (declared vs actual type comparison) — Story 3.3
- `InsightCard` with AI or curated content — Story 3.2
- `VillainsSection` — Story 3.1 (data exists via `VILLAINS_MAP` but display is 3.3)
- `ShareCard` / `ShareActions` — Story 3.4
- `useResultData` hook extraction — inline TanStack Query in `ResultPage.tsx` for now
- PostHog server-side event from `POST /api/tests/submit` — client fires `test_submitted` in `TestSubmit.tsx`

### Project Structure Notes

```
NEW files:
  apps/web/src/features/test/components/TestSubmit.tsx
  apps/web/src/features/result/components/ResultPage.tsx
  apps/web/src/features/result/components/PersonaReveal.tsx

MODIFIED files:
  apps/api/src/lib/db.ts          (+createTestResult, +getTestResult)
  apps/api/src/routes/tests.ts    (+POST /submit, +GET /:resultId)
  apps/web/src/router.tsx         (replace /test/submit placeholder, add /result/:resultId)
  packages/shared/src/schemas/test.ts  (+TestSubmitResponseSchema)
  apps/api/tests/routes/tests.test.ts  (+8 test cases for submit + get-result)
```

`features/result/` directory does not exist yet — create it with `components/` and (optionally) `hooks/` subfolders per architecture.md structure.

### References

- `apps/api/src/lib/db.ts` — UUID lowercase convention in JSDoc (Story 1.4 deferred work)
- `packages/shared/src/db/rows.ts` — `TestResultRow` shape; note `calculated_type` and `persona_name` column names
- `packages/shared/src/constants.ts` — `PERSONA_NAMES`, `MBTI_TYPES`
- `packages/shared/src/schemas/test.ts` — `TestSubmitSchema`, `TestResultSchema` (existing; do not break)
- `packages/shared/src/queryKeys.ts` — `queryKeys.testResult(id)` already defined
- `migrations/0001_initial_schema.sql` — `test_results` DDL
- `apps/web/src/features/test/components/EarnedPauseTransition.tsx` — `bg-[#0D0F1A]`, `useReducedMotion` pattern
- `apps/web/src/features/test/store/useTestStore.ts` — exact store shape
- `apps/web/src/router.tsx` — current routes (do not break existing 4 routes)
- `apps/api/src/index.ts` — `app.route('/api/tests', tests)` — confirms route prefix
- `ux-design-specification.md#ResultCard` — Beat timing, type-specific accent, full anatomy
- `_bmad-output/implementation-artifacts/2-4-test-question-flow*.md` — `hasFired` ref pattern, `safeCapture`, `useReducedMotion`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 10 tasks complete. 54 tests pass (31 API + 23 web), 0 regressions.
- `createTestResult` and `getTestResult` added to `lib/db.ts` — first UUID-keyed helpers; lowercase boundary enforced per JSDoc convention.
- `POST /api/tests/submit` added to `routes/tests.ts` with `requireSession`; calculates MBTI via `calculateMBTIType`, derives persona name from `PERSONA_NAMES`, inserts with `crypto.randomUUID()`, returns 201.
- `GET /api/tests/:resultId` added as public route (no auth); explicit field mapping `calculated_type` → `mbtiType`, `persona_name` → `personaName`.
- `TestSubmit.tsx` fires submit mutation exactly once on mount via `hasFired` ref guard; redirects to `/result/:resultId` on success with `replace: true`.
- `PersonaReveal.tsx` implements Beat 1/3 reveal sequence with Framer Motion; `prefers-reduced-motion` respected; Tailwind JIT safelist for 48 type-specific classes.
- `ResultPage.tsx` uses `queryKeys.testResult(resultId)` with `staleTime: Infinity`; fires `safeCapture('result_viewed')` on data load.
- `TestSubmitResponseSchema` + `TestSubmitResponse` type added to shared schemas.
- Router updated: `/test/submit` → `TestSubmit`, `/result/:resultId` → `ResultPage`.

### File List

- `apps/api/src/lib/db.ts` (modified — added `createTestResult`, `getTestResult`, imported `TestResultRow`)
- `apps/api/src/routes/tests.ts` (modified — added `POST /submit`, `GET /:resultId`, updated imports)
- `apps/web/src/features/test/components/TestSubmit.tsx` (new)
- `apps/web/src/features/result/components/ResultPage.tsx` (new)
- `apps/web/src/features/result/components/PersonaReveal.tsx` (new)
- `apps/web/src/router.tsx` (modified — added imports, replaced placeholder, added result route)
- `packages/shared/src/schemas/test.ts` (modified — added `TestSubmitResponseSchema`, `TestSubmitResponse`)
- `apps/api/tests/routes/tests.test.ts` (modified — added 8 new test cases, helper types and factories)

### Senior Developer Review (AI)

**Review Date:** 2026-05-05
**Review Outcome:** Changes Requested
**Layers:** Blind Hunter · Edge Case Hunter · Acceptance Auditor
**Dismissed:** 6 · **Deferred:** 7

#### Action Items

- [x] [Review][Patch] `getTestResult` swallows D1 errors as 404 — restructured to `.all()` with `.success` check, consistent with other db helpers [`apps/api/src/lib/db.ts`]
- [x] [Review][Patch] `apiCall` swallows HTTP 4xx/5xx — now throws `ApiError` on `!res.ok` so `useMutation`/`useQuery` `onError` fires correctly [`apps/web/src/lib/api.ts`]
- [x] [Review][Patch] Double-submit risk on retry — retry button `disabled={isPending}`, `onClick` guard `if (isPending) return`, `hasFired.current = true` set before `mutate` [`apps/web/src/features/test/components/TestSubmit.tsx`]
- [x] [Review][Patch] `resultId ?? ''` pollutes React Query cache — changed to `resultId!` (safe inside `enabled: !!resultId` guard) [`apps/web/src/features/result/components/ResultPage.tsx`]
- [x] [Review][Patch] Local `SubmitResponse` type duplicates shared `TestSubmitResponse` — replaced with `import type { TestSubmitResponse } from '@mbti/shared'` [`apps/web/src/features/test/components/TestSubmit.tsx`]
- [x] [Review][Patch] Scroll chevron `prefers-reduced-motion` bypass incomplete — `animate`, `duration`, and `repeat` all collapse to static/zero when `rm=true` [`apps/web/src/features/result/components/PersonaReveal.tsx`]
- [x] [Review][Patch] `isPending` not destructured from `useMutation` — destructured and used to gate retry button [`apps/web/src/features/test/components/TestSubmit.tsx`]
- [x] [Review][Defer] `answer_options` JSON.parse unchecked in `/next-question` — pre-existing from Story 2.4, not introduced here
- [x] [Review][Defer] `total: 12` hardcoded magic number — pre-existing from Story 2.4
- [x] [Review][Defer] `calculateMBTIType` silently defaults dimensions with 0 matching answers — pre-existing in `cat.ts`
- [x] [Review][Defer] `TestSubmitSchema` min(1) allows 1–11 answers (< full 12) — defense-in-depth server-side count enforcement; CAT flow enforces 12 on client
- [x] [Review][Defer] Local `ResultApiResponse` type in `ResultPage.tsx` — no shared envelope schema for GET result exists; out of scope for this story
- [x] [Review][Defer] `PersonaReveal` dynamic Tailwind class silently fails for corrupted DB `mbtiType` — general robustness concern, data is typed correctly at API boundary
- [x] [Review][Defer] Zustand persist hydration race on mount — theoretical with synchronous `localStorage` adapter; unlikely to manifest
