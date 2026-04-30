# Story 1.2: React SPA with Vite and Cloudflare Pages Adapter

Status: done

## Story

As a developer,
I want `apps/web` configured with Tailwind CSS v4, shadcn/ui, React Router v7 (library mode), Framer Motion, PWA manifest, and self-hosted fonts,
so that the frontend design system foundation is ready for feature development and builds correctly for Cloudflare Pages.

## Acceptance Criteria

1. **AC-1: Tailwind + placeholder page** — `pnpm dev` starts the Vite dev server; navigating to the local URL renders a placeholder landing page with Tailwind styles applied and zero console errors.

2. **AC-2: Cloudflare Pages-compatible build** — `pnpm build` on `apps/web` produces output in `dist/` that is Cloudflare Pages-compatible (static assets, no Node.js-only API usage). No build errors.

3. **AC-3: shadcn/ui working** — After `npx shadcn@latest add button`, the Button component installs into `src/components/ui/` and renders correctly with Tailwind styles.

4. **AC-4: Required files committed** — The following are present and functional:
   - `public/manifest.json` (PWA manifest: `display: standalone`, `theme_color: #050507`)
   - `public/fonts/` directory (placeholder for Clash Display + Inter)
   - `src/router.tsx` (React Router v7 route definitions with `createBrowserRouter`)
   - `src/main.tsx` (app entry with RouterProvider)
   - `@/*` import alias configured in `vite.config.ts` and `tsconfig.app.json`

## Tasks / Subtasks

- [x] Task 1: Install and configure Tailwind CSS v4 (AC: 1, 2)
  - [x] 1.1 Install `tailwindcss` and `@tailwindcss/vite` as dependencies in `apps/web`
  - [x] 1.2 Add `tailwindcss()` plugin to `vite.config.ts` (alongside existing `react()` plugin)
  - [x] 1.3 Replace `src/index.css` content with `@import "tailwindcss";`
  - [x] 1.4 Delete `src/App.css` (no longer needed — all styling via Tailwind utilities)
  - [x] 1.5 Verify Tailwind classes render correctly in the browser

- [x] Task 2: Initialize shadcn/ui (AC: 3)
  - [x] 2.1 Run `pnpm dlx shadcn@latest init` inside `apps/web` — select default style, CSS variables, and `@/components` alias
  - [x] 2.2 Verify `components.json` is created at `apps/web/components.json`
  - [x] 2.3 Run `pnpm dlx shadcn@latest add button` to install the Button component
  - [x] 2.4 Verify `src/components/ui/button.tsx` exists and exports correctly
  - [x] 2.5 Import and render `<Button>` in placeholder page to confirm it works with Tailwind

- [x] Task 3: Install and configure React Router v7 — library mode (AC: 4)
  - [x] 3.1 Install `react-router` in `apps/web`
  - [x] 3.2 Create `src/router.tsx` with `createBrowserRouter` defining initial routes: `/` (placeholder landing), `*` (404 catch-all)
  - [x] 3.3 Update `src/main.tsx` to use `<RouterProvider router={router} />` instead of rendering `<App />` directly
  - [x] 3.4 Verify client-side navigation works between routes

- [x] Task 4: Install Framer Motion (AC: 1)
  - [x] 4.1 Install `framer-motion` in `apps/web`
  - [x] 4.2 Verify import `{ motion } from 'framer-motion'` resolves without errors in a test render

- [x] Task 5: PWA manifest and fonts directory (AC: 4)
  - [x] 5.1 Create `public/manifest.json` with: `display: standalone`, `orientation: portrait`, `theme_color: #050507`, `background_color: #050507`, `name: "MBTI Platform"`, `short_name: "MBTI"`, `start_url: "/"`
  - [x] 5.2 Add `<link rel="manifest" href="/manifest.json">` to `index.html`
  - [x] 5.3 Update `index.html`: set `lang="vi"`, add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, add `<meta name="theme-color" content="#050507">`
  - [x] 5.4 Create `public/fonts/` directory with a `.gitkeep` file (actual font files added when sourced)

- [x] Task 6: Update tsconfig paths for `@/*` alias (AC: 4)
  - [x] 6.1 Add `"paths": { "@/*": ["./src/*"] }` to `compilerOptions` in `tsconfig.app.json`
  - [x] 6.2 Verify `@/*` alias resolves in both Vite (already configured) and TypeScript

