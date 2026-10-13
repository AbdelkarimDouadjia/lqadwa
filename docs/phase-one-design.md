# Phase-one design and skill evidence

Scope: existing LQADWA, not a generic template. Installed skills were read before their related work. All fourteen requested skill invocations were made explicitly; the table records what they actually influenced. An installed skill does not imply its complete multi-phase request has shipped.

## Inventory and one design direction

Preserve the flat navy/mint identity in `BRAND.md`, rounded existing logo tile, Plex Arabic, sensible whitespace and semantic state colors. Direction: **a calm pharmacy-orientation utility**. Prioritize medicine name/strength/form, a clearly qualified availability state and the next safe action; decoration stays secondary. Do not add fabricated pharmacies, testimonials, reviews, coverage counters or screenshot stock data.

| Journey | Current components / state | Next reviewable slice |
|---|---|---|
| Guest landing/navigation | `landing-page`, `landing-extras`, `site-header`, `site-footer`; menu/locale/theme, FAQ, Android link | SSR marketing + real guest directory; remove repetitive role/benefit explanations after task testing. |
| Sign-in/onboarding | `auth-form`; labelled account/password, recovery/providers, pharmacy application | Provider/recovery errors; purpose-limited fields and clear approval status. No account/avatar controls for signed-out users. |
| Patient search/map | `app/page.tsx`, `dawa-map`, client filters, OCR selection | Canonical strength/form review; actual-vs-center distance, last manual confirmation, list fallback; no medicine in URL analytics. |
| Reservation/tracking/QR | Request and booking cards, expiry/status, pickup codes and original prescription reminder | Shared state component, explicit cancellation/expiry, accessible timer announcements without one-second screen-reader spam. |
| Pharmacy inbox/stock | `pharmacy-inbox`, `inventory-workspace`; pending replies, own pickups and stock | Separate incoming/pickup/stock tasks, stable stale-edit handling, workload visibility. No speculative substitute medicine. |
| Profile/privacy/admin | `profile-details`, `admin-management`, `admin-controls`; delegated sections/reasons | Role-scoped information density, accessible confirmation/error summary, fewer unnecessary optional fields. |

### Tokens and interaction rules

Current verified token file: `app/design-refinement.css`. Brand mark colors stay `#123344` / `#57E4BE`; semantic UI teal is darker on light backgrounds for readable text.

| Meaning | Light | Dark |
|---|---|---|
| background / foreground | `#f7f8fb` / `#16263e` | `#101724` / `#edf2fa` |
| surface / surface text | `#ffffff` / `#16263e` | `#182235` / `#edf2fa` |
| primary / primary text | `#08776b` / `#ffffff` | `#63dbc7` / `#092c27` |
| muted / muted text | `#edf0f6` / `#52627a` | `#253248` / `#abb9ce` |
| border / input / focus | `#d9e1ec` / `#c5d0df` / `#08776b` | `#344258` / `#52627a` / `#63dbc7` |
| success context | existing secondary `#e5f4ee` / `#086459` | `#173a36` / `#90e4d4` |
| warning context | `#fff3de` / `#855710` | `#3a3020` / `#ffd590` |
| danger context | `#fcebf0` / `#a92c49` | `#402636` / `#ffb3c5` |

Existing `scripts/design-smoke.mjs` verifies thirteen text/background token pairs at >=4.5:1 in both themes; this does **not** certify every rendered element, border, map, chart or focus state. Spacing proposal: 4/8/12/16/24/32/48; inputs/buttons at least 44px, primary action 48px; form text >=16px; 10–16px control radius, 20px surface radius, constrained reading width; one level of low-opacity elevation. These are guidance where existing values differ, not a blanket new token rollout. Charts need semantic series tokens plus labels/patterns; do not rely on mint versus teal alone.

Keep Arabic RTL via logical margin/padding and correct arrow direction. Latin and Arabic type need separate line-height/wrapping acceptance, not arbitrary letter-spacing. Use empty/loading/error/success states with an actionable next step, not decorative illustration replacing feedback. Preserve reduced-motion CSS and native preference; future screens must honor both system and account preferences. Avoid repeatedly recreating interactive children or boolean-prop-heavy components; extract measured domain/state boundaries, not wrappers for their own sake.

