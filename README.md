# DevPanda

> The fast path from tutorial to production.

![DevPanda home page](./docs/screenshots/devpossum-home.png)

A developer education demo app built with **Next.js 16** and **GrowthBook**. Feature flags and A/B tests evaluate in the SDK; experiment analysis and product events land in GrowthBook **Managed Warehouse** (ClickHouse). Designed to show how that loop works in a realistic SaaS context.

## What's in here

| Layer | Tool | Purpose |
|---|---|---|
| App | Next.js 16 (App Router) | Framework |
| Feature flags + A/B testing | GrowthBook | `lib/growthbook.ts` |
| Event ingest + analysis | Managed Warehouse | SDK tracking plugin + `lib/analytics.ts` |
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
| `ai-lesson-hints` | `false` | "Ask for a hint" panel next to the lesson playground | `/courses/.../lessons/...` |
| `personalized-course-banner` | `false` | Personalized "Picked for you" banner on the catalog | `/courses` |
| `hero-cta-text` | `"Start Learning Free"` | Hero CTA copy, served by the Homepage hero CTA experiment | `/` |

## Experiments

`hero-cta-text` runs through its flag's experiment-ref rule, so GrowthBook controls it. `pricing-plan-highlight` and `onboarding-flow` are inline `useExperiment` calls: the split lives in code and GrowthBook only analyzes them.

| Experiment key | Page | Variants | Metric |
|---|---|---|---|
| `hero-cta-text` | `/` | "Start Learning Free" / "Build Your First Project" / "Join 50,000 Developers" | `Sign Up` |
| `pricing-plan-highlight` | `/pricing` | Equal layout / Pro highlighted | `Sign Up` |
| `onboarding-flow` | `/onboarding` | Skill picker / 5-question quiz | `Sign Up` |

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

## Events (Managed Warehouse)

The client tracking plugin sends **Experiment Viewed** and feature usage to
`*.gb-ingest.com`. Custom product events go through `gb.logEvent` in
`lib/analytics.ts`. Attributes always include both `id` and `device_id` (the
same `dp_anon_id`) so SDK hashing and warehouse assignment queries agree.

- `Page View` — one per navigation (fired from `components/analytics-tracker.tsx`)
- `Sign Up` — registration complete (`method`); this is the experiment goal metric (72-hour conversion window)
- `Course View` — course detail opened
- `Lesson Start` — lesson begins rendering
- `Lesson Complete` — user marks complete (`time_spent_seconds`)
- `CTA Click` — any primary CTA (`cta_text`, `location` — no variant; see below)
- `Pricing View` — pricing page load (`highlighted_plan`)
- `Begin Checkout` — plan selected
- `Purchase` — subscription confirmed (defined, not fired: the demo has no payment step)
- `Experiment Viewed` — **canonical exposure**, emitted once per experiment by the tracking plugin (`experimentId`, `variationId`)
- Feature usage — flag evaluations, emitted by the plugin (not on every render)

> **Exposure is not piggy-backed on other events.** A user can be in several
> experiments at once and exposure must not depend on whether they later click,
> so variant lives only on Experiment Viewed. GrowthBook joins it to Sign Up
> on `device_id`.

Historical demo traffic is backfilled with `scripts/seed_devpanda_history.py --seed`
(do not run it twice — ingest is not idempotent).

## Demo walkthrough

Visit `/demo` for the live control panel showing current flag states, active experiment variants, and copy-pasteable warehouse queries. See [`docs/docs.md`](./docs/docs.md) for the full teaching guide with screenshots.

**The aha moment:**

> "I ran the new dashboard as a monitored rollout. The lesson-completion guardrail regressed for the exposed group, so I flipped the flag off in seconds — before a single user filed a support ticket."

(A percentage rollout is observational. For a causal read of the effect, run the feature as a GrowthBook experiment and analyze it from Experiment Viewed exposures.)

## GrowthBook setup

1. Create a free account at [growthbook.io](https://www.growthbook.io)
2. Create a new project → SDK Connections → copy your client key
3. Provision **Managed Warehouse** (Metrics and Data → Data Sources) if the org does not already have it
4. Create the feature flags and experiments using the keys above; goal metric is Sign Up on the Events fact table
5. Add your client key to `.env.local`

## Design doc

See [`canvases/devpossum-demo-design.canvas.tsx`](./canvases/devpossum-demo-design.canvas.tsx) for the original design specification (app concept, flag/experiment specs, UI flow). Event ingest described there as GA4/BigQuery is outdated — the live path is Managed Warehouse as above.
