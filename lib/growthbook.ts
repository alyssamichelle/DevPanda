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
 *   - Experiment exposure and flag usage are sent to Managed Warehouse by
 *     `growthbookTrackingPlugin` (client only). Custom product events go
 *     through `gb.logEvent` in `lib/analytics.ts`.
 *
 * Without a client key, GrowthBook runs in "no-network" mode and all flags
 * return their default values, so the app still works out of the box.
 */

import { GrowthBook, type GrowthBookPayload } from "@growthbook/growthbook-react";
import { growthbookTrackingPlugin } from "@growthbook/growthbook/plugins";

// ---- Feature flag keys ----
export const FLAGS = {
  AI_RECOMMENDATIONS: "ai-course-recommendations",
  CODE_PLAYGROUND: "beta-code-playground",
  PRO_UPSELL_BANNER: "pro-upsell-banner",
  NEW_DASHBOARD_LAYOUT: "new-dashboard-layout",
  SOCIAL_PROOF_WIDGET: "social-proof-widget",
  AI_LESSON_HINTS: "ai-lesson-hints",
  PERSONALIZED_COURSE_BANNER: "personalized-course-banner",
  // String flag. Its experiment-ref rule serves the Homepage hero CTA
  // experiment (tracking key `hero-cta-text`), so GrowthBook controls the copy.
  HERO_CTA_TEXT: "hero-cta-text",
  // Boolean flags served by the Pricing plan highlight and Onboarding flow
  // experiments (experiment-ref rules). `onboarding-flow` was already taken by
  // an unrelated org-wide flag, hence the different key.
  PRICING_HIGHLIGHT: "pricing-plan-highlight",
  ONBOARDING_QUIZ: "onboarding-quiz",
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

// ---- Experiment tracking keys (as logged in Experiment Viewed) ----
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

/** SDK hashes on `id`; Managed Warehouse assignment queries join on `device_id`. */
export function visitorAttributes(
  anonId?: string | null
): { id: string; device_id: string } | Record<string, never> {
  if (!anonId) return {};
  return { id: anonId, device_id: anonId };
}

/**
 * A copy of `source` with no tracking plugin, for read-only views like /demo.
 * Evaluating flags or experiments on it never sends Experiment Viewed or
 * Feature Evaluated, so looking up an assignment doesn't count as an exposure.
 */
export function createSilentGrowthBook(source: GrowthBook): GrowthBook {
  const gb = new GrowthBook({ attributes: source.getAttributes() });
  gb.initSync({ payload: source.getPayload() });
  gb.setForcedFeatures(source.getForcedFeatures());
  gb.setForcedVariations(source.getForcedVariations());
  return gb;
}

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

  const clientKey = process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY ?? "";
  const ingestHost =
    process.env.NEXT_PUBLIC_GB_INGEST_HOST ?? "https://us-east-1.gb-ingest.com";

  const gb = new GrowthBook({
    apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST ?? "https://cdn.growthbook.io",
    clientKey,
    enableDevMode: process.env.NODE_ENV !== "production",
    subscribeToChanges: true,
    attributes: visitorAttributes(bootstrap.anonId),
    // Ingest only from the browser. A server instance with the plugin would
    // fire exposures during SSR and double-count with the client.
    plugins:
      !isServer && clientKey
        ? [
            growthbookTrackingPlugin({
              enable: true,
              ingestorHost: ingestHost,
            }),
          ]
        : [],
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
