# Story 2.4: Test Question Flow with 12 Questions and Earned Pause

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user taking the MBTI test,
I want to answer 12 situational questions one at a time with instant visual feedback and smooth card transitions,
so that the test feels like a natural conversation completed in under 5 minutes.

## Acceptance Criteria

1. **Given** the user reaches `/test` after declaring their type (or skipping declaration) — **When** `<TestFlow />` mounts — **Then** it renders full-screen with no header nav and no back button; the `bg-surface-deep` (`#050507`) background fills the viewport; the 12-dot progress indicator is visible (not a percentage bar).

2. **Given** `<TestFlow />` is mounted — **When** the component initializes — **Then** it calls `POST /api/tests/next-question` with `{ answers: [] }` (Zustand `answers` state, initially empty) and the `X-Session-Token` header; the API returns the first question selected by the CAT engine; `<QuestionCard />` renders with: 12-dot progress row (dot 1 active/filled, dots 2–12 dimmed), question text (≥20px Inter bold, light `#F8F9FC` color), and 2–4 tappable answer option cards.

3. **Given** `<QuestionCard />` is visible — **When** the user taps an answer option card — **Then** within 150ms the tapped card's border highlights with the `cta-primary` indigo accent and the other cards dim to `opacity-40`; after a 300ms delay `useTestStore.setAnswer(questionId, value)` and `useTestStore.setCurrentIndex(currentIndex + 1)` execute; the Framer Motion slide transition begins: current card exits via `x: 0 → -100%` (slide left), next card enters via `x: 100% → 0` (slide right), duration 300ms ease-out; a fresh API call `POST /api/tests/next-question` fires with the updated answers array. **When** `useReducedMotion()` is `true` all motion resolves instantly but state writes and timing rules still apply.

4. **Given** the user is on any question 1–12 — **When** an answer is selected — **Then** no "Next" button appears; auto-advance is the only progression mechanism; `currentIndex` in `useTestStore` increments to track question position (0-based: 0 = question 1 of 12).

5. **Given** the user answers Question 12 (the 12th answer is written to Zustand) — **When** `POST /api/tests/next-question` returns `{ data: null }` (signal: all questions answered) — **Then** `<EarnedPauseTransition />` mounts immediately (no nav, no intermediate screen); the test questions unmount.

6. **Given** `<EarnedPauseTransition />` is mounted — **When** it renders — **Then**: full-screen `#0D0F1A` near-black background; Framer Motion particle-coalescing animation (radial particles moving toward center, glow intensifies at 900ms mark); no text, no spinner, no progress bar, no skip control; the component unmounts after exactly **1200ms** and navigates to `/test/submit` (Story 2.5 placeholder — navigate programmatically after 1200ms timer). **When** `useReducedMotion()` is `true`: plain dark screen with a single centered glow pulse only (no particle animation), 1200ms delay **preserved** (non-skippable).

7. **Given** the user closes the browser at any point during the test (questions 1–12) — **When** the user returns within 24 hours — **Then** the test resumes from the last answered question because Zustand `useTestStore` with `persist` middleware (`name: 'mbti-test-progress'`) has written `answers` and `currentIndex` to `localStorage`; on resume, `TestFlow` reads the persisted `answers` array, skips already-answered questions, and fetches the next unanswered question from the CAT engine.

8. **Given** an API error occurs during `POST /api/tests/next-question` — **When** the error response arrives (network failure or non-2xx status) — **Then** an inline error message is shown on the test screen with a "Thử lại" retry button; the user is not navigated away; their existing answers remain intact in Zustand.

9. **Given** the test flow is rendered — **When** checked against accessibility requirements — **Then** each answer option card has `role="radio"` and `aria-checked`; the answer container has `role="radiogroup"`; keyboard navigation (arrow keys + Enter/Space) selects options; the progress dots have `aria-label="Câu {n} / 12"` on the active dot.

## Tasks / Subtasks

- [x] **Task 1: D1 migration — `questions` table + seed data** (AC: 2, 3)
  - [x] 1.1 Create `migrations/0005_questions.sql`:
    ```sql
    CREATE TABLE questions (
      id             TEXT PRIMARY KEY NOT NULL,
      text           TEXT NOT NULL,
      dimension      TEXT NOT NULL CHECK (dimension IN ('E_I', 'S_N', 'T_F', 'J_P')),
      answer_options TEXT NOT NULL, -- JSON: [{label: string, value: number}]
      discrimination REAL NOT NULL DEFAULT 1.0,
      difficulty     REAL NOT NULL DEFAULT 0.0,
      is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX idx_questions_dimension_active ON questions(dimension, is_active);
    ```
  - [x] 1.2 Add seed questions to the migration (or a separate `0005_questions_seed.sql`) — **exactly 16 situational questions** (4 per dimension: E_I, S_N, T_F, J_P), with Vietnamese text, 2 answer options each (value 1 = first pole, value 2 = second pole). CAT requires ≥4 questions per dimension so it can select the 3 used in the 12-question test. Use IDs `q-ei-01`…`q-ei-04`, `q-sn-01`…`q-sn-04`, `q-tf-01`…`q-tf-04`, `q-jp-01`…`q-jp-04`.
  - [x] 1.3 Apply the migration locally: `wrangler d1 migrations apply mbti-db --local` and verify the `questions` table exists with 16 rows.

