# MBTI Platform — Design System MASTER

> When building a page, check `design-system/pages/<page>.md` first; it overrides
> this file. Otherwise follow this. This file reflects the ACTUAL product
> (dark cinematic "reveal", Tailwind v4 tokens in `apps/web/src/index.css`),
> not a generic template. Premium target: Stripe/Vercel-grade polish on the
> existing bespoke dark aesthetic. **Never change business logic to satisfy
> visual goals** (payment/share/invite/test scoring/admin/PDPA are frozen).

**Project:** MBTI Platform · **Updated:** 2026-05-17 · **Category:** Viral consumer / cinematic identity product

---

## Design language

Dark, cinematic, editorial. The result page is a *reveal scene*, not a report.
Generous negative space, oversized display type, restrained motion, one
type-specific accent per screen. Premium = precision (consistent rhythm, hairline
borders, soft elevation, calm motion) — NOT decoration.

## Tokens (source of truth: `apps/web/src/index.css` `@theme inline`)

Existing tokens are CONTRACTS — every component depends on them. Extend
additively; never rename `surface-*`, `cta-*`, `type-<MBTI>`, `font-clash`.

| Group | Token | Use |
|------|-------|-----|
| Surface | `surface-deep #050507` | page base / immersive bg |
| | `surface-base #0d0f1a` | default page bg |
| | `surface-elevated #161929` | cards, sheets, inputs |
| CTA | `cta-primary #6366f1` / `cta-hover #4f46e5` | primary actions (non type-specific) |
| Type accent | `type-<MBTI>` (16) | per-result accent: heading, divider, CTA, glow |
| Display font | `font-clash` (Clash Display) | persona names, hero H1 only |
| Body font | `font-sans` (Inter Variable) | everything else |

**Premium additions (additive, in `index.css`):**
- Elevation: `--shadow-e1/e2/e3` (dark-tuned, soft, low-spread) for card/sheet/modal.
- Motion: `--ease-out-quint`, `--ease-spring`, `--dur-fast 150ms`, `--dur-base 240ms`, `--dur-slow 360ms`. Exit ≈ 70% of enter. Respect `prefers-reduced-motion`.
- Hairline: `--hairline rgba(255,255,255,.08)` borders; focus ring `--ring-accent` 2px.
- Spacing rhythm: 4/8 base → section gaps 16/24/32/48/64.

## Component standards

- **Buttons** h-12 (≥44pt), `rounded-xl`, `font-semibold text-[15px]`, transition `--dur-fast`. Primary = `bg-type-<MBTI>` (result) or `bg-cta-primary` (neutral) text-white. Secondary = hairline border, `text-slate-300` → white on hover. One primary CTA per view. `cursor-pointer`, visible focus ring, disabled `opacity-50 cursor-not-allowed`.
- **Cards / sheets** `bg-surface-elevated`, `border border-white/[.08]`, `rounded-2xl`, `--shadow-e1`. Bottom-sheet for secondary actions (share/invite) — slide-up, scrim `bg-black/60 backdrop-blur-sm`.
- **Inputs** h-12, `bg-surface-deep`, hairline border, focus → accent ring (no layout shift). Visible label (not placeholder-only); error text below field.
- **Motion** enter from below + fade (`--dur-base`, ease-out-quint); stagger lists 30–50ms; press scale 0.97–1.0; never animate width/height/top/left — transform/opacity only; never block input.
- **Type scale** display `clamp(2.5rem,10vw,4rem)` Clash 600/700; body 16px Inter, line-height 1.5–1.65; tracking-[0.3em] uppercase for type code / eyebrows.

## Accessibility (WCAG AA — hard gate)

- Text contrast ≥4.5:1 on dark surfaces (use `slate-300`+ for body, never `slate-500` for primary copy).
- Every screen: skip-link, single `<h1>`, sequential headings, `id="main"`.
- Icon-only buttons need `aria-label`; SVG icons only (Lucide-style stroke), never emoji.
- Visible focus on all interactive; full keyboard path; `prefers-reduced-motion` disables non-essential motion.
- Color never sole signal (pair icon/text).

## Anti-patterns

❌ generic light/gold template · ❌ emoji icons · ❌ layout-shifting hover · ❌ instant 0ms state change · ❌ `slate-500` body text on dark · ❌ touching payment/share/test/admin logic for visual reasons · ❌ horizontal scroll on mobile · ❌ >2 animated elements per view.

## Pre-delivery checklist (every surface)

- [ ] Logic untouched (diff = visual only) · [ ] typecheck+lint+test green
- [ ] Contrast ≥4.5:1 · [ ] focus visible · [ ] reduced-motion respected
- [ ] 375 / 768 / 1024 / 1440 responsive · [ ] no horizontal scroll
- [ ] tokens used (no raw hex in components) · [ ] Playwright verified on prod custom domain
