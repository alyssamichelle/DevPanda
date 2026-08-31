/**
 * GrowthBook configuration for DevPanda (client side).
 *
 * Evaluation model:
 *   - The client SDK is bootstrapped with a feature payload fetched on the
 *     SERVER (see `lib/growthbook-server.ts`, cached via `fetch` revalidation)
 *     and the visitor's stable anonymous id (a cookie stamped by
 *     `proxy.ts`). Because the client is initialized with the same
 *     payload + attributes the server used, the first client render matches
 *     the server-rendered HTML — no flag flicker / layout shift.
 *   - Experiment exposure is emitted exactly once per experiment by
 *     `trackingCallback` as `experiment_viewed`.
 *   - Flag usage is emitted at most once per (flag, value) per session by
 *     `onFeatureUsage` — never on every render.
 *
 * Without a client key, GrowthBook runs in "no-network" mode and all flags
 * return their default values, so the app still works out of the box.
 */

import { GrowthBook, type GrowthBookPayload } from "@growthbook/growthbook-react";
import { trackExperimentViewed, trackFeatureUsage } from "./analytics";

// ---- Feature flag keys ----
export const FLAGS = {
  AI_RECOMMENDATIONS: "ai-course-recommendations",
  CODE_PLAYGROUND: "beta-code-playground",
  PRO_UPSELL_BANNER: "pro-upsell-banner",
  NEW_DASHBOARD_LAYOUT: "new-dashboard-layout",
  SOCIAL_PROOF_WIDGET: "social-proof-widget",
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

// ---- Experiment keys ----
export const EXPERIMENTS = {
  HERO_CTA_TEXT: "hero-cta-text",
  PRICING_HIGHLIGHT: "pricing-plan-highlight",
  ONBOARDING_FLOW: "onboarding-flow",
} as const;

// ---- CTA experiment variant values ----
export const HERO_CTA_VARIANTS = [
  "Start Learning Free",
  "Build Your First Project",
  "Join 50,000 Developers",
] as const;

export type HeroCtaVariant = (typeof HERO_CTA_VARIANTS)[number];

export type GrowthBookBootstrap = {
  /** Stable per-visitor id from the `dp_anon_id` cookie. */
  anonId?: string | null;
  /** Feature definitions fetched + cached on the server. */
  payload?: GrowthBookPayload | null;
};

// De-dupe set so `onFeatureUsage` emits at most one telemetry event per
// (flag, value) per page session, regardless of how many components read it.
const _seenFeatureUsage = new Set<string>();

// ---- GrowthBook instance management ----
// On the CLIENT we keep a single instance per browser tab (one visitor).
// On the SERVER we must NOT share an instance across requests — the module is
// shared by every request in the Node process, so a singleton would leak one
// visitor's attributes (and experiment bucketing) into other users' renders and
// cause hydration mismatches. So the server always builds a fresh instance.
let _gb: GrowthBook | null = null;

export function getGrowthBook(bootstrap: GrowthBookBootstrap = {}): GrowthBook {
  const isServer = typeof window === "undefined";

  // Client singleton reuse. NOTE: this runs during React render (called from
  // useMemo), so it must be side-effect free for an existing instance. Never
  // call setAttributes() here — that notifies subscribers and triggers a
  // setState-during-render warning. Attribute updates happen in an effect
  // (see components/providers.tsx).
  if (!isServer && _gb) {
    return _gb;
  }

  const gb = new GrowthBook({
    apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST ?? "https://cdn.growthbook.io",
    clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY ?? "",
    enableDevMode: process.env.NODE_ENV !== "production",
    subscribeToChanges: true,
    attributes: bootstrap.anonId ? { id: bootstrap.anonId } : {},
    trackingCallback: (experiment, result) => {
      // Canonical, deduped-by-SDK exposure event.
      trackExperimentViewed(experiment.key, String(result.key));
    },
    onFeatureUsage: (featureKey, result) => {
      const dedupeKey = `${featureKey}:${String(result.value)}`;
      if (_seenFeatureUsage.has(dedupeKey)) return;
      _seenFeatureUsage.add(dedupeKey);
      trackFeatureUsage(featureKey, result.value);
    },
  });

  // Prefer the server-provided payload so the first render has correct values
  // (no flicker). `initSync` is synchronous for unencrypted payloads, which is
  // what lets the server and the client's first render agree on every variant.
  if (bootstrap.payload) {
    try {
      gb.initSync({ payload: bootstrap.payload });
    } catch {
      gb.init({ streaming: true }).catch(() => {});
    }
  } else {
    // No bootstrap payload (e.g. no client key configured): fall back to a
    // background load; flags serve defaults until/if it resolves.
    gb.init({ streaming: false }).catch(() => {});
  }

  // Cache only on the client. Each server request keeps its own instance.
  if (!isServer) {
    _gb = gb;
  }

  return gb;
}