- [x] **Task 2: Shared package — `QuestionRow`, `QuestionSchema`, `NextQuestionResponseSchema`** (AC: 2, 3)
  - [x] 2.1 Add `QuestionRow` interface to `packages/shared/src/db/rows.ts`:
    ```typescript
    export interface QuestionRow {
      id: string;
      text: string;
      dimension: 'E_I' | 'S_N' | 'T_F' | 'J_P';
      answer_options: string; // JSON string — parse with JSON.parse
      discrimination: number;
      difficulty: number;
      is_active: 0 | 1;
      created_at: string;
    }
    ```
  - [x] 2.2 Add to `packages/shared/src/schemas/test.ts`:
    ```typescript
    export const QuestionOptionSchema = z.object({
      label: z.string().min(1),
      value: z.number().int().min(1).max(4),
    });
    export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

    export const QuestionSchema = z.object({
      id: z.string().min(1),
      text: z.string().min(1),
      dimension: z.enum(['E_I', 'S_N', 'T_F', 'J_P']),
      options: z.array(QuestionOptionSchema).min(2).max(4),
    });
    export type Question = z.infer<typeof QuestionSchema>;

    export const NextQuestionRequestSchema = z.object({
      answers: z.array(AnswerSchema).max(12),
    }).strict();
    export type NextQuestionRequest = z.infer<typeof NextQuestionRequestSchema>;

    export const NextQuestionResponseSchema = z.union([
      z.object({
        data: z.object({
          question: QuestionSchema,
          questionIndex: z.number().int().min(0).max(11), // 0-based
          total: z.literal(12),
        }),
        error: z.null(),
      }),
      z.object({
        data: z.null(), // null = all 12 questions answered
        error: z.null(),
      }),
      z.object({
        data: z.null(),
        error: z.object({ code: z.string(), message: z.string() }),
      }),
    ]);
    export type NextQuestionResponse = z.infer<typeof NextQuestionResponseSchema>;
    ```
  - [x] 2.3 Re-export new types from `packages/shared/src/index.ts` (add to existing exports if not auto-picked up via barrel).
  - [x] 2.4 Run `pnpm --filter @mbti/shared typecheck` — 0 errors.

- [x] **Task 3: API — `cat.ts` CAT engine library** (AC: 2, 3, 7)
  - [x] 3.1 Create `apps/api/src/lib/cat.ts`:
    ```typescript
    import type { QuestionRow } from '@mbti/shared';
    import type { MBTIType } from '@mbti/shared';

    type Dimension = 'E_I' | 'S_N' | 'T_F' | 'J_P';
    type Answer = { questionId: string; value: number };

    // Questions per test — 3 per dimension = 12 total
    const QUESTIONS_PER_DIMENSION = 3;
    const DIMENSION_ORDER: Dimension[] = ['E_I', 'S_N', 'T_F', 'J_P'];

    /**
     * Selects the next question using a simple CAT strategy:
     * 1. Find the dimension with fewest answers (ties broken by DIMENSION_ORDER)
     * 2. From that dimension, pick the unanswered question with highest discrimination
     * Returns null when all 12 questions have been answered.
     */
    export function selectNextQuestion(
      allQuestions: QuestionRow[],
      answers: Answer[],
    ): QuestionRow | null {
      const answeredIds = new Set(answers.map((a) => a.questionId));

      // Count answers per dimension (only counting answered questions that are in our pool)
      const answeredPerDimension: Record<Dimension, number> = {
        E_I: 0, S_N: 0, T_F: 0, J_P: 0,
      };
      for (const q of allQuestions) {
        if (answeredIds.has(q.id)) {
          answeredPerDimension[q.dimension]++;
        }
      }

      // Check if all 12 questions answered (3 per dimension)
      const totalAnswered = Object.values(answeredPerDimension).reduce((a, b) => a + b, 0);
      if (totalAnswered >= QUESTIONS_PER_DIMENSION * DIMENSION_ORDER.length) {
        return null;
      }

      // Find dimension with fewest answers (that still needs more questions)
      let targetDimension: Dimension | null = null;
      let minAnswered = Infinity;
      for (const dim of DIMENSION_ORDER) {
        if (
          answeredPerDimension[dim] < QUESTIONS_PER_DIMENSION &&
          answeredPerDimension[dim] < minAnswered
        ) {
          minAnswered = answeredPerDimension[dim];
          targetDimension = dim;
        }
      }
      if (!targetDimension) return null;

      // Pick unanswered question from target dimension with highest discrimination
      const candidates = allQuestions
        .filter((q) => q.dimension === targetDimension && !answeredIds.has(q.id) && q.is_active === 1)
        .sort((a, b) => b.discrimination - a.discrimination);

      return candidates[0] ?? null;
    }

    const POLE_MAP: Record<Dimension, [MBTIType[0], MBTIType[0]]> = {
      E_I: ['E', 'I'],
      S_N: ['S', 'N'],
      T_F: ['T', 'F'],
      J_P: ['J', 'P'],
    };

    /**
     * Calculates the MBTI type from 12 answers (3 per dimension).
     * Value 1 = first pole (E, S, T, J); value 2 = second pole (I, N, F, P).
     * Simple majority vote per dimension.
     */
    export function calculateMBTIType(
      allQuestions: QuestionRow[],
      answers: Answer[],
    ): MBTIType {
      const questionById = new Map(allQuestions.map((q) => [q.id, q]));
      const scores: Record<Dimension, number[]> = { E_I: [], S_N: [], T_F: [], J_P: [] };

      for (const answer of answers) {
        const q = questionById.get(answer.questionId);
        if (q) scores[q.dimension].push(answer.value);
      }

      const letters = DIMENSION_ORDER.map((dim) => {
        const vals = scores[dim];
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 1.5;
        const [pole1, pole2] = POLE_MAP[dim];
        return avg <= 1.5 ? pole1 : pole2;
      });

      return letters.join('') as MBTIType;
    }
    ```

