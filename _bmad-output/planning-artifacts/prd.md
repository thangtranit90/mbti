---
stepsCompleted: ['step-01-init', 'step-01b-continue', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
releaseMode: phased
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-04-26-1430.md']
workflowType: 'prd'
lastEdited: '2026-04-29'
editHistory:
  - date: '2026-04-29'
    changes: 'Architecture update — React SPA + Cloudflare-native stack (Pages + Workers + D1 + KV); auth model Option A (KV session token for main user, invite token for invitee); rendering strategy updated to SSR via Worker for landing/articles, CSR for interactive flows; Phase 2 Supabase pivot note added'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 1
  projectDocsCount: 0
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
  mobileStrategy: PWA phase 1, native mobile phase 2+
---

# Product Requirements Document - MBTI

**Author:** Thangtranit90
**Date:** 2026-04-26

## Executive Summary

MBTI personality platforms today offer a label and stop. This platform treats MBTI as an entry point — not a destination. It is an AI-powered personality intelligence platform that helps users understand who they are *in relation to others* and *over time*, delivered through a tone that is precise enough to be felt, light enough to never feel judged.

**Target Users (Phase 1):** Gen Z and Millennials in Vietnam (ages 16–35), particularly those engaged in self-identity culture — Zodiac content, Spotify Wrapped, TikTok personality trends. Secondary target: couples and friend groups seeking compatibility insight. B2B (HR/team intelligence) is a future phase.

**Problem Being Solved:**
Existing MBTI platforms (16personalities et al.) provide a one-time, template-based label with no personalization depth, no social comparison layer, and no continuity beyond the result page. The category has high cultural awareness but low retention and zero ongoing value delivery. Users get a result, share it once, and leave.

**Why Now:**
Three trends converge simultaneously in Vietnam's Gen Z market: (1) growing self-awareness and mental health discourse in a light, shareable format; (2) established behavioral pattern of identity expression via personality-adjacent content (Zodiac, Wrapped, type memes); (3) AI capability now enabling hyper-personalized insights at consumer scale — something not feasible two years ago.

### What Makes This Special

**Core Philosophy: Mirror-First, Guidance-Second**
The platform does not sell a label. It sells self-intelligence — a living mirror that reflects how you actually behave, how others perceive you, and how you're changing. When users want to act on what they see, lightweight micro-actions are available — not prescriptive coaching, not judgment.

**Three Structural Differentiators:**

1. **Personalization Depth** — AI-generated insights specific enough to feel "uncomfortably accurate." Not generic type descriptions, but behavioral patterns drawn from the user's actual responses. The delight moment: *"ủa sao nó biết mình vậy?"* — recognition of oneself, not recognition of a category.

2. **Social Layer** — A bidirectional social comparison mechanic: users discover how they see themselves versus how others see them. Friends and partners describe each other's behavior; the platform surfaces the gap. This mechanic is simultaneously the core engagement hook and the primary viral acquisition channel.

3. **Continuity** — MBTI as a living system, not a one-time snapshot. Users track how they change over time, across relationships, and across life contexts. The result page is not the end — it is the beginning of an ongoing relationship with the platform.

**Positioning:**
Not *"discover yourself"* (what every competitor offers).
Instead: *"understand yourself in relation to the world — and if you want to grow, here's one small step."*

## Project Classification

| Attribute | Value |
|---|---|
| **Project Type** | Web Application — Responsive SPA + PWA |
| **Domain** | General (Psychology / Personality Entertainment) |
| **Complexity** | Medium — adaptive testing, social mechanics, AI personalization, multi-segment UX, phased monetization |
| **Project Context** | Greenfield — built from scratch |
| **Market** | Vietnam-first; architecture designed for Southeast Asia expansion |
| **Mobile Strategy** | PWA Phase 1; native iOS/Android Phase 2+ (post-validation) |

## Success Criteria

### User Success

**Delight Moment (Post-Test):**
A user reads their result and pauses — not to skim, but to absorb. The insight is specific enough to feel personal: how they avoid conflict, how they behave in group conversations, what drives them beneath the surface. The reaction is *"ủa sao nó biết mình vậy?"* — recognition of a real behavior pattern, not a flattering generalization. This moment triggers an unprompted screenshot or share.

**Share Trigger:**
Users share not to broadcast a result, but to start a conversation — tagging specific people to ask *"does this sound like me?"* or reacting to relational insights ("3 types most likely to clash with you"). The share is socially motivated, not vanity-driven. Social-facing result elements (3 Villains, Self vs Social Gap teaser) are the primary share catalysts.

**7-Day Return:**
Users return because the product created an open loop: friends have started the social comparison mechanic, the self vs social perception gap is incomplete, or new content in the feed is relevant to a recent situation. Return is curiosity-driven, not notification-driven.

### Business Success

**3-Month MVP Targets:**

| Metric | Target | Signal |
|---|---|---|
| Test completion rate | >70% | Test is engaging, not exhausting |
| Share rate (result → share) | 30–40% | Insight hits "shareable accuracy" threshold |
| Viral K-factor | ~1.0 | Each user brings ~1–2 additional users |
| 7-day retention | 20–25% | Social loop and content feed creating return |
| Couple/Friend Pack conversion | 3–5% | Early monetization signal; validates willingness to pay |
| Total completed tests | 10,000–20,000 | Sufficient sample for behavioral validation |

**Phase 2 Go Signal:**
10,000 completed tests + organic sharing observed + Test Your Friends loop demonstrating measurable viral propagation (K ≥ 0.7). Revenue optimization begins only after these signals are confirmed.

**Primary Optimization Goal (Phase 1):**
> "User feels understood → wants to pull others in → returns because of curiosity about self and relationships."
Revenue is a trailing indicator, not a leading objective.

### Technical Success

MVP baseline: page load ≤3 seconds, uptime ≥99%, hundreds of concurrent users without degradation. Full measurable NFRs are defined in [Non-Functional Requirements](#non-functional-requirements). Philosophy: "Good enough not to break the experience" — technical optimization follows traction, not anticipation.

### Measurable Outcomes

Product-market fit signal (Phase 1): organic share rate ≥30% + K-factor ≥0.7 + 7-day retention ≥20% observed together in the same cohort.

---

## Product Scope

Five MVP features prove the core concept. Full phased roadmap with rationale, team context, and risk mitigation is documented in [Project Scoping & Phased Development](#project-scoping--phased-development).

### MVP — Minimum Viable Product

1. **Adaptive Reverse Test** — 12-question CAT with reverse mechanic (user declares expected type; result confirms or challenges). 4–5 minutes.
2. **AI-Generated Result Card** — Persona name + behavioral insight + "3 Villains" + shareable Stories-format card. AI-generated, behaviorally specific.
3. **Test Your Friends Social Loop** — Bidirectional invite flow: user votes on friend's type → friend completes test → both see comparison. Core viral mechanic.
4. **Couple/Friend Pack** — Paid compatibility report (shared two-person purchase). Phase 1 monetization + zero-CAC acquisition channel.
5. **Light Content Feed** — 3–5 curated articles per type × 16 types. Return mechanic post-result.

### Phased Roadmap Summary

- **Phase 2 (Growth):** Gap Report Paywall, Daily Micro-Challenge, Psychology-Adaptive Notifications, MBTI Wrapped, Personality Streak
- **Phase 3 (Expansion):** Content Subscription, Type-Adaptive UX, B2B Team Dashboard, Native Mobile App, Southeast Asia Expansion, MBTI Timeline

## User Journeys

### Journey 1: Linh — Solo Explorer (Happy Path)

**Persona:** Linh, 22, marketing student in Hanoi. Active on Instagram and TikTok. Aware of MBTI but never taken a test seriously.

**Opening Scene:**
10pm. Linh is scrolling Instagram Stories and sees a friend's post: *"This test is uncomfortably accurate 😭"* with a screenshot of an insight about avoiding conflict in group chats. She taps the link — not to take a personality test, but out of curiosity: *"will it be accurate about me too?"*

**Rising Action:**
Page loads fast. No onboarding wall. First prompt: *"Before we start — what type do you think you are?"* She picks INFJ. The test begins — 12 situational questions (group drama, a friend needing advice at midnight, a deadline with a teammate's mistake). Completed in 4 minutes. Never felt like a quiz.

**Climax:**
Result page: not "INFP" first — instead: *"The Silent Observer."* Then a line that lands: *"You usually see everything before you speak — but sometimes you hold back so long that the moment passes."* She stops. Reads it again. Screenshots. Scrolls to "3 Types Most Likely to Clash With You" — one of them is her ex's type. She laughs and shares immediately.

**Resolution:**
Linh posts to her Story: *"how does it know 😭"*. Three friends click the link within 20 minutes. Viral loop initiated with zero platform push.

---

### Journey 2: Minh — Social Initiator (Viral Loop)

**Persona:** Minh, 26, works at a startup, in a 2-year relationship. Results-oriented. Enters after seeing Linh's story.

**Design Constraint:** The share-to-invite flow must have minimum friction — any unnecessary step risks losing share momentum before the viral loop activates.

**Opening Scene:**
Minh takes the test after Linh's Story. Result: ENTJ — *"The Architect."* Insight: *"You see the path so clearly that it frustrates you when others don't."* Accurate. Platform prompt: *"How do you and someone close see each other? Invite them to compare."*

**Rising Action:**
Minh thinks of his girlfriend — she's told him he "doesn't understand feelings." One tap generates a shareable link pre-loaded with his profile. He sends it on Zalo: *"Try this, see what it says."* She opens it and is asked to answer 3 behavioral questions about Minh *before* taking her own test. Friction-free for both sides — no account required, no long forms.

**Climax:**
Side-by-side comparison loads: Minh describes himself as "decisive, forward-thinking." She describes him as "impatient, hard to read emotionally." The gap is visible. Then: *"See your full couple compatibility report — 79,000đ."* Minh pays in under 30 seconds.

**Resolution:**
Both receive the compatibility report. Minh screenshots the ENTJ + INFP conflict section and sends it to her. They spend 30 minutes in a conversation they've never managed to have before. One user → one new user → one paid transaction. CAC = 0.

---

### Journey 3: Hà — Returning User (Retention)

**Persona:** Hà, 24, designer in Ho Chi Minh City. Took the test 3 days ago after a TikTok video. Shared once, then forgot.

**Retention Driver:** Social context is the primary pull — friends joining and the unresolved social perception gap keep the loop open. Content feed is a secondary layer that supports browsing but does not drive return on its own.

**Opening Scene:**
Hà receives a notification: *"2 friends have voted on how they see Hà — want to see what they think?"* Not a generic reminder — a named social hook. She opens the app.

**Rising Action:**
Two friends responded to her Test Your Friends link she'd forgotten sending. One guessed INFJ, the other ENFP. The platform shows a teaser of the gap — to see who said what and why, she needs one more friend to join (free) or can unlock the Gap Report. She doesn't pay yet. The open loop is the hook. She browses the content feed while she waits.

**Climax:**
Article: *"Why INFPs start many things but rarely finish them."* Three-minute read. Specific reframe: *"This isn't lack of discipline — it's how INFPs process overwhelm when a project loses its original meaning."* She screenshots it and sends it to a friend: *"This is literally me."*

**Resolution:**
Hà doesn't pay today. But she's bookmarked two articles, and the unresolved social gap holds her tied to the platform. When more friends join, she returns. Retention is driven by an open curiosity loop — not forced habit mechanics.

---

### Journey 4: Admin / Content Manager (Operations)

**Persona:** Platform content manager responsible for article quality, key metric monitoring, and incident response.

**Opening Scene:**
Monday morning. Admin opens the dashboard: overall completion rate 68% — below the 70% target. Drill-down shows ISTP and INTP dropping off at questions 8–9. Likely the questions feel less relevant to these types.

**Rising Action:**
Admin checks share rate by result card variant: the version with "3 Villains" outperforms the one without (38% vs 22%). Flags the underperforming variant for review. Content audit: INTJ and ESTP each have fewer than 3 articles — below the minimum threshold. Admin uploads 2 new articles for each type.

**Climax:**
A viral spike hits: one Instagram Story drives 500+ clicks in 2 hours. Dashboard alert: concurrent users approaching the limit. Admin scales infrastructure via the hosting panel. Spike absorbed without user-facing degradation. Admin notes: auto-scaling trigger required before Phase 2 launch.

**Resolution:**
Post-spike analysis: social share entry converts at 74% test completion vs 61% for TikTok entry. This data shapes Phase 2 acquisition strategy — invest more in making shares compelling, less in top-of-funnel paid content.

---

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---|---|
| **Linh (Solo)** | Zero-friction entry (no onboarding wall), Reverse test mechanic, Adaptive 12-question CAT engine, AI behavioral insight generation (specific, not generic), Persona name reveal before 4-letter type, "3 Villains" result component, Shareable animated result card (Stories format) |
| **Minh (Social)** | One-tap invite link generation (no account required for invitee), Friend perception voting UI (3 behavioral questions), Self vs Social Gap visualization (teaser + paid unlock), Couple/Friend Pack purchase flow (payment integration), Compatibility report generation and delivery |
| **Hà (Return)** | Social-triggered notification (named friends, not generic), Loop status tracking (N friends responded), Gap Report paywall (placed at peak curiosity), Per-type content feed (curated articles), Open curiosity loop as primary retention mechanism |
| **Admin** | Admin dashboard (completion rate by type, share rate by variant, viral propagation map), Content management system (articles per 16 types, minimum threshold alerts), Infrastructure monitoring and scaling alerts, Result card A/B variant tracking |

## Domain-Specific Requirements

This platform operates in the general consumer software domain with no heavy regulatory burden. However, three domain-adjacent concerns apply and are addressed with a deliberate MVP-appropriate scope.

### Data Privacy (Vietnam PDPA — Nghị định 13/2023)

**Scope of data collected:**
- Test responses (behavioral/psychological self-report data)
- Social comparison data (friend perception inputs)
- Platform behavior (content read, actions taken)

**MVP Compliance Approach:**

| Requirement | Implementation |
|---|---|
| **User Consent** | Explicit checkbox + privacy policy link before test begins. No forced account creation — consent collected at test entry to minimize friction. |
| **Data Storage** | Offshore cloud infrastructure for MVP (speed of build). Architecture designed for localization migration when scale or regulation requires. |
| **Data Deletion** | Users can request full data deletion at any time. Inactive data purged after 6–12 months. |
| **Transparency** | Clear, plain-language privacy policy. No legalese walls. |

**Principle:** Transparent enough to build trust; not so complex as to create onboarding friction at MVP stage.

**Future consideration:** As platform scales or enters regulated markets (e.g., Southeast Asia expansion), evaluate data residency requirements and upgrade to locally-compliant storage architecture.

### AI-Generated Content Disclaimer

MBTI insights are AI-generated based on self-reported responses. Risk: users may interpret outputs as professional psychological diagnosis. Mitigation uses a balanced approach — sufficient to prevent misuse, light enough to preserve the emotional delight of the result experience.

**Implementation:**

- **Onboarding (one-time):** Brief, friendly explanation before test begins: *"This is a self-reflection tool — not a clinical assessment. MBTI helps you explore patterns in how you think and act, not define who you are."*
- **Result Page (persistent):** Subtle tag on insight copy: *"AI-generated insights for self-reflection"* — visible but not intrusive.

**Not included:** Per-insight disclaimers or heavy warning banners. These would undermine the "uncomfortably accurate" delight moment that drives sharing.

### Age Policy

**MVP Minimum Age: 18+**

Teen segment (16–17) deferred to Phase 2 to reduce legal and product complexity at MVP stage. Phase 2 teen expansion will require:
- Age gate at entry
- Parental consent mechanism or age-appropriate simplified experience
- Review of content suitability for minors

**Rationale:** Allows the core team to focus on product validation and growth mechanics before adding compliance overhead for a secondary segment.

## Innovation & Novel Patterns

### Detected Innovation Areas

**Primary Moat: The Bidirectional Social Perception System**

The core innovation is not a single feature — it is a *self-reinforcing learning system*: personal insight + others' perception + time creates a compounding loop that becomes more valuable with each participant who joins.

The mechanism:
1. User discovers how they see themselves (via test + AI insight)
2. User invites others → others describe the user's behavior
3. Platform surfaces the gap: self-perception vs. social perception, side by side
4. Over time, as more relationships are mapped, the mirror becomes more accurate and the switching cost compounds

This is hard to copy because it depends on **network behavior, not UI or test logic**. A competitor can replicate the test algorithm or the result card design; they cannot replicate a user's accumulated social graph and the perception data within it.

**Why the Social Loop Only Works with Mirror-First Positioning**

If the platform were positioned as "a fun test to share," the bidirectional loop becomes a gimmick — a one-time novelty. The innovation activates only when users believe the platform is a *genuine mirror of who they are in relation to others*. The positioning is what gives the mechanic meaning. Without it, the social feature is entertainment. With it, it becomes a tool users want to return to.

**Supporting Innovation: Reverse Test Mechanic**

Users declare their expected type before the test begins. The test then confirms or challenges that assumption. This is a strong entry hook and narrative device — it creates personal investment and a "reveal" moment that amplifies the result's emotional impact. However, this is a feature-level innovation — copyable by a well-resourced competitor within a sprint. It is classified as a **differentiation tactic**, not a moat.

**Supporting Innovation: AI-Powered Behavioral Specificity**

AI-generated insights drawn from actual response patterns rather than static type descriptions. Enables the mirror positioning to feel credible — users must experience the insight as genuinely personal, not template-based. This is the technical foundation that makes the mirror metaphor real rather than aspirational. Competitive durability depends on the quality and specificity of the prompt engineering and type-specific insight models.

### Market Context & Competitive Landscape

The MBTI category has high cultural awareness but low product sophistication. 16personalities, the market leader, offers a polished static experience with no social layer, no continuity, and no personalization depth beyond type-based copy. No current competitor has attempted a bidirectional social comparison mechanic.

Adjacent products in the social self-discovery space (Spotify Wrapped, Zodiac apps, relationship compatibility tools) have validated the behavioral pattern: users want identity content that is shareable, relational, and surprising. None have combined this with a rigorous personality framework and a compounding social graph.

The opportunity: MBTI's established cultural currency in Vietnam + untapped social/continuity layer + AI personalization capability = a genuinely new category position.

### Validation Approach

**Primary validation question for MVP:** Does the bidirectional social loop actually activate — do users invite others *and* do those others complete the loop?

| Hypothesis | Validation Signal | Target |
|---|---|---|
| Users feel insight is "uncomfortably accurate" | Share rate post-result | ≥30% |
| Social loop activates organically | Test Your Friends completion (both sides) | ≥40% of invites completed |
| Network effect begins | K-factor (invites per user who completes) | ≥0.7 |
| Platform positioning lands (mirror, not gimmick) | 7-day return rate | ≥20% |

Cold start mitigation: **Couple Pack as seeded entry point.** Two-person activation requires minimal network — lower barrier than a broad friend group mechanic. First successful couple comparisons create word-of-mouth before the full social graph mechanic is needed.

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| **Social loop doesn't activate** (users don't invite friends) | Solo experience is independently valuable — accurate insight + animated result card creates standalone delight and share. Product survives without loop activation; loop is upside. |
| **Social loop activates but invitees don't complete** | Low-friction invitee experience (no account, 3 questions only). Designed for completion, not commitment. |
| **Competitor copies the mechanic** | Data moat compounds over time: users' accumulated social graph data has switching cost. First-mover in Vietnam market + cultural localization creates lead time. |
| **AI insights feel generic, mirror positioning fails** | Insight quality is the foundational bet. Continuous refinement of behavioral specificity is a core product investment, not a one-time build. |

## Engagement Design Philosophy

The platform's engagement model is built on a foundational insight: different MBTI types are motivated by fundamentally different psychological drivers. Generic engagement mechanics (universal streaks, identical notifications, one-size gamification) produce mediocre retention across all types. Type-specific behavioral triggers produce meaningfully stronger pull for each group — and signal to users that the platform genuinely understands them.

**Six Type-Cluster Engagement Principles:**

| Cluster | Types | Trigger | Mechanic |
|---|---|---|---|
| **FOMO Engine** | ENFP, ESFP | Social activity signals, not reminders | "847 users with your type tried this today. You haven't." Real community activity, type-named, creates social presence without demanding it. |
| **Mastery Bar** | INTJ, INTP | Intellectual incompleteness | "You've explored 6 of 12 dimensions of your type." These types are compelled to close incomplete knowledge — not by reward, but by the gap itself. |
| **Meaning Signal** | INFJ, INFP | Purpose over reward | "This challenge helps you become who you actually want to be." Not a badge. Not a streak. A reason that aligns with their identity. |
| **Social Proof Pull** | ESFJ, ENFJ | Framed as helping others | "2 friends are waiting for your results to complete their compatibility report." These types don't ignore people who are waiting for them. |
| **Challenge Bait** | ESTP, ENTJ | Timer, ranking, competitive signal | "Average ESTP completes this in 4:32. Your time: 6:01." These types retry. They don't accept being slower than average. |
| **Comfort Zone Map** | ISFJ, ISTJ | Predictable progress, no surprises | Clear progress bar, defined next steps, "enhance your current version" framing. These types disengage when disrupted; they engage with structured, predictable growth. |

**MVP Implementation:**
Phase 1 activates **Meaning Signal + Social Proof Pull** as the primary engagement layer — highest coverage, lowest implementation complexity, directly supports the open curiosity loop that drives 7-day return.

Phase 2 adds type-cluster-specific notification triggers for all six groups. Phase 3 enables full Type-Adaptive UX where the entire interface responds to the user's cluster.

**Design Standard:**
Any engagement mechanic introduced to the platform — notification, prompt, challenge, CTA copy — must be evaluated against these six principles. Generic engagement that ignores type context is a product failure mode, not a neutral design choice.

## Web Application Specific Requirements

### Project-Type Overview

A consumer-facing web platform built with a Cloudflare-native architecture — optimized for viral share-driven acquisition with a lightweight technical footprint at MVP. Core principle: *simple, fast to build, and good enough to deliver a smooth experience — optimize deeper when product is validated.*

### Technical Architecture

**Framework:** React (SPA) + Cloudflare-native stack

- **Cloudflare Pages** serves the React SPA; static assets distributed at CDN edge globally
- **Cloudflare Workers** handle all API logic, server-side rendering for SEO-critical pages, and AI proxy with response caching
- **Hybrid rendering:** SSR via Worker for publicly indexable pages (landing, articles, type descriptions); CSR for interactive app flow (test, result, social loop)
- **Database:** Cloudflare D1 (SQLite — structured relational data for test results, social graph, content) + Cloudflare KV (session tokens, invite link state, edge caching)
- **Phase 2 option:** If relational complexity grows (RLS, realtime subscriptions, multi-region replication), architecture pivots to Supabase PostgreSQL — no PRD-level restructuring required.

**Authentication Model:**

- **Main user** (test-taker and result owner): Anonymous session token issued on first visit, stored in Cloudflare KV with 30-day TTL; session ID persisted client-side. No account creation required.
- **Invitee** (friend completing social perception loop): Token-based access via unique invite link. The invite token is the credential — no session required.
- Rationale: Preserves zero-friction entry (FR1, FR19) and viral loop integrity while enabling server-side session validation in Workers.

**Rendering Strategy by Route:**

| Route | Rendering | Rationale |
|---|---|---|
| Landing page | SSR via Worker | SEO + fast load for new visitors; dynamically rendered at edge |
| MBTI article pages | SSR via Worker | Indexable content; edge-rendered for SEO consistency |
| Test flow | CSR (client-side) | Interactive, no SEO needed; zero server round-trips mid-test |
| Result page | CSR + shareable URL | URL must be linkable; content generated client-side |
| Social loop / comparison | CSR (client-side) | Private, user-specific, no indexing needed |
| Admin dashboard | CSR (client-side) | Internal tool, no SEO |

### Browser Matrix

**Target: Modern browsers on mobile-first**

| Browser | Support Level |
|---|---|
| Chrome Mobile (Android) | ✅ Primary |
| Safari Mobile (iOS) | ✅ Primary |
| Chrome Desktop | ✅ Primary |
| Firefox (modern) | ✅ Secondary |
| Samsung Internet | ✅ Secondary |
| Legacy browsers (IE, Chrome <80) | ❌ Not supported |

**Rationale:** Gen Z/Millennial target audience uses modern devices. Legacy browser support adds development overhead with negligible user impact at MVP stage.

### Responsive Design

- **Mobile-first design** — test, result card, and social loop optimized for portrait mobile (primary use case)
- Result card and share formats designed natively for Instagram/TikTok Stories dimensions (9:16)
- Desktop experience supported but not primary design driver at MVP
- PWA manifest included from day one: installable on home screen, offline-capable shell (full offline not required at MVP)

### SEO Strategy

**Scope: Supporting channel, not primary acquisition**

Primary traffic driver is social sharing (friend referral, Stories links). SEO supports discovery but is not optimized at MVP depth.

| Content Type | SEO Approach |
|---|---|
| Landing page | Full SEO — title, meta, OG tags, structured data; rendered via Worker SSR |
| MBTI type pages | Edge SSR via Worker with type-specific meta tags |
| Article/content pages | Edge SSR via Worker with full meta |
| Test flow | No SEO optimization needed |
| Result pages | Shareable URL with OG preview image (for social share preview, not search indexing) |

**OG/Social Meta:** Result pages generate dynamic Open Graph images (type name, persona, animated card preview) — critical for share preview quality on Instagram, Zalo, Facebook.

### Performance Targets

| Metric | Target | Notes |
|---|---|---|
| Page load (LCP) | ≤3 seconds on mobile (4G) | Primary Vietnam mobile network |
| Time to Interactive | ≤4 seconds | Test flow must feel instant |
| Core Web Vitals | Pass on landing + content pages | Not required on SPA routes at MVP |
| Bundle size | Minimize — code split by route | Lazy load test engine and result components |

### Real-Time & Notification Strategy

**MVP: Polling-based, not WebSocket**

Social loop status updates (friends responded, gap available) delivered via:
- **On-app-open polling** — check for new social activity when user opens/returns to app
- **Periodic polling** — lightweight interval check (e.g., every 3–5 minutes) when app is active
- **No push notifications** at MVP — browser push permission requests create friction; deferred to Phase 2

**Upgrade path:** If engagement metrics validate retention value, migrate social loop notifications to WebSocket or Server-Sent Events post-MVP.

### Accessibility Level

| Requirement | Status |
|---|---|
| Readable text (minimum 16px body, sufficient contrast ratio) | ✅ Required |
| Mobile-touch targets (minimum 44x44px) | ✅ Required |
| Basic keyboard navigation | ✅ Required (desktop) |
| Screen reader optimization | ❌ Deferred to Phase 2 |
| Full WCAG 2.1 AA audit | ❌ Deferred to Phase 2 |

### Implementation Considerations

- **State management:** Client-side state for test flow and result (no server round-trips mid-test); social graph data fetched and cached on result page load
- **Image optimization:** Standard `<img>` with `loading="lazy"` and explicit dimensions; animated result card as CSS/Lottie animation (not video) for fast load
- **Analytics:** Event tracking from day one (completion rate per step, share events, invite clicks) — required for validation metrics
- **Environment:** Single deployment target at MVP (Cloudflare Pages + Workers); no complex multi-region setup until viral spike risk materializes

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — validate the core delight loop before adding growth or monetization complexity.

**Core hypothesis:** If the AI insight is specific enough to feel "uncomfortably accurate," users will share naturally, triggering the viral loop without any push mechanics. The social comparison feature, Couple Pack, and content feed all exist to validate secondary hypotheses — but they cannot activate if the primary bet fails.

**Resource Requirements:**
- **Team:** 1 product lead + 1 fullstack developer + freelance design as needed
- **Timeline:** 3–4 weeks to first user-testable version
- **Build philosophy:** Build fast, test with real users, iterate based on share rate and completion data

### MVP Feature Set

**Core User Journeys Supported:** Linh (Solo Explorer — happy path), Minh (Social Initiator — viral loop), early Hà signals (content browsing and return)

**Must-Have Capabilities:**

| # | Capability | Rationale |
|---|---|---|
| 1 | Adaptive Reverse Test (12Q CAT + reverse mechanic) | Core entry experience; sets narrative from first interaction |
| 2 | AI-Generated Result (Persona + behavioral insight + "3 Villains" + shareable card) | **Primary bet** — if this doesn't land, nothing else works |
| 3 | Test Your Friends Social Loop (invite + friend voting + side-by-side comparison) | Core viral acquisition mechanic |
| 4 | Couple/Friend Pack (payment + compatibility report) | Phase 1 monetization signal + acquisition channel |
| 5 | Light Content Feed (3–5 articles per type × 16 types) | Return mechanic; keeps product alive post-result |
| 6 | Analytics & Event Tracking (step completion, share events, invite clicks) | Required for validation — not optional |
| 7 | PDPA Consent + Privacy Policy | Required for MVP compliance |

**Critical MVP Investment: AI Insight Quality**

The insight generation pipeline must be treated as a core product component, not a commodity feature. Behavioral specificity — how the user actually behaves (conflict avoidance patterns, group communication style, decision-making under pressure) rather than generic type traits — is the primary driver of the "uncomfortably accurate" delight moment. Without this, share rate drops, the social loop fails to activate, and all downstream features become irrelevant.

**Explicitly descoped from MVP:**
- Real-time push notifications (polling sufficient)
- Full animated result card (static shareable image acceptable if time-constrained)
- Psychology-adaptive notifications
- WCAG 2.1 full compliance
- Teen segment (18+ only)

### Post-MVP Phases

**Phase 2 — Growth**
*Triggered by:* 10,000 completed tests + K-factor ≥ 0.7 + 7-day retention ≥ 20%

- Gap Report Paywall (full self vs social perception unlock at peak curiosity moment)
- Daily Micro-Challenge (Wordle-style per type; shareable streak)
- Psychology-Adaptive Notifications (type-specific re-engagement triggers)
- MBTI Wrapped (requires 6+ months longitudinal data from Phase 1)
- Personality Streak (Duolingo-style daily habit loop)
- Push notification system (browser/PWA)

**Phase 3 — Expansion**
*Triggered by:* Sustained traction + revenue signal validating premium willingness to pay

- Content Subscription (Phase 3 monetization)
- Type-Adaptive UX (full interface personalization per MBTI type)
- B2B Team Intelligence Dashboard (SaaS revenue layer)
- Native Mobile App (iOS/Android)
- Southeast Asia Expansion (Thailand, Indonesia, Philippines via cultural skin)
- MBTI Timeline / Evolution (long-term personality change tracking)

### Risk Mitigation Strategy

**Risk #1 (Critical): AI Insight Quality — Generic Output**

*Risk:* AI-generated insights feel like template copy → users don't share → social loop never activates → product fails from root.

*Mitigation:*
- Treat prompt engineering as a primary product investment before launch, not a post-ship refinement
- Human quality review of all 16 types × insight variants before first user sees them
- A/B test insight copy variants in first cohort; share rate is the proxy signal
- **Fallback:** If AI quality is insufficient at launch, hand-craft behavioral insights per type manually (16 types × 5–8 insight variants = manageable for a small team)

**Risk #2: Social Loop Invitee Drop-Off**

*Risk:* Users invite friends but friends don't complete the 3-question voting flow.

*Mitigation:* Zero-friction invitee experience — no account required, 3 behavioral questions maximum, mobile-optimized landing.

*Fallback:* If drop-off remains high, reduce to 1-question perception check. Lower data fidelity, but higher completion rate — acceptable tradeoff at MVP stage.

**Risk #3: Share Rate vs Invite Rate Divergence**

*Risk:* Share rate ≥ 30% (result is shareable) but Test Your Friends invite rate is low (social mechanic doesn't activate despite delight).

*Mitigation:* Track share events and invite clicks as separate signals. If divergence is observed, adjust CTA prominence and copy on result page before assuming the social mechanic is broken.

**Risk #4: Small Team Bandwidth**

*Risk:* Single fullstack developer is a single point of failure; 3–4 week timeline is aggressive.

*Mitigation:*
- Use proven managed infrastructure (Vercel + BaaS) to minimize ops burden
- Enforce hard MVP scope — 5 core features, no additions mid-sprint
- Descope animation quality before descoping core features (static result card > no result card)
- Async freelance design; component-based design system from day one

## Functional Requirements

*This is the capability contract for the product. UX designers design only what is listed here. Architects support only what is listed here. Epics implement only what is listed here. Missing capabilities will not exist in the final product.*

### Personality Assessment

- **FR1:** Visitors can begin a personality assessment without creating an account
- **FR2:** Users can declare their expected MBTI type before the assessment begins
- **FR3:** The system can adaptively select subsequent questions based on prior responses (Computer Adaptive Testing)
- **FR4:** Users can complete the personality assessment in a single uninterrupted session
- **FR5:** The system can calculate an MBTI type classification from a completed set of assessment responses
- **FR6:** The system can generate a unique, persistent, shareable URL for each completed assessment result

### AI Insight Generation

- **FR7:** The system can generate behavioral insight copy derived from a user's specific response patterns, not from generic type descriptions; the system must also support serving pre-written (manually curated) insight copy as a fallback when AI-generated quality does not meet the accuracy threshold
- **FR8:** The system can assign a persona name to each assessment result
- **FR9:** The system can generate a list of three MBTI types most likely to create friction with the user's type ("3 Villains"), with explanatory context
- **FR10:** The system can serve multiple insight copy variants per type for comparison testing
- **FR11:** Administrators can review, edit, and approve insight copy variants (both AI-generated and manually curated) before they are served to users

### Result & Sharing

- **FR12:** Users can view their calculated MBTI type, persona name, behavioral insight, and "3 Villains" on a result page
- **FR13:** Users can see a comparison of their self-declared type versus their calculated type (reverse mechanic reveal)
- **FR14:** Users can download or share their result as an image formatted for social media Stories (9:16 ratio)
- **FR15:** The system can generate dynamic Open Graph preview images for result page URLs, populated with the user's persona name and type
- **FR16:** Users can access their result page via a unique URL without authentication
- **FR17:** Users can initiate the "Test Your Friends" social loop from the result page

### Social Perception Loop

- **FR18:** Users can generate a personalized invite link pre-loaded with their profile, shareable via any messaging channel
- **FR19:** Invitees can access and complete the perception voting flow without creating an account
- **FR20:** Invitees can answer behavioral questions describing the inviting user's observable behavior
- **FR21:** Invitees can complete their own personality assessment immediately after submitting perception votes
- **FR22:** Users can view a side-by-side comparison of their self-perception versus how others perceive them
- **FR23:** Users can see a teaser summary of the self vs. social perception gap without purchasing
- **FR24:** Users can track how many friends have responded to their invite link

### Monetization

- **FR25:** Users can purchase a compatibility report as a shared two-person transaction (Couple/Friend Pack)
- **FR26:** The system can generate a full MBTI compatibility report for two assessed users
- **FR27:** Purchasers can access their compatibility report via a shared link without re-authentication
- **FR28:** Users can unlock the full self vs. social perception gap report via a one-time payment (Gap Report)
- **FR29:** The system can process payments via an integrated payment provider

### Content & Retention

- **FR30:** Users can browse a curated feed of articles relevant to their MBTI type
- **FR31:** Users can read full article content within the platform
- **FR32:** Users can receive in-app notifications (polling-based, not push) when friends complete perception voting on their profile; browser push notifications are explicitly out of scope for MVP
- **FR33:** The system can surface unresolved social loop status (pending friend responses) when users return to the platform
- **FR34:** Administrators can create, edit, and publish articles assigned to specific MBTI types
- **FR35:** Administrators can set and monitor minimum article thresholds per type, with alerts when thresholds are not met

### User & Privacy Management

- **FR36:** Users can provide explicit consent to data collection before beginning the assessment
- **FR37:** Users can view the platform's privacy policy before providing consent
- **FR38:** Users can request complete deletion of their personal data
- **FR39:** The system can automatically purge data for users who have been inactive beyond a defined retention period
- **FR40:** The system can display an AI-generated content disclaimer during onboarding and on the result page
- **FR41:** The system can enforce a minimum age confirmation (18+) before assessment access is granted

### Platform Administration & Analytics

- **FR42:** The system can capture and store interaction events including test step completion, result views, share clicks, and invite link clicks
- **FR43:** Administrators can view key metrics including test completion rate by type, share rate by result card variant, and viral propagation data
- **FR44:** Administrators can compare performance across result card and insight copy variants
- **FR45:** Administrators can monitor platform infrastructure health and receive alerts on threshold breaches

## Non-Functional Requirements

### Performance

- **NFR1:** Public pages (landing, content articles, result page) achieve Largest Contentful Paint ≤3 seconds on mobile 4G connections
- **NFR2:** Test flow interactions (question transitions, answer selection) complete in ≤500ms perceived response time
- **NFR3:** AI-generated result insights render on the result page within 3 seconds of test completion
- **NFR4:** Shareable result card image generates and is available for download within 5 seconds of result page load
- **NFR5:** Open Graph preview images for result URLs generate within 3 seconds to ensure social share previews display correctly

### Security

- **NFR6:** All client-server data transmission uses TLS 1.2 or higher
- **NFR7:** User assessment responses and personal data are encrypted at rest
- **NFR8:** Payment card data is never stored or processed by the platform; all payment processing is delegated to a PCI DSS-compliant third-party provider
- **NFR9:** Invite links expire after 30 days to prevent stale social loop data accumulation
- **NFR10:** Admin dashboard access is restricted to authenticated administrators; no admin functionality is accessible to regular users
- **NFR11:** User data deletion requests are processed within 30 days of submission (PDPA compliance)

### Scalability

- **NFR12:** The platform supports a minimum of 500 concurrent users without measurable performance degradation at MVP launch
- **NFR13:** Infrastructure can scale to handle 10x baseline traffic load within 15 minutes (viral spike response window)
- **NFR14:** The AI insight generation pipeline scales independently from the front-end and test engine (no coupled scaling bottleneck)
- **NFR15:** Database schema and data models support multi-region deployment without structural redesign (prerequisite for SEA expansion)

### Reliability

- **NFR16:** Platform uptime ≥99% measured on a rolling monthly basis, excluding scheduled maintenance windows
- **NFR17:** If the AI insight generation service is unavailable, the system automatically falls back to serving pre-written (manually curated) insights within the same response time SLA — no user-visible failure
- **NFR18:** If a user's session is interrupted during the test flow, their progress is preserved for at least 24 hours to allow completion without restarting

### Integration

- **NFR19:** Payment provider integration supports Vietnamese-market payment methods (VNPay, MoMo, or international cards) at MVP launch
- **NFR20:** Analytics event tracking can be extended with new event types without requiring a full platform redeploy
- **NFR21:** Social share metadata (Open Graph) renders correctly on Instagram, Facebook, Zalo, and TikTok — the four primary share surfaces for the Vietnam target market
