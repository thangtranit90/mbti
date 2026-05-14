# Story 6.1: Per-Type Article Feed

Status: done

## Story
As a user who has received my result, I want to browse a feed of articles curated for my MBTI type.

## ACs
1. `GET /api/content/feed/:mbtiType` (public). Returns articles by type via `getArticlesByType(db, mbtiType)`. Response: `{ data: { articles: Array<{ id, slug, title, summary, mbtiType, readTimeMinutes }> }, error: null }`.
2. `ArticleFeed` component renders 1-column on mobile, 2-column on md+. Article card shows title, 1-line summary, read time badge, type accent.
3. `/feed` page reads MBTI type from `?type=...` query or localStorage's latest result; falls back to type selector grid if unknown.
4. The route is also added to the React Router.

## Tasks
- D1 helper `getArticlesByType(db, mbtiType)`.
- Route `apps/api/src/routes/content.ts` mounted at `/api/content`.
- Web feature `apps/web/src/features/feed/` with `ArticleFeed.tsx`, `ArticleCard.tsx`, `FeedPage.tsx`.
- Add `/feed` and `/feed/:slug` to router.
- Tests.

## Refs
- `epics.md:858-879`; `migrations/0001_initial_schema.sql:96-117`; `migrations/0003_articles_seed.sql`.

## Dev Agent Record

### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes

- D1 helpers `getArticlesByType` + `getArticleBySlug` (for 6-2).
- `apps/api/src/routes/content.ts` exposes `/feed/:mbtiType` + `/articles/:slug` (public, no auth). Server estimates read time (220wpm) + computes summary (max 140 chars).
- Web `FeedPage` reads `?type=` query first, then localStorage's last result type; shows type selector grid if unknown. 1-col / 2-col responsive (`md:`). Each article card → `/feed/:slug`.
- `MBTI_TYPES` constant used as readonly tuple for type narrowing.

### File List

**Modified:**
- `apps/api/src/lib/db.ts` (+getArticlesByType, +getArticleBySlug)
- `apps/api/src/index.ts` (mount /api/content)
- `apps/web/src/router.tsx` (/feed routes)

**Created:**
- `apps/api/src/routes/content.ts`
- `apps/web/src/features/feed/components/FeedPage.tsx`