## Actual first UI change

`components/landing-page.tsx` and `app/design-refinement.css`:

- Patient action stays the sole filled hero button. The pharmacy action is a labelled, underlined 48px text link to the pharmacy section, where pricing and registration are explained.
- The localized manual-confirmation reminder is visible below the action and associated with it using `aria-describedby`.
- Removed two decorative numbered brand labels above explanatory headings, while keeping useful numbered process steps.
- Existing four-language copy is reused; no unreviewed new Kabyle medical/legal terms, fake proof, new screenshot artwork or availability claims.

The new API is not yet connected to a guest browse UI. The primary action still requires account verification for submitting a medicine request. Broad search/reservation/pharmacy/admin redesign is pending role-flow testing, not silently declared complete.

## Concrete skill use

All fourteen are AVAILABLE. Requests below are the exact `$name` invocation style, with a short task-specific request. The main audit supplies architecture, scale, safety and sequencing; this document supplies UI/skill evidence.

| Invocation | Concrete use, affected paths and limitations |
|---|---|
| `$frontend-design Audit and refine the existing LQADWA interface` | Preserve existing identity; reduce competing hero actions and add honest availability context in `landing-page.tsx`; actual mobile baseline inspected. Other role redesigns not shipped. |
| `$redesign-existing-projects Audit existing journeys before incremental redesign` | Inventory above; identified duplicated guest sections and full client view, retained existing rounded brand/menu behavior. No purposeless palette reset. |
| `$design-taste-frontend Review the public landing and run look-and-fix checks` | Read copy/critique guidance, ran inspected source linter before/after, used actual local screenshot. Removed two redundant section labels/outline hero control. Native browser inspector script was NOT RUN: browser interaction used the documented Cua Playwright surface. Full critique loop blocked by desktop capture timeouts. |
| `$web-design-guidelines Review role-specific accessibility and responsive UX` | Primary Vercel guidelines read; checked landmarks, one h1, localized menu/combobox, named theme/menu controls, RTL and measured overflow in actual browser DOM. Kept visible focus styling and >=44px source checks. No full WCAG/axe/AT pass claimed. |
| `$vercel-react-best-practices Measure client loading, imports and polling` | Measured `app/page.tsx` 52,005 source bytes; reviewed visibility-aware polling/clock, map and OCR imports. Leaflet and OCR are already dynamically loaded; don't report their complete absence. New backend avoids pre-search full snapshot; no invented CWV improvement. |
| `$systematic-debugging Reproduce the national discovery failure and regress it` | Corrected fixture SQL constraints, captured baseline 400, isolated cap-before-city root cause, wrote discovery/race integration plus five-scale tests; fixed shared-state harness. Retained failed connection/rate-limit evidence. |
| `$webapp-testing Check local guest and synthetic role flows` | Local Worker, synthetic Auth stub and D1 only; real menu/theme/locale interactions via Cua Playwright. Existing/new API flow gates; actual screenshot and actual viewport widths recorded below. No production account or cross-browser fixture manipulation. |
| `$canvas-design Assess optional LQADWA marketing explorations` | Used hierarchy/restraint guidance to assess the existing illustrative route/phone art; it must remain decorative, not proof of live stock. Optional static board/assets were not necessary for this functional first slice; NONE generated or represented as actual screenshots. |
| `$theme-factory Refine the existing custom navy/mint semantic theme` | Inventoried existing light/dark custom tokens rather than replacing them with a preset. Reused tested primary/muted tokens for the new secondary link/reminder. Token table/contrast limitations above. |
| `$vercel-composition-patterns Separate domain boundaries without breaking clients` | Dedicated discovery repository/query module plus legacy adapter; documented small controlled view/state boundaries for future React extraction. No wholesale `app/page.tsx` rewrite or boolean-state abstraction. |
| `$verification-before-completion Verify before claiming a fix` | Exact local commands/results and known skipped gates in `phase-one-verification.md`; no production or all-roadmap completion claim. |
| `$copywriting Review truthful multilingual conversion copy` | Reused AR/FR/EN availability disclaimer next to CTA; pharmacy link leads to price/approval explanation. Declined response-time, coverage, stock/clinical guarantees: would need real response samples, verified coverage and pharmacist approval. Kabyle human review remains required. |
| `$seo-audit Inspect public rendering and metadata without exposing accounts` | Root shell/client auth dependency and absent observed canonical found; metadata exists, so not “no SEO.” Plan SSR public locale URLs/hreflang/robots/sitemap; account/admin/request pages noindex and authenticated, never fabricated pharmacy pages. Not implemented in this PR. |
| `$find-skills Identify only trustworthy relevant installed additions` | Verified installed Supabase/Postgres guidance, UI/UX Pro Max and shadcn availability. Read Supabase guidance for Auth/PII assessment; D1 remains SQLite, no PostgreSQL/RLS syntax applied. No external skill/package installed. |

