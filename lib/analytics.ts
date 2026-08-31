/**
 * GA4 analytics utilities.
 *
 * All events are automatically exported to BigQuery via the GA4 → BigQuery
 * link. Two rules keep the data clean:
 *
 *   1. Experiment exposure is recorded *once*, by the GrowthBook
 *      `trackingCallback` (see `lib/growthbook.ts`), as an `experiment_viewed`
 *      event with `experiment_id` + `variation_id`. We never smear a single
 *      `experiment_variant` field across unrelated events — a user can be in
 *      several experiments at once, and exposure must not depend on whether
 *      the user later clicks/converts.
 *
 *   2. Ecommerce uses GA4's recommended event names + parameters
 *      (`begin_checkout`, `purchase`, `value`, `currency`, `items`) so the
 *      built-in monetization reports and BigQuery `ecommerce` columns populate.
 *
 * Setup: add your GA4 Measurement ID to NEXT_PUBLIC_GA_MEASUREMENT_ID.
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
    dataLayer: unknown[];
  }
}

export type EventParams = Record<string, unknown>;

export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

export const CURRENCY = "USD";

// --- Navigation -----------------------------------------------------------

/**
 * Manual page_view. GA4 is configured with `send_page_view: false`
 * (see `app/layout.tsx`) so the only page_view per navigation is this one —
 * no double-counting on first load or on client-side route changes.
 */
export function trackPageView(title: string, path: string): void {
  trackEvent("page_view", { page_title: title, page_location: path });
}

// --- Funnel ---------------------------------------------------------------

export function trackSignUp(method: "google" | "email" | "github"): void {
  trackEvent("sign_up", { method });
}

export function trackCourseView(
  courseId: string,
  courseName: string,
  category: string,
  isFree: boolean
): void {
  trackEvent("course_view", {
    course_id: courseId,
    course_name: courseName,
    category,
    is_free: isFree,
  });
}

export function trackLessonStart(
  lessonId: string,
  courseId: string,
  lessonNumber: number
): void {
  trackEvent("lesson_start", {
    lesson_id: lessonId,
    course_id: courseId,
    lesson_number: lessonNumber,
  });
}

export function trackLessonComplete(
  lessonId: string,
  courseId: string,
  timeSpentSeconds: number
): void {
  trackEvent("lesson_complete", {
    lesson_id: lessonId,
    course_id: courseId,
    time_spent_seconds: timeSpentSeconds,
  });
}

/**
 * Generic primary-CTA click. Intentionally does NOT carry an
 * `experiment_variant` — exposure is owned by `experiment_viewed`. Join CTA
 * clicks to exposures on `user_pseudo_id` in BigQuery when you need variant
 * breakdowns.
 */
export function trackCtaClick(ctaText: string, location: string): void {
  trackEvent("cta_click", { cta_text: ctaText, location });
}

export function trackPricingView(highlightedPlan: string): void {
  trackEvent("pricing_view", { highlighted_plan: highlightedPlan });
}

// --- Ecommerce (GA4 recommended events) -----------------------------------

type PlanItem = { id: string; name: string; priceMonthly: number };

function planItems(plan: PlanItem) {
  return [
    {
      item_id: plan.id,
      item_name: `DevPanda ${plan.name}`,
      item_category: "subscription",
      price: plan.priceMonthly,
      quantity: 1,
    },
  ];
}

/** GA4 recommended `begin_checkout`. */
export function trackBeginCheckout(plan: PlanItem): void {
  trackEvent("begin_checkout", {
    currency: CURRENCY,
    value: plan.priceMonthly,
    items: planItems(plan),
  });
}

/** GA4 recommended `purchase`. `transaction_id` is required for dedup/reporting. */
export function trackPurchase(
  plan: PlanItem,
  transactionId: string,
  coupon?: string
): void {
  trackEvent("purchase", {
    transaction_id: transactionId,
    currency: CURRENCY,
    value: plan.priceMonthly,
    coupon,
    items: planItems(plan),
  });
}

// --- Experiment + flag telemetry ------------------------------------------

/**
 * Canonical experiment exposure. Called once per experiment by GrowthBook's
 * `trackingCallback` at assignment time (the SDK dedupes per session).
 * Event name + param shape match GrowthBook's GA4 data source so the stats
 * engine and BigQuery queries line up.
 */
export function trackExperimentViewed(experimentId: string, variationId: string): void {
  trackEvent("experiment_viewed", {
    experiment_id: experimentId,
    variation_id: variationId,
  });
}

/**
 * Flag-usage telemetry for monitored rollouts. Wired to GrowthBook's
 * `onFeatureUsage` and deduped per (flag, value) per session in
 * `lib/growthbook.ts`, so this fires at most a handful of times — never on
 * every render. No `user_id` param: GA4 keys events on `user_pseudo_id`
 * (and `user_id` is a reserved field set via config, not an event param).
 */
export function trackFeatureUsage(flagKey: string, flagValue: unknown): void {
  trackEvent("feature_flag_evaluated", {
    flag_key: flagKey,
    flag_value: String(flagValue),
  });
}

