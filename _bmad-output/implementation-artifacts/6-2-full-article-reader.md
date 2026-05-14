# Story 6.2: Full Article Reader

Status: done

## Story
As a user who tapped an article card, I want to read the full article within the platform.

## ACs
1. `GET /api/content/articles/:slug` returns full article via `getArticleBySlug(db, slug)`. Public, no auth.
2. `ArticleContent` component renders h1 + body (≥16px Inter, 1.6 line-height) + read time + type tag.
3. Back button navigates back via React Router history.

## Tasks
- D1 helper `getArticleBySlug`.
- Route handler.
- Web `ArticlePage.tsx` at `/feed/:slug`.
- Tests.

## Refs
- `epics.md:884-895`.

## Dev Agent Record

### Agent Model Used
claude-opus-4-7[1m]

### Completion Notes

- `GET /api/content/articles/:slug` returns full body, read-time, type tag (built alongside 6-1).
- `ArticlePage` at `/feed/:slug` renders full article with prose styling, back button via `navigate(-1)`.
- Body is plain text in v1 (placeholder seed). Future story can introduce MDX or HTML body rendering.

### File List

**Created:**
- `apps/web/src/features/feed/components/ArticlePage.tsx` (route registered in `router.tsx` under 6-1)