## Browser evidence and visual review

Baseline: local build of the recorded HEAD, Brave/Chromium extension. A temporary tab was created; no production user tabs were changed. Browser viewport overrides did not produce the requested width exactly: requested 1440 was observed at **1600**, requested 375 at **416**. Therefore neither requested breakpoint is certified. Observed overflow checks passed at those two actual widths.

Observed: Arabic RTL landing at 1600 light; English landing at 416 light then dark; mobile dialog switching English → Kabyle → French → Arabic in dark mode. Menu has a labelled locale combobox, close control and sign-in; no guest account/notification icon. One h1 and header/main landmarks observed. All-language display is not linguistic/medical equivalence acceptance.

Actual English dark mobile screenshot: local ignored `.cloudflare/phase-one/baseline-mobile-dark.png`. It was opened and visually inspected. Desktop capture attempts timed out; no desktop screenshot is claimed. A screenshot is not a generated design board or a physical phone test.

Final-build local DOM recheck: Arabic light and dark at observed 416px, no horizontal overflow; the pharmacy hero link targets `#for-pharmacies`, and `aria-describedby` resolves to the visible availability reminder. Final screenshot attempts also timed out, so a pixel-level before/after comparison is **not** claimed. The temporary tab was closed and viewport override reset.

### ROUND 1: actual mobile baseline critique

One-second read: medicine search and route planning. Idea: pharmacy orientation, not shopping. Layout: readable heading/paragraph, two similarly prominent actions, APK link and decorative route panel. Live-page checks: language/theme/menu work; declaration-level contrast passes; exact supported breakpoints/keyboard/AT still incomplete.

Bounded subjective baseline scores (mobile only, not an award or acceptance certificate): clarity 6/10, hierarchy 6/10, restraint 5/10, brand coherence 7/10. No desktop score assigned without a screenshot. Top three changes: reduce competing pharmacy action; bring manual-confirmation qualification next to CTA; remove repetitive decorative brand labels. Those are the first UI changes above. Full visual-scoring acceptance and remaining redundant sections need follow-up screenshots/usability research.

## Remaining UI acceptance matrix

NOT TESTED: exact 320/360/375/390/414/768/1024/1440 × ar/fr/en/kab × light/dark across guest/patient/pharmacy/admin; Firefox/WebKit; axe and NVDA/TalkBack; keyboard-only full journeys; browser reduced-motion simulation; maps with denied GPS/provider failures; actual field CWV. Existing source/API smoke tests cover subsets, not this matrix. CI does not yet install/run a cross-browser screenshot suite. Proposed next slice should add narrowly scoped repeatable E2E fixtures before turning these into release gates.

SEO next-slice acceptance: initial HTML contains factual public content without `/api/app`; language-specific title/description/canonical/alternates; navigable locale URLs and actual sitemap/robots; private pages excluded; no real medication history in analytics/URLs. Structured data only for factual organization/software metadata once operator identity is confirmed, not fictional local-business ratings.
