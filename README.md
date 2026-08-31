# DevPanda

> The fast path from tutorial to production.

![DevPanda home page](./docs/screenshots/devpossum-home.png)

A developer education demo app built with **Next.js 16**, **GrowthBook**, **GA4**, and **BigQuery**. Designed to show how feature flags and A/B experiments work in a realistic SaaS context.

## What's in here

| Layer | Tool | Purpose |
|---|---|---|
| App | Next.js 16 (App Router) | Framework |
| Feature flags + A/B testing | GrowthBook | `lib/growthbook.ts` |
| Analytics | Google Analytics 4 | `lib/analytics.ts` |
| Data analysis | BigQuery | See queries in `lib/analytics.ts` or `/demo` |
| Styles | Tailwind CSS v4 | `app/globals.css` |

## Quick start

```bash
# Install dependencies
npm install

# Copy the env file and fill in your keys
cp .env.local.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Feature flags

All flags are evaluated by the GrowthBook SDK. Without a client key they return their default values so the app still works.

| Flag key | Default | Controls | Page |
|---|---|---|---|
| `ai-course-recommendations` | `false` | AI vs. popularity sort on the course grid | `/courses` |
| `beta-code-playground` | `false` | Inline code editor in lessons | `/courses/.../lessons/...` |
| `pro-upsell-banner` | `true` | Mid-lesson upgrade prompt | `/courses/.../lessons/...` |
| `new-dashboard-layout` | `false` | XP, streaks, and progress rings | `/dashboard` |
| `social-proof-widget` | `false` | "Join 50,000 devs" hero badge | `/` |

## Experiments

| Experiment key | Page | Variants | Metric |
|---|---|---|---|
| `hero-cta-text` | `/` | "Start Learning Free" / "Build Your First Project" / "Join 50,000 Developers" | `sign_up` |
| `pricing-plan-highlight` | `/pricing` | Equal layout / Pro highlighted | `checkout_start (plan=pro)` |
| `onboarding-flow` | `/onboarding` | Skill picker / 5-question quiz | `lesson_complete within 24h` |

## How evaluation works (server vs client)

- `proxy.ts` (Next.js 16's renamed middleware) stamps a stable `dp_anon_id`
  cookie. It only sets the cookie — it does **not** render UI or compute flag
  values (it runs on the Edge and can only rewrite/redirect/set headers &
  cookies).
- The root layout (a Server Component) fetches the GrowthBook feature payload
  **once**, cached via `fetch` revalidation (`lib/growthbook-server.ts`), and
  passes it plus the anon id to the client.
- The client SDK is initialized with that same payload + id, so the first client
  render matches the server HTML — no flag flicker / layout shift.

Without a client key the app serves flag defaults everywhere.

## GA4 events

Events are tracked via `lib/analytics.ts` and exported to BigQuery automatically
via the GA4 → BigQuery link.

- `page_view` — one per navigation (GA4 auto page_view is disabled; fired from `components/analytics-tracker.tsx`)
- `sign_up` — registration complete (`method`)
- `course_view` — course detail opened
- `lesson_start` — lesson begins rendering
- `lesson_complete` — user marks complete (`time_spent_seconds`)
- `cta_click` — any primary CTA (`cta_text`, `location` — no variant; see below)
- `pricing_view` — pricing page load (`highlighted_plan`)
- `begin_checkout` — plan selected (GA4 ecommerce: `currency`, `value`, `items`)
- `purchase` — subscription confirmed (GA4 ecommerce: `transaction_id`, `value`, `items`)
- `experiment_viewed` — **canonical exposure**, emitted once per experiment by GrowthBook's `trackingCallback` (`experiment_id`, `variation_id`)
- `feature_flag_evaluated` — flag usage, emitted once per (flag, value) per session via `onFeatureUsage`

> **Exposure is not piggy-backed on other events.** A user can be in several
> experiments at once and exposure must not depend on whether they later click,
> so variant lives only on `experiment_viewed`. Join it to metric events on
> `user_pseudo_id` in BigQuery.

## Demo walkthrough

Visit `/demo` for the live control panel showing current flag states, active experiment variants, and copy-pasteable BigQuery queries. See [`docs/docs.md`](./docs/docs.md) for the full teaching guide with screenshots.

**The aha moment:**

> "I ran the new dashboard as a monitored rollout. The lesson-completion guardrail regressed for the exposed group, so I flipped the flag off in seconds — before a single user filed a support ticket."

(A percentage rollout is observational. For a causal read of the effect, run the feature as a GrowthBook experiment and analyze it from `experiment_viewed` exposures.)

## GrowthBook setup

1. Create a free account at [growthbook.io](https://www.growthbook.io)
2. Create a new project → SDK Connections → copy your client key
3. Create the feature flags and experiments using the keys above
4. Add your key to `.env.local`

## BigQuery setup

1. Link your GA4 property to BigQuery (GA4 → Admin → BigQuery Linking)
2. Wait ~24h for the first data export
3. Run the queries from `lib/analytics.ts` or `/demo` against your exported dataset

## Design doc

See [`canvases/devpossum-demo-design.canvas.tsx`](./canvases/devpossum-demo-design.canvas.tsx) for the full design specification including the app concept rationale, flag/experiment specs, event schema, UI flow, and demo script.