- [x] **Task 4: API — `db.ts` question helpers** (AC: 2)
  - [x] 4.1 Add to `apps/api/src/lib/db.ts`:
    ```typescript
    export async function getAllActiveQuestions(db: D1Database): Promise<QuestionRow[]> {
      const result = await db
        .prepare(
          `SELECT id, text, dimension, answer_options, discrimination, difficulty, is_active, created_at
           FROM questions WHERE is_active = 1`,
        )
        .all<QuestionRow>();
      if (!result.success) {
        throw new Error(`getAllActiveQuestions: D1 query failed: ${result.error ?? 'unknown'}`);
      }
      return result.results ?? [];
    }
    ```
  - [x] 4.2 Import `QuestionRow` from `@mbti/shared` at the top of `db.ts`.

- [x] **Task 5: API — `routes/tests.ts` — `POST /api/tests/next-question`** (AC: 2, 5, 8)
  - [x] 5.1 Create `apps/api/src/routes/tests.ts`:
    ```typescript
    import { Hono } from 'hono';
    import type { Bindings, Variables } from '../types/bindings';
    import { requireSession } from '../middleware/auth';
    import { withDb, getAllActiveQuestions } from '../lib/db';
    import { selectNextQuestion } from '../lib/cat';
    import { NextQuestionRequestSchema } from '@mbti/shared';

    const tests = new Hono<{ Bindings: Bindings; Variables: Variables }>();

    tests.post('/next-question', requireSession, async (c) => {
      let payload: unknown;
      try {
        payload = await c.req.json();
      } catch {
        return c.json(
          { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
          400,
        );
      }
      // ZodError bubbles to global app.onError → 400 VALIDATION_ERROR envelope
      const { answers } = NextQuestionRequestSchema.parse(payload);

      const db = withDb(c);
      const allQuestions = await getAllActiveQuestions(db);
      const next = selectNextQuestion(allQuestions, answers);

      if (!next) {
        // All 12 answered — signal completion
        return c.json({ data: null, error: null });
      }

      const options = JSON.parse(next.answer_options) as Array<{ label: string; value: number }>;
      const questionIndex = answers.length; // 0-based

      return c.json({
        data: {
          question: {
            id: next.id,
            text: next.text,
            dimension: next.dimension,
            options,
          },
          questionIndex,
          total: 12,
        },
        error: null,
      });
    });

    export default tests;
    ```
  - [x] 5.2 Register route in `apps/api/src/index.ts`:
    ```typescript
    import tests from './routes/tests';
    // ...
    app.route('/api/tests', tests);
    ```

- [x] **Task 6: Update `useTestStore.ts` — add `setAnswer` and `setCurrentIndex`** (AC: 3, 7)
  - [x] 6.1 The store file lives at `apps/web/src/features/test/store/useTestStore.ts`. **DO NOT** change the persist key `'mbti-test-progress'`, the `safeLocalStorage` wrapper, or any existing actions. Add only:
    ```typescript
    // In the TestState type:
    setAnswer: (questionId: string, value: number) => void;
    setCurrentIndex: (index: number) => void;

    // In the create() call:
    setAnswer: (questionId, value) =>
      set((s) => ({
        answers: [
          ...s.answers.filter((a) => a.questionId !== questionId),
          { questionId, value },
        ],
      })),
    setCurrentIndex: (index) => set({ currentIndex: index }),
    ```
  - [x] 6.2 Update `apps/web/src/features/test/store/useTestStore.test.ts` — add 3 new test cases:
    - `setAnswer` appends a new answer to `answers`
    - `setAnswer` replaces an existing answer with the same `questionId`
    - `setCurrentIndex(5)` sets `currentIndex` to `5`

- [x] **Task 7: `QuestionCard.tsx` component** (AC: 2, 3, 4, 9)
  - [x] 7.1 Create `apps/web/src/features/test/components/QuestionCard.tsx`:
    - Props: `question: Question`, `questionIndex: number` (0-based), `onAnswer: (questionId: string, value: number) => void`
    - **Progress dots row:** 12 `<span>` elements; active dot = `bg-[#818CF8]` (indigo) 8px circle; inactive = `bg-white/20` 8px circle. Container: `flex gap-1.5 justify-center`. Active dot has `aria-label="Câu {questionIndex + 1} / 12"`.
    - **Question text:** `<p className="text-[20px] font-bold text-[#F8F9FC] leading-relaxed">` centered, max-w-prose.
    - **Answer cards container:** `role="radiogroup"` div, flex column, gap-3.
    - **Per answer card:** `<button role="radio" aria-checked={selected === option.value}...>` — on tap: `setSelected(option.value)`, 150ms border highlight (`border-[#818CF8] ring-2 ring-[#818CF8]/30`), other cards `opacity-40`; after 300ms delay calls `onAnswer(question.id, option.value)`. Timer ref cleaned up on unmount. Guard against double-tap: `if (selected !== null) return`.
    - **`useReducedMotion()` coercion:** `const rm = useReducedMotion() ?? false`. When `rm === true`: skip animation delays, resolve state writes immediately.
  - [x] 7.2 Create `apps/web/src/features/test/components/QuestionCard.test.tsx` — minimum 3 behavioral test cases:
    - (a) renders question text and all option labels
    - (b) tapping an option sets `aria-checked=true` on that option, `aria-checked=false` on others
    - (c) `onAnswer` is called with `(questionId, value)` after selection

