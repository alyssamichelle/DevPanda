# DevPanda — Teaching & Demo Guide

DevPanda is a fictional developer-learning platform wired end-to-end to **GrowthBook** (feature flags + experiments) and **Managed Warehouse** (event ingest + analysis). This guide is the script for a live demo or blog post, and a reference for the patterns the app is meant to teach.

The emphasis is on getting the *measurement* right: where flags are evaluated, how experiment exposure is recorded, how analytics events are named, and how GrowthBook joins exposures to Sign Up. Several common-but-wrong patterns are called out explicitly under [Anti-patterns this app avoids](#anti-patterns-this-app-avoids).

> Screenshots below were captured locally with no GrowthBook key, so flags resolve to their defaults. To preview a flag's UI without a key, append `?ff=<flag-key>` (comma-separated for several) in development — e.g. `/dashboard?ff=new-dashboard-layout`. This uses GrowthBook's `setForcedFeatures`, the same mechanism the GrowthBook DevTools use.

---

## Architecture at a glance

| Concern | Where it lives | Notes |
|---|---|---|
| Anonymous id | `proxy.ts` | Stamps a stable `dp_anon_id` cookie. Edge-only; sets a cookie, does **not** render UI. |
| Feature payload | `lib/growthbook-server.ts` | Fetched once on the server, cached via `fetch` revalidation. |
| Flag/experiment evaluation | GrowthBook SDK (client), bootstrapped from server payload + id | First client render matches server HTML → no flag flicker. |
| Event tracking | `lib/analytics.ts` + `components/analytics-tracker.tsx` | One `Page View` per navigation via `gb.logEvent`. |
| Exposure | `growthbookTrackingPlugin` in `lib/growthbook.ts` (client only) | One `Experiment Viewed` per experiment, at assignment. |
| Flag telemetry | Same plugin | Feature usage events; not on every render. |
| Analysis | Managed Warehouse + GrowthBook results | Sign Up fact metric, 72-hour conversion window. SQL Explorer snippets on `/demo`. |

### Server vs. client evaluation (the part people get wrong)

Middleware/proxy **cannot render UI** — it runs on the Edge and can only rewrite, redirect, or set headers/cookies. So flags are *not* "evaluated in middleware to render the page." Instead:

1. `proxy.ts` stamps a stable `dp_anon_id` cookie (and forwards it to the same render so the first request is consistent).
2. The root layout (a Server Component) fetches the GrowthBook payload once (cached) and passes it + the id to the client.
3. The client SDK initializes with that same payload + id, so the first client render computes the same values the server did — no flicker, consistent bucketing.

---

## The demo, page by page

### 1. Home — the hero CTA experiment

`hero-cta-text` is a string flag that sets the primary CTA copy. Its experiment-ref rule serves the 3-way **Homepage hero CTA** experiment, so GrowthBook decides who sees which copy: stop the experiment or roll out a winner there and the button changes with no deploy. Exposure fires the moment the flag assigns a variant (via the tracking plugin), **not** when the user clicks — so non-clickers stay in the denominator.

![DevPanda home, control variant](./screenshots/devpossum-home.png)

The `social-proof-widget` flag adds a credibility badge to the hero. Here it is forced on with `/?ff=social-proof-widget`:

![DevPanda home with the social proof badge](./screenshots/devpossum-home-socialproof.png)

### 2. Courses — a flag that changes content live

`ai-course-recommendations` swaps popularity sort for a personalized "Recommended for you" rail. Toggling it in GrowthBook changes the page on next load with no deploy.

| Off (default) | On (`?ff=ai-course-recommendations`) |
|---|---|
| ![Courses, popularity sort](./screenshots/devpossum-courses.png) | ![Courses, AI recommendations](./screenshots/devpossum-courses-ai.png) |

### 3. Lesson player — two flags at once

A Pro lesson with both `pro-upsell-banner` and `beta-code-playground` forced on (`?ff=beta-code-playground,pro-upsell-banner`). The upsell button fires a `Begin Checkout` event to Managed Warehouse.

![Lesson player with upsell banner and code playground](./screenshots/devpossum-lesson-playground.png)

### 4. Pricing — an experiment + ecommerce events

`pricing-plan-highlight` decides whether Pro gets the "Most Popular" treatment. It's an inline experiment defined in code (`useExperiment`), bucketed client-side by the anon id, so it's stable per visitor; GrowthBook analyzes its exposures but doesn't control the split. Selecting a plan fires `Begin Checkout`. There's no payment step in the demo, so `Purchase` never fires.

![Pricing page, Pro highlighted variant](./screenshots/devpossum-pricing.png)

### 5. Dashboard — the rollback story

`new-dashboard-layout` gates a richer dashboard (XP, streaks, progress rings). This is the feature in the "aha moment."

| Classic (default) | New layout (`?ff=new-dashboard-layout`) |
|---|---|
| ![Classic dashboard](./screenshots/devpossum-dashboard-classic.png) | ![New dashboard with XP and streaks](./screenshots/devpossum-dashboard-new.png) |

### 6. Demo control panel — `/demo`

A live view of every flag state, the current experiment assignment per experiment, and copy-pasteable Managed Warehouse queries.

![Demo control panel](./screenshots/devpossum-demo-panel.png)

---

## Walkthrough script (~8 min)

1. **Set the scene** — open `/`. Point out the hero CTA; explain it's served by the `hero-cta-text` flag running an experiment, and that exposure is logged on view, not click.
2. **Live flag toggle** — flip `ai-course-recommendations` in GrowthBook, reload `/courses`. The grid changes with no deploy.
3. **Experiment assignment** — open `/demo`, show the current bucket per experiment and that it's stable across reloads (anon id).
4. **Experiment analysis** — open the Homepage hero CTA experiment in GrowthBook (served by the `hero-cta-text` flag). It joins Experiment Viewed exposures to Sign Up (72-hour window), so the rate is computed over everyone exposed. If intervals still cross zero, the honest read is keep it running.
5. **The rollback** — on `new-dashboard-layout`, a completion-rate guardrail regression for the exposed group is a signal to toggle it off. Seconds, not a hotfix.

> **Be honest about causality.** A percentage rollout is *observational* — a guardrail regression is a signal to roll back and investigate, not a proven causal effect. For a causal read, run the feature as a GrowthBook experiment and analyze it from Experiment Viewed exposures.

---

## Event taxonomy (Managed Warehouse)

| Event | When | Key params | Notes |
|---|---|---|---|
| `Page View` | every navigation | `page_title`, `page_location` | Exactly one per client navigation. |
| `Sign Up` | registration | `method` | Experiment goal metric; 72-hour conversion window. |
| `Course View` | course detail opened | `course_id`, `category`, `is_free` | |
| `Lesson Start` / `Lesson Complete` | lesson lifecycle | `lesson_id`, `time_spent_seconds` | `Lesson Complete` is idempotent per lesson. |
| `CTA Click` | primary CTA | `cta_text`, `location` | **No variant** — exposure owns that. |
| `Pricing View` | pricing load | `highlighted_plan` | |
| `Begin Checkout` | plan selected | `currency`, `value`, `items` | |
| `Purchase` | subscription confirmed | `transaction_id`, `currency`, `value`, `items` | Defined (`trackPurchase`) but not fired: the demo has no payment step. |
| `Experiment Viewed` | assignment | `experimentId`, `variationId` | **Canonical exposure**, one per experiment, via the tracking plugin. |
| Feature usage | flag evaluation | `feature` | Plugin; not on every render. |

Identity is `id` + `device_id` on **attributes** (both set to `dp_anon_id`), never a variation field on product events.

---

## Warehouse patterns

Queries live in `WAREHOUSE_QUERIES` (`lib/analytics.ts`) and are shown on `/demo` for SQL Explorer. Three rules they all follow:

- **Event names are Title Case** (`Experiment Viewed`, `Sign Up`) to match ingest and the Sign Up fact metric.
- **Join on `device_id`.** That is the Managed Warehouse assignment-query identifier. The SDK also hashes on `id`; we send both as the same anon id.
- **Bound exposure → conversion by the metric window (72 hours), not by date equality.** A conversion on a later day than the exposure must still count if it is inside the window.

Exposure counts for the hero CTA (abridged from `experimentImpact`):

```sql
SELECT
  variation_id,
  uniq(device_id) AS exposed_users
FROM experiment_views
WHERE experiment_id = 'hero-cta-text'
GROUP BY variation_id
ORDER BY variation_id
```

GrowthBook's experiment results page runs the actual exposure→Sign Up join. Live clicks appear within seconds; historical volume comes from `scripts/seed_devpanda_history.py`.

---

## Anti-patterns this app avoids

These are the mistakes the original concept risked teaching. Each is fixed in the code; this list is the "why."

1. **"Flags are evaluated in middleware to render the page."** Middleware/proxy can't render — it sets the `dp_anon_id` cookie. Values come from the SDK, bootstrapped from a cached server payload.
2. **Exposure piggy-backed on `Page View`/`CTA Click`.** Exposure is its own `Experiment Viewed` event at assignment. A user can be in several experiments at once; a single variant field can't represent that, and tying exposure to clicks biases the denominator.
3. **An analytics event on every flag evaluation.** Feature usage is handled by the tracking plugin, not a per-render callback.
4. **A second analytics pipeline for experiments.** Product events and exposures go to Managed Warehouse only. GA4 is not in the loop.
5. **Double-counted `Page View`.** One manual event per navigation, guarded against React StrictMode's double-effect.
6. **Wrong identity or event name.** `device_id` + `id` must match; `Sign Up` must be spelled exactly that way or the fact metric will not count it.
7. **Reading causal lift from a rollout.** A percentage rollout is observational; guardrail regressions are signals, and causal claims need a randomized experiment.

---

## Running it

```bash
npm install
cp .env.local.example .env.local   # optional: add GrowthBook client key
npm run dev                         # http://localhost:3000
```

Without a client key, every flag serves its default and the app is fully navigable. Add a GrowthBook client key to toggle flags live and to emit events to Managed Warehouse.
