/**
 * Product events for GrowthBook Managed Warehouse.
 *
 * Experiment exposure (`Experiment Viewed`) and flag usage are emitted by
 * `growthbookTrackingPlugin` in `lib/growthbook.ts` — do not log those here
 * or you will double-count. Custom events use `gb.logEvent` with Title Case
 * names so they match the warehouse fact table and the Sign Up metric
 * (`event_name` = "Sign Up", 72-hour conversion window).
 *
 * Identity lives on attributes (`id` + `device_id`), not on event properties.
 * CTA / page events never carry a variation — join to exposures instead.
 */

import { getGrowthBook } from "./growthbook";

export type EventParams = Record<string, unknown>;

export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  void getGrowthBook().logEvent(eventName, params);
}

export const CURRENCY = "USD";

// --- Navigation -----------------------------------------------------------

/** One Page View per client-side navigation (`components/analytics-tracker.tsx`). */
export function trackPageView(title: string, path: string): void {
  trackEvent("Page View", { page_title: title, page_location: path });
}

// --- Funnel ---------------------------------------------------------------

export function trackSignUp(method: "google" | "email" | "github"): void {
  trackEvent("Sign Up", { method });
}

export function trackCourseView(
  courseId: string,
  courseName: string,
  category: string,
  isFree: boolean
): void {
  trackEvent("Course View", {
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
  trackEvent("Lesson Start", {
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
  trackEvent("Lesson Complete", {
    lesson_id: lessonId,
    course_id: courseId,
    time_spent_seconds: timeSpentSeconds,
  });
}

/**
 * Generic primary-CTA click. Intentionally does NOT carry a variation —
 * exposure is owned by Experiment Viewed.
 */
export function trackCtaClick(ctaText: string, location: string): void {
  trackEvent("CTA Click", { cta_text: ctaText, location });
}

export function trackPricingView(highlightedPlan: string): void {
  trackEvent("Pricing View", { highlighted_plan: highlightedPlan });
}

// --- Checkout -------------------------------------------------------------

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

export function trackBeginCheckout(plan: PlanItem): void {
  trackEvent("Begin Checkout", {
    currency: CURRENCY,
    value: plan.priceMonthly,
    items: planItems(plan),
  });
}

export function trackPurchase(
  plan: PlanItem,
  transactionId: string,
  coupon?: string
): void {
  trackEvent("Purchase", {
    transaction_id: transactionId,
    currency: CURRENCY,
    value: plan.priceMonthly,
    coupon,
    items: planItems(plan),
  });
}

// --- SQL Explorer snippets (ClickHouse / Managed Warehouse) ---------------

export const WAREHOUSE_QUERIES = {
  funnel: `
-- Activation funnel: visit -> sign up -> enroll -> complete (distinct devices)
SELECT
  countIf(event_name = 'Page View') AS page_views,
  uniqIf(device_id, event_name = 'Sign Up') AS signups,
  uniqIf(device_id, event_name = 'Course View') AS enrolled,
  uniqIf(device_id, event_name = 'Lesson Complete') AS completions
FROM events
WHERE timestamp >= now() - INTERVAL 90 DAY
`.trim(),

  experimentImpact: `
-- Experiment exposures for hero-cta-text (not CTA clicks).
-- GrowthBook analysis joins these to Sign Up on device_id with a 72h window.
SELECT
  variation_id,
  uniq(device_id) AS exposed_users
FROM experiment_views
WHERE experiment_id = 'hero-cta-text'
GROUP BY variation_id
ORDER BY variation_id
`.trim(),

  flagRollout: `
-- Feature evaluations for the new-dashboard-layout rollout.
-- A percentage rollout is observational — treat a drop as a signal, not a causal result.
SELECT
  feature,
  uniq(device_id) AS users
FROM feature_usage
WHERE feature = 'new-dashboard-layout'
  AND timestamp >= now() - INTERVAL 90 DAY
GROUP BY feature
`.trim(),
} as const;