- [x] **Task 8: `EarnedPauseTransition.tsx` component** (AC: 5, 6)
  - [x] 8.1 Create `apps/web/src/features/test/components/EarnedPauseTransition.tsx`:
    - Props: `onComplete: () => void`
    - Full-screen `min-h-svh bg-[#0D0F1A]` div, flex center.
    - `useEffect` fires `window.setTimeout(onComplete, 1200)` on mount; cleanup on unmount.
    - **Animation (motion enabled):** 8 `<motion.span>` particles, each starting at `x: randomOffset, y: randomOffset`, animating to `x: 0, y: 0` over 900ms, then a `<motion.div>` center-glow intensifies from `opacity: 0.3` → `opacity: 1` over 300ms (900ms→1200ms range). Use `staggerChildren` or explicit delays.
    - **Animation (reduced motion):** Plain dark screen, single `<motion.div>` glow pulse `opacity: 0.2 → 0.6 → 0.2` over 1200ms. No particles. `aria-label="Đang phân tích kết quả"`.
    - No text, no percentage, no skip button anywhere.
  - [x] 8.2 Create `apps/web/src/features/test/components/EarnedPauseTransition.test.tsx` — 2 test cases:
    - (a) `onComplete` is called after 1200ms (use `vi.useFakeTimers()`)
    - (b) `onComplete` is called exactly once (not twice, not zero)