- [x] Task 7: Create placeholder landing page with Tailwind (AC: 1)
  - [x] 7.1 Replace `src/App.tsx` with a minimal placeholder page using Tailwind classes: dark background (`bg-[#0D0F1A]`), white text, centered layout, "MBTI Platform" heading, and the shadcn Button component
  - [x] 7.2 Remove unused `src/assets/` directory from Vite scaffold
  - [x] 7.3 Verify `pnpm dev` renders the placeholder with correct Tailwind styling and zero console errors

- [x] Task 8: Verify all ACs (AC: 1, 2, 3, 4)
  - [x] 8.1 `pnpm dev` — Vite starts, placeholder page renders with Tailwind styles, no console errors
  - [x] 8.2 `pnpm build` — `apps/web` builds to `dist/` with no errors, no Node.js-only APIs
  - [x] 8.3 `pnpm lint && pnpm typecheck` — zero errors across all packages
  - [x] 8.4 Verify `public/manifest.json`, `public/fonts/`, `src/router.tsx`, `src/main.tsx` all exist
  - [x] 8.5 Verify shadcn Button renders correctly on the placeholder page

### Review Findings

- [x] [Review][Patch] Missing `public/_redirects` for Cloudflare Pages SPA fallback — direct URL navigation to any route other than `/` returns 404 from CDN [apps/web/public/_redirects]
- [x] [Review][Patch] Missing `DOM.Iterable` in tsconfig.app.json lib — needed for `for...of` on NodeList, FormData, URLSearchParams [apps/web/tsconfig.app.json:5]
- [x] [Review][Patch] `shadcn` CLI listed as runtime dependency — should be devDependency or removed [apps/web/package.json]
- [x] [Review][Defer] PWA manifest has empty `icons` array — installability will fail [apps/web/public/manifest.json] — deferred, icons added when design assets are ready
- [x] [Review][Defer] No React Error Boundary or `errorElement` on routes [apps/web/src/router.tsx] — deferred, belongs to Story 2.1 when real pages are built
- [x] [Review][Defer] Hardcoded hex colors bypass theme system + theme_color mismatch between manifest (#050507) and app bg (#0D0F1A) [apps/web/src/App.tsx, router.tsx] — deferred, design tokens story
- [x] [Review][Defer] PWA manifest missing `description`, `scope`, `lang`, `id` fields [apps/web/public/manifest.json] — deferred, PWA polish
- [x] [Review][Defer] No service worker registration for PWA [apps/web/src/main.tsx] — deferred, PWA not required to be installable at MVP
- [x] [Review][Defer] No `<meta name="description">` in index.html [apps/web/index.html] — deferred, SEO belongs to Story 2.1 landing page
- [x] [Review][Defer] shadcn v4 uses Base UI (`@base-ui/react`) instead of Radix UI — architecture doc references Radix but shadcn migrated — deferred, architecture doc update

## Dev Notes

### Architecture Compliance

- **Tailwind CSS v4** — Uses the new `@tailwindcss/vite` plugin and `@import "tailwindcss"` CSS directive. No `tailwind.config.ts` file needed for v4 (config is CSS-first). If shadcn/ui init creates a `tailwind.config.ts`, keep it — shadcn needs it for its component generation.
- **shadcn/ui** — Copy-paste component model. Components go to `src/components/ui/`. Uses Radix UI primitives underneath. Initialize with `pnpm dlx shadcn@latest init`.
- **React Router v7** — Use **library mode** (NOT framework mode). Install `react-router` package (NOT `react-router-dom` — v7 unified the package). Use `createBrowserRouter` + `<RouterProvider>` pattern for data-mode routing.
- **Framer Motion** — Install `framer-motion`. Required for result reveal animations, page transitions, and `useReducedMotion()` hook (UX-DR15). No configuration needed at this stage.
- **PWA manifest** — Required from day one per architecture doc. `display: standalone`, `orientation: portrait`, `theme_color: #050507`, `background_color: #050507`.
- **Fonts** — Clash Display (display/persona names 64px+) and Inter (UI/body 16px+) must support Vietnamese diacritics. Create `public/fonts/` directory now; actual font files will be added when sourced. Self-hosted, not CDN.
- **`@/*` import alias** — Already configured in `vite.config.ts` via `resolve.alias`. Must ALSO be added to `tsconfig.app.json` `paths` for TypeScript resolution.

### Critical Version Notes (April 2026)

| Technology | Version | Notes |
|---|---|---|
| Tailwind CSS | v4.x | New CSS-first config, `@tailwindcss/vite` plugin, `@import "tailwindcss"` directive |
| shadcn/ui | latest | `pnpm dlx shadcn@latest init` — auto-detects Vite + Tailwind v4 |
| React Router | v7.x | Package is `react-router` (unified). Library mode with `createBrowserRouter`. |
| Framer Motion | latest | `framer-motion` package. No breaking changes expected. |
| Vite | 8.0.10 | Already installed from Story 1-1 |
| React | 19.2.5 | Already installed from Story 1-1 |

### Scope Boundaries — DO NOT Do These

- Do NOT install Zustand, TanStack Query, or PostHog — those belong to later stories (Epic 2+)
- Do NOT create feature directories (`src/features/`) — those are created when features are implemented
- Do NOT add any API client or session management — Story 1.3 handles API setup
- Do NOT install Vitest or Playwright — Story 1.7 handles testing framework
- Do NOT download actual font files yet — just create the `public/fonts/` directory structure
- Do NOT create the full design token system (16 MBTI type palettes, spacing scale) — that belongs to the first feature story that needs it (Story 2.1)
- Do NOT add `wrangler.toml` to `apps/web` — Cloudflare Pages deployment config is handled in Story 1.7 CI/CD

### Previous Story Intelligence (Story 1-1)

**Key learnings from Story 1-1:**
- `create-cloudflare` CLI v2.67.4 no longer supports `--template=react-ts` as a direct flag. Story 1-1 used `create-vite` instead. The current `apps/web` is a standard Vite + React + TypeScript scaffold.
- TypeScript 6.0 deprecates `baseUrl` in tsconfig — do NOT add `baseUrl`. The `@/*` alias is handled by Vite `resolve.alias` for bundling and `tsconfig.app.json` `paths` for TypeScript.
- pnpm 10.33.2 requires `pnpm.onlyBuiltDependencies` in root `package.json` — already configured.
- `apps/web/tsconfig.app.json` does NOT extend `tsconfig.base.json` — it has its own config. This is fine; just add `paths` to `tsconfig.app.json`.

**Current state of `apps/web`:**
- Vite 8.0.10 + React 19.2.5 + TypeScript 6.0
- `@/*` alias configured in `vite.config.ts` only (NOT in tsconfig yet)
- `src/index.css` has Cloudflare template CSS (will be replaced with Tailwind)
- `src/App.css` has Cloudflare template CSS (will be deleted)
- `src/App.tsx` has minimal placeholder importing `@mbti/shared`
- `src/main.tsx` renders `<App />` directly in `<StrictMode>`
- `public/` contains only `favicon.svg` and `icons.svg`
- No routing, no Tailwind, no shadcn, no Framer Motion installed

### Files Being Modified (UPDATE)

| File | Current State | What Changes |
|---|---|---|
| `apps/web/package.json` | Has react, react-dom, @mbti/shared | Add tailwindcss, @tailwindcss/vite, react-router, framer-motion |
| `apps/web/vite.config.ts` | Has react plugin + @/ alias | Add tailwindcss() plugin |
| `apps/web/src/index.css` | Cloudflare template CSS | Replace entirely with `@import "tailwindcss"` |
| `apps/web/src/App.tsx` | Minimal placeholder | Replace with Tailwind-styled placeholder + shadcn Button |
| `apps/web/src/main.tsx` | Renders `<App />` directly | Wrap with `<RouterProvider>` |
| `apps/web/index.html` | Basic HTML, `lang="en"` | Set `lang="vi"`, add viewport-fit, theme-color, manifest link |
| `apps/web/tsconfig.app.json` | No paths configured | Add `paths: { "@/*": ["./src/*"] }` |

| File | Action |
|---|---|
| `apps/web/src/App.css` | DELETE |
| `apps/web/src/assets/` | DELETE directory |
| `apps/web/src/router.tsx` | NEW — React Router route definitions |
| `apps/web/src/components/ui/button.tsx` | NEW — via shadcn add |
| `apps/web/components.json` | NEW — via shadcn init |
| `apps/web/public/manifest.json` | NEW — PWA manifest |
| `apps/web/public/fonts/.gitkeep` | NEW — placeholder for font files |

### Project Structure After This Story

```
apps/web/
├── package.json              # Updated with new deps
├── vite.config.ts            # + tailwindcss plugin
├── tsconfig.json             # Unchanged
├── tsconfig.app.json         # + paths for @/* alias
├── tsconfig.node.json        # Unchanged
├── eslint.config.js          # Unchanged
├── components.json           # NEW — shadcn/ui config
├── index.html                # Updated: lang="vi", viewport-fit, manifest
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── manifest.json         # NEW — PWA manifest
│   └── fonts/
│       └── .gitkeep          # NEW — placeholder for Clash Display + Inter
└── src/
    ├── main.tsx              # Updated: RouterProvider
    ├── router.tsx            # NEW — createBrowserRouter routes
    ├── App.tsx               # Updated: Tailwind placeholder + Button
    ├── index.css             # Replaced: @import "tailwindcss"
    ├── components/
    │   └── ui/
    │       └── button.tsx    # NEW — via shadcn add
    └── lib/
        └── utils.ts          # NEW — cn() helper (via shadcn init)
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation — initialization commands for shadcn, React Router]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — React Router v7, feature-based structure, PWA manifest]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Tailwind CSS + shadcn/ui + Framer Motion]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2 — acceptance criteria]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation — Tailwind + shadcn/ui + Framer Motion rationale]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction — "The Stage" near-black base #050507]
- [Source: _bmad-output/implementation-artifacts/1-1-monorepo-scaffold-with-turborepo-and-pnpm-workspaces.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4 (claude-opus-4.6)

### Debug Log References

- shadcn/ui `init` requires `paths` in `tsconfig.json` (not just `tsconfig.app.json`) — added `compilerOptions.paths` to root `tsconfig.json` to satisfy shadcn's alias validation.
- shadcn/ui init auto-updated `src/index.css` with Tailwind v4 theme tokens, `tw-animate-css`, `@fontsource-variable/geist`, and shadcn CSS variables.
- ESLint `react-refresh/only-export-components` rule flags shadcn's `buttonVariants` export — disabled rule for `src/components/ui/` directory (generated code).

### Completion Notes List

- Tailwind CSS v4 installed with `@tailwindcss/vite` plugin — CSS-first config via `@import "tailwindcss"`
- shadcn/ui initialized with Button component at `src/components/ui/button.tsx` + `src/lib/utils.ts` (cn helper)
- React Router v7 (library mode) with `createBrowserRouter` + `RouterProvider` — routes: `/` (landing) and `*` (404)
- Framer Motion installed — ready for result reveal animations in later stories
- PWA manifest at `public/manifest.json` (standalone, portrait, theme #050507)
- `public/fonts/` directory created with `.gitkeep` for future Clash Display + Inter
- `index.html` updated: `lang="vi"`, `viewport-fit=cover`, theme-color meta, manifest link
- `tsconfig.app.json` + `tsconfig.json` updated with `@/*` path alias
- ESLint config updated to allow non-component exports in `src/components/ui/`
- All ACs verified: `pnpm build` passes, `pnpm lint && pnpm typecheck` zero errors

### File List

- apps/web/package.json (MODIFIED — added tailwindcss, @tailwindcss/vite, react-router, framer-motion, shadcn deps)
- apps/web/vite.config.ts (MODIFIED — added tailwindcss() plugin)
- apps/web/tsconfig.json (MODIFIED — added compilerOptions.paths for @/* alias)
- apps/web/tsconfig.app.json (MODIFIED — added paths for @/* alias)
- apps/web/eslint.config.js (MODIFIED — disabled react-refresh rule for ui components)
- apps/web/index.html (MODIFIED — lang="vi", viewport-fit, theme-color, manifest link, title)
- apps/web/src/index.css (MODIFIED — replaced with Tailwind v4 + shadcn theme tokens)
- apps/web/src/main.tsx (MODIFIED — RouterProvider instead of direct App render)
- apps/web/src/App.tsx (MODIFIED — Tailwind-styled placeholder with shadcn Button)
- apps/web/src/router.tsx (NEW — createBrowserRouter with / and * routes)
- apps/web/src/components/ui/button.tsx (NEW — via shadcn add)
- apps/web/src/lib/utils.ts (NEW — cn() helper via shadcn init)
- apps/web/components.json (NEW — shadcn/ui configuration)
- apps/web/public/manifest.json (NEW — PWA manifest)
- apps/web/public/fonts/.gitkeep (NEW — placeholder for font files)
- apps/web/src/App.css (DELETED)
- apps/web/src/assets/ (DELETED)

## Change Log

- 2026-04-30: Story 1.2 implemented — Tailwind CSS v4, shadcn/ui, React Router v7, Framer Motion, PWA manifest, fonts directory, tsconfig paths