// --- BigQuery query reference ---------------------------------------------
// Documented for the /demo page. These run against the GA4 → BigQuery export.
// Notes that apply to all of them:
//   * Event parameters live in the repeated `event_params` RECORD, so each
//     read needs an UNNEST / scalar subquery — they are not flat columns.
//   * Joins use `user_pseudo_id` (the export's identity key), never `user_id`.
//   * Exposure → conversion is joined with a timestamp bound
//     (`completion_ts >= exposure_ts`), never a same-day equality, so a
//     conversion on a later day is still counted.

export const BQ_QUERIES = {
  funnel: `
-- Activation funnel: visit -> sign up -> enroll -> complete (distinct users)
SELECT
  DATE_TRUNC(PARSE_DATE('%Y%m%d', event_date), WEEK) AS cohort_week,
  COUNT(DISTINCT IF(event_name = 'page_view',      user_pseudo_id, NULL)) AS visitors,
  COUNT(DISTINCT IF(event_name = 'sign_up',        user_pseudo_id, NULL)) AS signups,
  COUNT(DISTINCT IF(event_name = 'course_view',    user_pseudo_id, NULL)) AS enrolled,
  COUNT(DISTINCT IF(event_name = 'lesson_complete',user_pseudo_id, NULL)) AS completions
FROM \`your_project.analytics_XXXXXXXXX.events_*\`
WHERE _TABLE_SUFFIX BETWEEN '20260101' AND '20261231'
GROUP BY 1
ORDER BY 1 DESC;
`.trim(),

  experimentImpact: `
-- Experiment lift: sign-up rate by variation for hero-cta-text.
-- Exposure comes from the canonical 'experiment_viewed' event, NOT from a
-- variant tagged onto cta_click. That keeps non-clickers in the denominator.
WITH exposures AS (
  SELECT
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'variation_id') AS variation_id,
    MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_exposure_ts
  FROM \`your_project.analytics_XXXXXXXXX.events_*\`
  WHERE event_name = 'experiment_viewed'
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'experiment_id') = 'hero-cta-text'
  GROUP BY user_pseudo_id, variation_id
),
conversions AS (
  SELECT user_pseudo_id, MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_conversion_ts
  FROM \`your_project.analytics_XXXXXXXXX.events_*\`
  WHERE event_name = 'sign_up'
  GROUP BY user_pseudo_id
)
SELECT
  e.variation_id,
  COUNT(DISTINCT e.user_pseudo_id) AS exposed_users,
  COUNT(DISTINCT IF(c.first_conversion_ts >= e.first_exposure_ts, e.user_pseudo_id, NULL)) AS converted_users,
  ROUND(SAFE_DIVIDE(
    COUNT(DISTINCT IF(c.first_conversion_ts >= e.first_exposure_ts, e.user_pseudo_id, NULL)),
    COUNT(DISTINCT e.user_pseudo_id)
  ) * 100, 2) AS conversion_rate_pct
FROM exposures e
LEFT JOIN conversions c USING (user_pseudo_id)
GROUP BY e.variation_id
ORDER BY conversion_rate_pct DESC;
`.trim(),

  flagRollout: `
-- Guardrail for the monitored rollout of new-dashboard-layout.
-- 'feature_flag_evaluated' is emitted once per user per flag value (deduped
-- client-side), so this is exposure, not per-render noise.
--
-- NOTE: a percentage rollout is observational, not a randomized experiment.
-- Treat a drop here as a guardrail SIGNAL to roll back / investigate -- to
-- claim causal lift, run new-dashboard-layout as a GrowthBook experiment and
-- use the experimentImpact pattern above.
WITH flag_exposure AS (
  SELECT
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'flag_value') AS flag_value,
    MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_seen_ts
  FROM \`your_project.analytics_XXXXXXXXX.events_*\`
  WHERE event_name = 'feature_flag_evaluated'
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'flag_key') = 'new-dashboard-layout'
  GROUP BY user_pseudo_id, flag_value
),
completions AS (
  SELECT user_pseudo_id, MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_completion_ts
  FROM \`your_project.analytics_XXXXXXXXX.events_*\`
  WHERE event_name = 'lesson_complete'
  GROUP BY user_pseudo_id
)
SELECT
  f.flag_value,
  COUNT(DISTINCT f.user_pseudo_id) AS users,
  COUNT(DISTINCT IF(c.first_completion_ts >= f.first_seen_ts, f.user_pseudo_id, NULL)) AS completers,
  ROUND(SAFE_DIVIDE(
    COUNT(DISTINCT IF(c.first_completion_ts >= f.first_seen_ts, f.user_pseudo_id, NULL)),
    COUNT(DISTINCT f.user_pseudo_id)
  ) * 100, 2) AS completion_rate_pct
FROM flag_exposure f
LEFT JOIN completions c USING (user_pseudo_id)
GROUP BY f.flag_value
ORDER BY f.flag_value;
`.trim(),
} as const;