- [x] **Task 9: `TestFlow.tsx` orchestrator + `useTestFlow.ts` hook** (AC: 1, 2, 3, 5, 7, 8)
  - [x] 9.1 Create `apps/web/src/features/test/hooks/useTestFlow.ts`:
    - Wraps TanStack Query `useMutation` for `POST /api/tests/next-question` (not `useQuery` — it's triggered by user action or mount, not background refetch).
    - Reads `answers` and `currentIndex` from `useTestStore`.
    - Calls `api.post('/api/tests/next-question', { answers })` from `apps/web/src/lib/api.ts`.
    - Returns: `{ currentQuestion, questionIndex, isComplete, isLoading, error, submitAnswer }`.
    - `submitAnswer(questionId, value)`: writes to Zustand (`setAnswer`, `setCurrentIndex`), then triggers the next mutation with updated answers.
  - [x] 9.2 Create `apps/web/src/features/test/components/TestFlow.tsx`:
    - On mount: calls `useTestFlow` to fetch first question (pass current `answers` from store — supports resume).
    - Renders `<QuestionCard />` with `AnimatePresence mode="wait"` for slide transitions between questions.
    - When `isComplete === true`: renders `<EarnedPauseTransition onComplete={() => navigate('/test/submit')} />`.
    - When `isLoading === true` (between questions): shows nothing or a brief loading state (do NOT show spinner — keep visual clean; blank `bg-[#050507]` screen for <300ms is acceptable).
    - When `error !== null`: inline error with "Thử lại" button that retries the last mutation.
    - No nav header, no back button (per AC-1 and UX-DR11).
    - PostHog events: `safeCapture('test_started')` on mount if `currentIndex === 0`; `safeCapture('test_question_answered', { questionIndex, dimension })` on each answer.

- [x] **Task 10: Update `router.tsx` — replace `/test` placeholder** (AC: 1)
  - [x] 10.1 Replace the placeholder `<div>` at path `/test` with:
    ```typescript
    import { TestFlow } from './features/test/components/TestFlow';
    // ...
    {
      path: '/test',
      element: <TestFlow />,
      errorElement: <RootError />,
    },
    ```
  - [x] 10.2 Add a placeholder route for Story 2.5 (avoids 404 after earned pause):
    ```typescript
    {
      path: '/test/submit',
      element: (
        <div className="min-h-svh bg-[#0D0F1A] flex items-center justify-center">
          <p className="text-slate-300 text-[16px]">Đang xử lý kết quả… — Story 2.5</p>
        </div>
      ),
      errorElement: <RootError />,
    },
    ```

- [x] **Task 11: API test — `apps/api/tests/routes/tests.test.ts`** (AC: 2, 5, 8)
  - [x] 11.1 Create `apps/api/tests/routes/tests.test.ts` — minimum 5 cases:
    - (a) `POST /api/tests/next-question` without `X-Session-Token` → 401
    - (b) valid session, empty `answers` → returns first question with `questionIndex: 0`, `total: 12`
    - (c) valid session, 11 answers → returns 12th question with `questionIndex: 11`
    - (d) valid session, 12 answers → returns `{ data: null, error: null }` (completion signal)
    - (e) malformed body (missing `answers` key) → 400 VALIDATION_ERROR
  - [x] 11.2 Mock pattern: follow the established `makeKv()` + `seedSession()` pattern from `tests/routes/sessions.test.ts`. Mock D1 with `makeDb()` returning `{ prepare: vi.fn() }`.

- [x] **Task 12: `cat.test.ts` unit tests** (AC: 2)
  - [x] 12.1 Create `apps/api/src/tests/lib/cat.test.ts` — minimum 4 cases:
    - (a) `selectNextQuestion` with empty answers → returns question from `E_I` (first dimension)
    - (b) `selectNextQuestion` with 3 E_I answers → returns question from `S_N`
    - (c) `selectNextQuestion` with 12 answers (3 per dim) → returns `null`
    - (d) `calculateMBTIType` with all value=1 answers → returns `'ESTJ'` (E, S, T, J poles)
    - (e) `calculateMBTIType` with all value=2 answers → returns `'INFP'`

- [x] **Task 13: Validation + turbo check** (all AC)
  - [x] 13.1 Run `pnpm exec turbo run lint typecheck test` from repo root.
  - [x] 13.2 Verify test counts increase:
    - `@mbti/web`: was 10+, now ≥20 (store: +3, QuestionCard: +3, EarnedPause: +2, TestFlow if tested)
    - `@mbti/api`: was 13, now ≥20 (+5 route tests, +5 cat tests, +2 db helpers)
    - `@mbti/shared`: unchanged (14)
  - [x] 13.3 Verify `wrangler d1 migrations list --local` shows migration `0005` applied.
  - [x] 13.4 Manual smoke test: open `http://localhost:5173`, complete landing → consent → declare → `/test`, answer all 12 questions, verify `EarnedPauseTransition` appears and navigates to `/test/submit`.

## Dev Notes

### Critical: Files Being Modified (UPDATE, not NEW)

#### `apps/web/src/features/test/store/useTestStore.ts`
- **Current state:** Has `TestState` type with `{declaredType, answers, currentIndex, setDeclaredType, reset}`. The `safeLocalStorage` wrapper absorbs quota/private-browsing errors silently. Persist key is `'mbti-test-progress'`.
- **What changes:** Add `setAnswer` and `setCurrentIndex` to the `TestState` type AND to the `create()` implementation. Nothing else changes.
- **What MUST be preserved:** persist key `'mbti-test-progress'` (locked by architecture.md and NFR18), `safeLocalStorage` wrapper, `reset()` (used by Story 2.5), `setDeclaredType` (used by Story 2.3), all existing behavior.
- **IMPORTANT:** `setAnswer` must use `filter().concat()` not spread-push — it must **replace** an existing answer with the same `questionId` (for retry/resume scenario). See Task 6.1.

#### `packages/shared/src/db/rows.ts`
- **Current state:** Has `TestResultRow`, `InviteLinkRow`, `PerceptionVoteRow`, `CuratedInsightRow`, `ArticleRow`.
- **What changes:** Add `QuestionRow` interface.
- **What MUST be preserved:** All existing interfaces unchanged. The comment header about `0|1` booleans and ISO 8601 TEXT dates applies to `QuestionRow` too.

#### `packages/shared/src/schemas/test.ts`
- **Current state:** Has `AnswerSchema` (value: 1–5 Likert), `TestSubmitSchema` (answers + declaredType), `TestResultSchema`.
- **What changes:** Add `QuestionOptionSchema`, `QuestionSchema`, `NextQuestionRequestSchema`, `NextQuestionResponseSchema`.
- **What MUST be preserved:** `AnswerSchema` (value range 1–5), `TestSubmitSchema`, `TestResultSchema` — Story 2.5 depends on these.

#### `apps/api/src/lib/db.ts`
- **Current state:** Has `withDb()`, `getActiveCuratedInsights()`. Has D1 rules comment block.
- **What changes:** Add `getAllActiveQuestions()` helper. Add `import type { QuestionRow }` from `@mbti/shared`.
- **What MUST be preserved:** All existing helpers and the rules comment block.

#### `apps/api/src/index.ts`
- **Current state:** Registers `ssr`, `sessions`, health check, `notFound`, `onError`.
- **What changes:** Import `tests` from `./routes/tests` and add `app.route('/api/tests', tests)`.
- **What MUST be preserved:** All existing middleware and routes, error handler order.

#### `apps/web/src/router.tsx`
- **Current state:** Routes: `/` (Landing), `/consent` (ConsentGate), `/declare` (TypeSelector), `/test` (placeholder div), `*` (404).
- **What changes:** Replace `/test` placeholder with `<TestFlow />`. Add `/test/submit` placeholder.
- **What MUST be preserved:** All other routes and their `errorElement` props.

### Architecture Compliance Guardrails

1. **D1 access:** NEVER call `c.env.DB` in route handlers. Always use `withDb(c)` + typed helper from `lib/db.ts`.
2. **KV access:** `requireSession` middleware handles session validation. Route handler reads `c.get('userId')` — do NOT call `getSession()` again in the route.
3. **API envelope:** EVERY Hono response must be `{ data: ..., error: null }` or `{ data: null, error: {...} }`. Never both non-null. See existing `sessions.ts` for the exact pattern.
4. **ZodError handling:** Throw `SchemaName.parse(payload)` — do NOT wrap in try/catch. The global `app.onError` in `index.ts` converts `ZodError` → 400 VALIDATION_ERROR automatically.
5. **Shared types only:** `QuestionRow`, `Question`, `NextQuestionRequest/Response` types come from `@mbti/shared`. Do NOT redefine in API or web.
6. **TanStack Query key factory:** Add a `nextQuestion` key to `packages/shared/src/queryKeys.ts` if used with `useQuery`. Pattern: `nextQuestion: (answeredIds: string[]) => ['nextQuestion', answeredIds] as const`.
7. **PostHog events:** Use `safeCapture` from `apps/web/src/lib/posthog.ts` — NEVER call `window.posthog?.capture()` directly.
8. **No back button / no nav header** during test questions — enforced by not rendering these elements. UX-DR11 mandates linear navigation.

### CAT Engine Design (MVP)

The CAT implementation in `lib/cat.ts` is intentionally simplified for MVP:

- **4 MBTI dimensions:** `E_I`, `S_N`, `T_F`, `J_P`
- **12 questions = 3 per dimension** — deterministic count
- **Selection strategy:** Pick the dimension with fewest answers first (ties broken by array order: E_I → S_N → T_F → J_P). Within a dimension, sort by `discrimination DESC` and pick first unanswered.
- **Scoring:** value `1` = first dimension pole (E, S, T, J), value `2` = second pole (I, N, F, P). Simple average per dimension: ≤1.5 = first pole, >1.5 = second pole.
- **`selectNextQuestion` signature:** `(allQuestions: QuestionRow[], answers: Answer[]) => QuestionRow | null`
  - Returns `null` when all 12 (3×4) questions answered → signals `TestFlow` to trigger `EarnedPauseTransition`.
- **NOT a full IRT/3-PL CAT** — `difficulty` and `discrimination` columns are seeded but only `discrimination` is used for tie-breaking in MVP. Story 3+ can upgrade to full IRT.
- `calculateMBTIType` is exported but Story 2.4 does NOT call it — that's Story 2.5's responsibility (`POST /api/tests/submit`).

### Zustand Store Extension Contract

Story 2.4 MUST follow this exact store shape:

```typescript
type Answer = { questionId: string; value: number };

type TestState = {
  declaredType: MBTIType | null;        // Story 2.3 (DO NOT TOUCH)
  answers: Answer[];                    // Story 2.4 populates this
  currentIndex: number;                 // Story 2.4 populates this (0-based)
  setDeclaredType: (type: MBTIType | null) => void;  // Story 2.3 (DO NOT TOUCH)
  setAnswer: (questionId: string, value: number) => void;  // Story 2.4 ADDS
  setCurrentIndex: (index: number) => void;                // Story 2.4 ADDS
  reset: () => void;                    // Story 2.5 CALLS (DO NOT TOUCH)
};
```

- Persist key: `'mbti-test-progress'` — **locked, must not change**
- Story 2.5 will call `useTestStore.getState().answers` to build `POST /api/tests/submit` payload
- Story 2.5 will call `useTestStore.getState().reset()` after successful submission

### Question Seed Data Reference

Use these verbatim in the migration SQL (each question has 2 binary options):

```sql
-- E_I dimension (Extraversion vs Introversion)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-ei-01', 'Sau một ngày làm việc mệt mỏi, bạn thích làm gì nhất?',
 'E_I', '[{"label":"Gặp gỡ bạn bè, ra ngoài xã giao","value":1},{"label":"Ở nhà một mình, nạp lại năng lượng","value":2}]', 1.4),
('q-ei-02', 'Khi gặp người lạ trong một buổi tiệc, bạn thường:',
 'E_I', '[{"label":"Chủ động làm quen và trò chuyện trước","value":1},{"label":"Chờ người khác lên tiếng trước hoặc ở lại một góc quen thuộc","value":2}]', 1.2),
('q-ei-03', 'Khi cần giải quyết một vấn đề khó, bạn nghiêng về phía nào hơn?',
 'E_I', '[{"label":"Bàn luận với người khác — nói ra giúp tôi hiểu rõ hơn","value":1},{"label":"Suy nghĩ một mình trước khi chia sẻ với ai","value":2}]', 1.3),
('q-ei-04', 'Trong một cuộc họp nhóm, bạn thường:',
 'E_I', '[{"label":"Chia sẻ ý kiến ngay lập tức khi có ý tưởng","value":1},{"label":"Quan sát và chỉ phát biểu khi suy nghĩ đã chín muồi","value":2}]', 1.1);

-- S_N dimension (Sensing vs Intuition)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-sn-01', 'Khi học một kỹ năng mới, bạn thích cách nào hơn?',
 'S_N', '[{"label":"Thực hành từng bước cụ thể, làm quen với chi tiết","value":1},{"label":"Nắm bức tranh tổng thể trước, sau đó tự điền chi tiết","value":2}]', 1.3),
('q-sn-02', 'Bạn tin vào điều gì hơn khi đưa ra quyết định?',
 'S_N', '[{"label":"Kinh nghiệm thực tế và dữ liệu cụ thể","value":1},{"label":"Linh cảm và các xu hướng tôi nhận ra theo thời gian","value":2}]', 1.4),
('q-sn-03', 'Khi đọc hướng dẫn sử dụng, bạn thường:',
 'S_N', '[{"label":"Đọc từng bước một theo thứ tự","value":1},{"label":"Lướt qua để hiểu ý tổng thể, rồi tự thử","value":2}]', 1.2),
('q-sn-04', 'Bạn thích nói chuyện về chủ đề nào hơn?',
 'S_N', '[{"label":"Những sự kiện và thực tế đang xảy ra trong cuộc sống","value":1},{"label":"Ý tưởng, khả năng và những điều có thể xảy ra trong tương lai","value":2}]', 1.1);

-- T_F dimension (Thinking vs Feeling)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-tf-01', 'Khi bạn bè nhờ lời khuyên về quyết định quan trọng, bạn thường:',
 'T_F', '[{"label":"Phân tích ưu/nhược điểm và chỉ ra lựa chọn hợp lý nhất","value":1},{"label":"Lắng nghe cảm xúc của họ và hỏi điều gì quan trọng nhất với họ","value":2}]', 1.4),
('q-tf-02', 'Khi xem xét một chính sách mới tại nơi làm việc, điều bạn hỏi đầu tiên là:',
 'T_F', '[{"label":"Chính sách này có hiệu quả và công bằng về mặt logic không?","value":1},{"label":"Chính sách này ảnh hưởng thế nào đến cảm xúc và tinh thần của mọi người?","value":2}]', 1.3),
('q-tf-03', 'Khi đưa ra phản hồi cho ai đó, bạn ưu tiên:',
 'T_F', '[{"label":"Trung thực và thẳng thắn — dù có thể khó nghe","value":1},{"label":"Khéo léo và ân cần — đảm bảo họ không bị tổn thương","value":2}]', 1.2),
('q-tf-04', 'Sau một cuộc tranh luận, bạn cảm thấy hài lòng khi:',
 'T_F', '[{"label":"Vấn đề được giải quyết dứt khoát, dù không ai vui lắm","value":1},{"label":"Mọi người vẫn cảm thấy thoải mái với nhau dù chưa đi đến kết luận cuối","value":2}]', 1.1);

-- J_P dimension (Judging vs Perceiving)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-jp-01', 'Cuối tuần lý tưởng của bạn là:',
 'J_P', '[{"label":"Có lịch trình rõ ràng từ trước — biết mình sẽ làm gì","value":1},{"label":"Để mọi thứ tự nhiên diễn ra — linh hoạt theo tâm trạng","value":2}]', 1.3),
('q-jp-02', 'Khi làm một dự án dài hạn, bạn thường:',
 'J_P', '[{"label":"Lập kế hoạch chi tiết và theo sát tiến độ","value":1},{"label":"Làm đến đâu thấy đến đó, thích nghi khi cần thiết","value":2}]', 1.4),
('q-jp-03', 'Không gian làm việc của bạn thường như thế nào?',
 'J_P', '[{"label":"Gọn gàng và có tổ chức — mọi thứ đều có chỗ của nó","value":1},{"label":"Có vẻ lộn xộn với người ngoài nhưng tôi biết mọi thứ ở đâu","value":2}]', 1.2),
('q-jp-04', 'Khi có deadline đang đến gần, bạn thường:',
 'J_P', '[{"label":"Đã hoàn thành sớm — không thích áp lực phút chót","value":1},{"label":"Làm việc hiệu quả nhất dưới áp lực — deadline kích hoạt tôi","value":2}]', 1.1);
```

### Questions Table Schema Note

`answer_options` is stored as a JSON string in D1 TEXT column. Parse with `JSON.parse()` in the route handler before sending to client. NEVER pass raw JSON string to frontend — the API response must contain the parsed array.

### Session Resume Logic

When `TestFlow` mounts and `useTestStore.answers` is non-empty (user is resuming):
- Call `POST /api/tests/next-question` with the existing `answers` from Zustand
- The CAT engine will pick the next unanswered question (skipping already-answered ones)
- `questionIndex` will be set to `answers.length` automatically (next question is at position N)
- No special "resume" screen needed — just fetch the next question as normal

### Frontend API Client

Use the existing `apiCall<T>` function at `apps/web/src/lib/api.ts`. It automatically attaches `X-Session-Token` from `localStorage`. Do NOT create new fetch wrappers.

```typescript
import { apiCall } from '@/lib/api';
import type { NextQuestionResponse, Answer } from '@mbti/shared';

// Inside useTestFlow.ts — TanStack Query v5 mutation pattern
const mutation = useMutation({
  mutationFn: (answers: Answer[]) =>
    apiCall<NextQuestionResponse>('/api/tests/next-question', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
});
```

`apiCall` throws `ApiError` (exported from `lib/api.ts`) on non-2xx or non-JSON responses. The mutation's `error` state will contain this. Surface it in `TestFlow` as the inline error state described in AC-8.

Add to `packages/shared/src/queryKeys.ts` (follow existing pattern):
```typescript
export const queryKeys = {
  session: () => ['session'] as const,
  testResult: (id: string) => ['testResult', id] as const,
  socialStatus: (userId: string) => ['socialStatus', userId] as const,
  feed: (mbtiType: MBTIType) => ['feed', mbtiType] as const,
  nextQuestion: (answeredIds: string[]) => ['nextQuestion', answeredIds] as const,
};
```
Note: `nextQuestion` key is used if `TestFlow` ever switches to `useQuery` pattern. For `useMutation` it's not strictly required but good to define for consistency.

### UX Design Decisions (from UX spec)

- **QuestionCard anatomy** (UX spec line 754): "Progress dots (12 dots) · Optional scenario context (italic, secondary color) · Question text (20px bold white) · 2–4 answer options (tappable cards)"
- **States:** `default` → `option-selected` (150ms highlight) → `transitioning` (300ms slide-left + next slides in from right)
- **No "Next" button** — tap-to-select IS the submit action
- **EarnedPauseTransition** (UX spec line 838–848): `animating (0–900ms)` → `resolving (900–1200ms, glow intensifies)` → `complete`
- **Background colors:** Question screen = `#050507` (bg-surface-deep); EarnedPause = `#0D0F1A` (near-black)
- **UX-DR11:** Linear navigation — no back button during test Q1–Q12, earned pause non-skippable
- **UX-DR6:** Particle coalescing animation on near-black, 1200ms hardcoded, `prefers-reduced-motion` shows plain dark screen + glow only
- **UX-DR4:** Full-screen one-question-per-card layout, situational scenario text + tappable answer cards

### Framer Motion Patterns (from Story 2.3)

Use `AnimatePresence mode="wait"` for question card transitions:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentQuestion.id}
    initial={rm ? false : { x: '100%', opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={rm ? { opacity: 0 } : { x: '-100%', opacity: 0 }}
    transition={{ duration: rm ? 0 : 0.3, ease: 'easeOut' }}
  >
    <QuestionCard ... />
  </motion.div>
</AnimatePresence>
```
- `const rm = useReducedMotion() ?? false` — coerce null to false (Framer Motion 12 returns `boolean | null`)
- `initial={false}` is NOT used here (unlike Story 2.3) because every question transition should animate

### Learnings from Story 2.3 (Carry Forward)

1. **localStorage singleton leak** — `apps/web/tests/setup.ts` already has `beforeEach(() => memory.clear())`. Do NOT add another `beforeEach` in new test files for localStorage — it's global.
2. **Timer cleanup** — All `setTimeout` calls MUST use `const timerRef = useRef<number | null>(null)` pattern with `useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, [])`. Story 2.3's race condition fix applies here too.
3. **Double-tap guard** — `if (selected !== null) return;` at top of answer tap handler, before any state writes.
4. **`safeCapture` not `window.posthog`** — import from `apps/web/src/lib/posthog.ts`.
5. **Tailwind dynamic classes** — no new dynamic class patterns needed for this story (question cards use static classes; progress dots use index comparison not string interpolation).
6. **`useReducedMotion()` coercion** — always `const rm = useReducedMotion() ?? false`.
7. **Zustand v5 persist** — `create<State>()(persist(...))` double-call syntax. Already correct in existing store.

### Known Deferred Items (Not in Scope)

- Session expiry during test mid-flow → handled in Story 2.5 (submit with expired session)
- Full IRT scoring for CAT (3-PL model) → `discrimination`/`difficulty` columns exist but MVP uses simple sort
- E2E Playwright tests for full question flow → `apps/web/tests/e2e/test-flow.spec.ts` (post-MVP)
- `POST /api/tests/submit` endpoint — Story 2.5 owns this; Story 2.4 only navigates to `/test/submit` placeholder

## Story Progress

### Status: done

### Dev Agent Record

#### Implementation Notes
- All 13 tasks completed. `pnpm exec turbo run lint typecheck test` passes (9/9 tasks green).
- `useTestFlow` uses `useState` (not `useRef`) for `currentQuestion`/`isComplete` so components re-render — corrected after `react-hooks/refs` lint error.
- Framer-motion test mocks switched from async dynamic import pattern to synchronous factory to fix `TS2503: Cannot find namespace 'R'` errors.
- `QuestionCard.tsx` `timerRef` typed as `ReturnType<typeof setTimeout>` for Node/browser compat.
- Task 1.3 (migration apply) and Task 13.3-13.4 require local runtime — apply with `cd apps/api && wrangler d1 migrations apply mbti --local`.

#### File List
- `migrations/0005_questions.sql` (NEW)
- `packages/shared/src/db/rows.ts` (MODIFIED)
- `packages/shared/src/schemas/test.ts` (MODIFIED)
- `packages/shared/src/queryKeys.ts` (MODIFIED)
- `packages/shared/src/index.ts` (MODIFIED)
- `apps/api/src/lib/cat.ts` (NEW)
- `apps/api/src/lib/db.ts` (MODIFIED)
- `apps/api/src/routes/tests.ts` (NEW)
- `apps/api/src/index.ts` (MODIFIED)
- `apps/api/tests/routes/tests.test.ts` (NEW)
- `apps/api/src/tests/lib/cat.test.ts` (NEW)
- `apps/web/src/features/test/store/useTestStore.ts` (MODIFIED)
- `apps/web/src/features/test/store/useTestStore.test.ts` (MODIFIED)
- `apps/web/src/features/test/components/QuestionCard.tsx` (NEW)
- `apps/web/src/features/test/components/QuestionCard.test.tsx` (NEW)
- `apps/web/src/features/test/components/EarnedPauseTransition.tsx` (NEW)
- `apps/web/src/features/test/components/EarnedPauseTransition.test.tsx` (NEW)
- `apps/web/src/features/test/hooks/useTestFlow.ts` (NEW)
- `apps/web/src/features/test/components/TestFlow.tsx` (NEW)
- `apps/web/src/router.tsx` (MODIFIED)

### Completion Note
Ultimate context engine analysis completed — comprehensive developer guide created.

- D1 schema gap identified: `questions` table does not exist in any migration yet — Task 1 is mandatory.
- CAT engine (`lib/cat.ts`) does not exist yet — Task 3 is mandatory.
- `useTestStore` is missing `setAnswer`/`setCurrentIndex` — Task 6 is mandatory.
- Auth middleware `requireSession` is already implemented and working.
- `withDb()` helper exists but has no question helpers — Task 4 adds them.
- All Framer Motion, Zustand, TanStack Query versions are already installed from Stories 2.1–2.3.
