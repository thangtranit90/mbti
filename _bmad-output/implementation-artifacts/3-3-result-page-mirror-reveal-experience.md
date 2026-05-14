# Story 3.3: Result Page — Mirror Reveal Experience

Status: done

## Story

As a user arriving at my result page,
I want to experience a cinematic reveal sequence with the reverse mechanic comparison visible,
so that I pause and absorb the result rather than skim it, triggering the share impulse.

## Acceptance Criteria

**AC1:** Beat 1 (0ms, 600ms fade) persona name; Beat 2 (800ms, 400ms slide-up+fade) insight; Beat 3 (1400ms, 300ms fade) type code; chevron pulses at 2000ms — preserved from Stories 3.1/3.2.

**AC2:** Below scroll fold, `ReverseReveal` shows declared type vs calculated type side-by-side (FR13). If `declaredType === calculatedType`, copy celebrates confirmation ("Bạn đã đúng — bạn là {persona}"). If different, copy frames it as discovery ("Bạn nghĩ mình là {declared} — nhưng bạn thực sự là {calculated}"). When `declaredType === null`, the section is hidden entirely.

**AC3:** `prefers-reduced-motion` → all beats render immediately, no delays; `ReverseReveal` renders without animations.

**AC4:** Result text is in the DOM from initial render — screen readers receive content immediately; reveal is purely visual.

## Tasks / Subtasks

- [x] Task 1 — Create `apps/web/src/features/result/components/ReverseReveal.tsx` (AC: 2, 3)
  - [x] 1.1 Props: `declaredType: MBTIType | null`, `calculatedType: MBTIType`, `personaName: string`
  - [x] 1.2 If `declaredType === null` → return null (hidden)
  - [x] 1.3 If `declaredType === calculatedType` → confirmation card with persona name + celebration copy
  - [x] 1.4 If different → side-by-side two-card layout: declared (left, dimmed/strikethrough), calculated (right, type-color highlighted)
  - [x] 1.5 Framer Motion: enter at 2400ms delay (after VillainsSection at 2200ms), 300ms fade
  - [x] 1.6 `useReducedMotion()` honored

- [x] Task 2 — Wire `ReverseReveal` into PersonaReveal scrollable area (AC: 2)
  - [x] 2.1 Add `declaredType: MBTIType | null` to `PersonaReveal` props
  - [x] 2.2 Render `<ReverseReveal>` below `<VillainsSection>` in the scroll area

- [x] Task 3 — Update `ResultPage.tsx` to pass `declaredType` (AC: 2)
  - [x] 3.1 Pass `result.declaredType` to `<PersonaReveal>` (already available from test result API)

- [x] Task 4 — Verify Beat 1–4 + chevron timing unchanged from Stories 3.1/3.2 (AC: 1)
  - [x] 4.1 Manual visual check: animation timings match spec

- [x] Task 5 — Tests (AC: 2, 3)
  - [x] 5.1 `ReverseReveal.test.tsx` — renders nothing when `declaredType === null`
  - [x] 5.2 Renders confirmation card when `declaredType === calculatedType`
  - [x] 5.3 Renders comparison card when declared ≠ calculated

## Dev Notes

- `result.declaredType` already exists on `ResultApiResponse` from Story 2.5; no new API needed.
- ReverseReveal lives in the scrollable area below VillainsSection — same pattern as VillainsSection (motion.section, fade-in).
- Tailwind safelist for `text-type-{type}` and `bg-type-{type}` already covered by PersonaReveal comments — no new safelist needed.

## Dev Agent Record

### Completion Notes

- Created `ReverseReveal.tsx` with 3 states: hidden (declaredType null), confirmation card (match), comparison card (mismatch).
- Beat timing in PersonaReveal preserved exactly (0/800/1200/1400/2000ms); ReverseReveal fades in at 2400ms after VillainsSection (2200ms).
- `useReducedMotion()` honored — sets initial opacity to 1 and y to 0 when reduced motion active.
- ResultPage now passes `result.declaredType` to PersonaReveal.
- 3 new tests in `ReverseReveal.test.tsx` cover all 3 states. Full regression green: 26 web tests pass.

### File List

**Modified:**
- `apps/web/src/features/result/components/PersonaReveal.tsx` (added `declaredType` prop + ReverseReveal in scroll area)
- `apps/web/src/features/result/components/ResultPage.tsx` (passes `result.declaredType` to PersonaReveal)

**Created:**
- `apps/web/src/features/result/components/ReverseReveal.tsx`
- `apps/web/src/features/result/components/ReverseReveal.test.tsx`

## Change Log

| Date | Change |
|---|---|
