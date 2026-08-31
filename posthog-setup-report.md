# PostHog setup report

PostHog was initialized for the Next.js App Router, five anonymous product events were instrumented, global error capture was added, and a starter dashboard was created.

## Setup completed

- **Installed:** `posthog-js` is present in the application dependencies. The review removed the unused `posthog-node` dependency because no server-side PostHog code or route handler uses it. `npm install` completed successfully; npm reported six existing high-severity audit findings, which were not remediated in this run.
- **Initialized:** `instrumentation-client.ts` is the single browser initialization point. It reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`, enables exception capture, and preserves default capture behavior. The configured public keys were added to `.env.local`; `.env.example` documents the required names. Missing configuration is a development error and a production no-op.
- **Identity:** User identification was **skipped**. The application has no authentication lifecycle, user model, session provider, or stable user identifier. Events therefore remain anonymous and use PostHog's anonymous session identity. No `DISTINCT_ID` placeholders were introduced.
- **Error tracking:** `app/global-error.tsx` is the framework-level global error boundary and calls `posthog.captureException(error)` once when the boundary receives an error. No individual routes or components were wrapped.

## Events instrumented

| Event | What it measures | File |
|---|---|---|
| `onboarding_completed` | A visitor completes the learning-profile onboarding flow, using either the quiz or skill picker. | `app/onboarding/page.tsx` |
| `checkout_started` | A visitor selects a subscription plan and begins checkout. | `app/pricing/page.tsx` |
| `course_selected` | A visitor selects a course from a course card to view it. | `components/course-card.tsx` |
| `lesson_completed` | A visitor marks a lesson complete. | `app/courses/[slug]/lessons/[id]/page.tsx` |
| `pro_upsell_selected` | A visitor selects the Pro upgrade prompt from a lesson. | `app/courses/[slug]/lessons/[id]/page.tsx` |

The event plan uses non-PII product metadata only. Existing GA4 tracking was preserved and PostHog capture was added alongside it.

## Dashboard

[Analytics basics (wizard)](https://us.posthog.com/project/533963/dashboard/1925130)

The dashboard contains five tagged insights covering core event activity, checkout starts by plan, Pro upsell selections, a learning activation funnel, and a checkout-to-Pro-intent funnel. The insights may be empty until real traffic generates events.

## What the run verified

- `npm install` completed successfully.
- The production build completed successfully, including TypeScript compilation, and generated all eight routes after the dependency cleanup.
- The review confirmed browser-only imports are in client components, capture calls remain in action handlers, event names are snake_case, and the global error boundary is the only explicit uncaught-error capture point.
- Both public PostHog environment variable keys are present in `.env.local` (key presence was checked; secret values were not exposed).
- The dashboard and five insights were created successfully in PostHog.

## What the run did not verify

- No browser session or production-like user journey was exercised. The run did **not** observe any event arrive in PostHog, so event delivery and the actual event payloads remain unconfirmed.
- Error delivery was not runtime-tested.
- User identification was not tested because no authentication flow exists.
- No Content-Security-Policy was found in the reviewed configuration; if deployment adds one, its compatibility with PostHog remains unconfirmed.
- The test suite was not run by the upstream tasks.

## Unresolved issues and their cost

1. **Anonymous attribution remains unresolved by design.** No stable authenticated user ID exists. Until authentication supplies a stable primary key or UUID, activity cannot be reliably tied across devices or connected to a person profile. When authentication is added, wire `posthog.identify(stableUserId, ...)` on login and returning authenticated sessions, and `posthog.reset()` on logout.
2. **Event delivery is unresolved.** The build proves the code compiles, not that events flow. Without a real browser journey and PostHog verification, the dashboard could remain empty and funnel results could be incomplete.
3. **Lint is a build-process conflict.** `npm run lint` fails because the manifest invokes the removed Next.js 16 `next lint` command; it exits with `Invalid project directory provided, no such directory: .../lint`. This is a pre-existing script/configuration issue, not caused by the PostHog changes. The integrated production build and TypeScript checks pass.

## Before you merge

- [ ] Run a real browser journey through onboarding, pricing, course selection, lesson completion, and the Pro upsell, then confirm each event appears in PostHog; inspect the capture call sites in `app/onboarding/page.tsx` (approximately lines 60–83), `app/pricing/page.tsx` (approximately lines 93–101), `components/course-card.tsx` (approximately lines 14–20), and `app/courses/[slug]/lessons/[id]/page.tsx` (approximately lines 47–55 and 112–118).
- [ ] Run the test suite and update any mocks or fixtures affected by the new `posthog-js` imports and captures.
- [ ] Confirm `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` from `.env.example` are configured in every deploy environment, not only `.env.local`; check `instrumentation-client.ts` (approximately lines 3–21) and deployment configuration.
- [ ] Replace the incompatible `next lint` script or otherwise establish a working lint command, then run it; the conflict is recorded in `package.json` scripts.
- [ ] If deployment supplies a Content-Security-Policy, load the app and check the browser console for CSP violations affecting the SDK; review `instrumentation-client.ts` (approximately lines 15–20) and the deployed policy.
- [ ] If authentication is introduced, wire stable-user identification and logout reset, then verify the returning-user path; the current omission is documented in the identity section above.
