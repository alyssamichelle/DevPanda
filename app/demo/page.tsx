"use client";

import { useGrowthBook } from "@growthbook/growthbook-react";
import { WAREHOUSE_QUERIES } from "@/lib/analytics";
import {
  FLAGS,
  EXPERIMENTS,
  HERO_CTA_VARIANTS,
  createSilentGrowthBook,
} from "@/lib/growthbook";
import { useState } from "react";

type QueryKey = keyof typeof WAREHOUSE_QUERIES;

const FLAG_DOCS = [
  {
    key: FLAGS.AI_RECOMMENDATIONS,
    page: "/courses",
    description: "Switches the course grid between AI-personalized sort and popularity sort.",
    metric: "course enrollment rate",
  },
  {
    key: FLAGS.CODE_PLAYGROUND,
    page: "/courses/[slug]/lessons/[id]",
    description: "Embeds a live code editor inside lessons. Gated for beta users.",
    metric: "lesson completion rate",
  },
  {
    key: FLAGS.PRO_UPSELL_BANNER,
    page: "/courses/[slug]/lessons/[id]",
    description: "Shows a contextual upgrade prompt to free-tier users mid-lesson.",
    metric: "pro checkout_start rate",
  },
  {
    key: FLAGS.NEW_DASHBOARD_LAYOUT,
    page: "/dashboard",
    description: "New learner dashboard with progress rings, XP system, and streaks.",
    metric: "lesson completions / DAU",
  },
  {
    key: FLAGS.SOCIAL_PROOF_WIDGET,
    page: "/",
    description: 'Adds a "Join 50,000 developers" badge to the hero section.',
    metric: "sign_up conversion rate",
  },
  {
    key: FLAGS.AI_LESSON_HINTS,
    page: "/courses/[slug]/lessons/[id]",
    description: "Shows an Ask for a hint panel next to the lesson playground. Mock AI copy only.",
    metric: "lesson completion rate",
  },
  {
    key: FLAGS.PERSONALIZED_COURSE_BANNER,
    page: "/courses",
    description: "Personalized course banner on the catalog, gated to beta users.",
    metric: "course enrollment rate",
  },
];

const EXPERIMENT_DOCS = [
  {
    key: EXPERIMENTS.HERO_CTA_TEXT,
    page: "/",
    variants: HERO_CTA_VARIANTS,
    metric: "Sign Up",
  },
  {
    key: EXPERIMENTS.PRICING_HIGHLIGHT,
    page: "/pricing",
    variants: ["false (equal)", "true (Pro highlighted)"],
    metric: "Sign Up",
  },
  {
    key: EXPERIMENTS.ONBOARDING_FLOW,
    page: "/onboarding",
    variants: ["false (skill picker)", "true (5-question quiz)"],
    metric: "Sign Up",
  },
];

const QUERY_LABELS: Record<QueryKey, string> = {
  funnel: "Funnel: Page View → Sign Up → Course View → Lesson Complete",
  experimentImpact: "Experiment exposures for hero-cta-text (not CTA clicks)",
  flagRollout: "Monitored rollout: new-dashboard-layout evaluations",
};

export default function DemoPage() {
  const [activeQuery, setActiveQuery] = useState<QueryKey>("funnel");

  // Read flags and assignments from a copy with no tracking plugin. Using the
  // tracked hooks here would log Experiment Viewed for all three experiments on
  // every /demo visit, counting people who never saw those pages as exposed.
  // The provider re-renders this page on feature updates, so a fresh copy per
  // render stays in sync.
  const gb = useGrowthBook();
  const silentGb = gb ? createSilentGrowthBook(gb) : null;
  const isOn = (key: string) => silentGb?.isOn(key) ?? false;

  const flagValues: Record<string, boolean> = {
    [FLAGS.AI_RECOMMENDATIONS]: isOn(FLAGS.AI_RECOMMENDATIONS),
    [FLAGS.CODE_PLAYGROUND]: isOn(FLAGS.CODE_PLAYGROUND),
    [FLAGS.PRO_UPSELL_BANNER]: isOn(FLAGS.PRO_UPSELL_BANNER),
    [FLAGS.NEW_DASHBOARD_LAYOUT]: isOn(FLAGS.NEW_DASHBOARD_LAYOUT),
    [FLAGS.SOCIAL_PROOF_WIDGET]: isOn(FLAGS.SOCIAL_PROOF_WIDGET),
    [FLAGS.AI_LESSON_HINTS]: isOn(FLAGS.AI_LESSON_HINTS),
    [FLAGS.PERSONALIZED_COURSE_BANNER]: isOn(FLAGS.PERSONALIZED_COURSE_BANNER),
  };

  // Hero CTA comes from its flag; pricing and onboarding are inline experiments,
  // so run them on the silent copy with the same keys their pages use.
  const ctaVariant =
    silentGb?.getFeatureValue<string>(FLAGS.HERO_CTA_TEXT, HERO_CTA_VARIANTS[0]) ??
    HERO_CTA_VARIANTS[0];
  const pricingHighlight =
    silentGb?.run({ key: EXPERIMENTS.PRICING_HIGHLIGHT, variations: [false, true] }).value ??
    false;
  const onboardingQuiz =
    silentGb?.run({ key: EXPERIMENTS.ONBOARDING_FLOW, variations: [false, true] }).value ??
    false;

  const experimentValues: Record<string, string> = {
    [EXPERIMENTS.HERO_CTA_TEXT]: ctaVariant,
    [EXPERIMENTS.PRICING_HIGHLIGHT]: String(pricingHighlight),
    [EXPERIMENTS.ONBOARDING_FLOW]: String(onboardingQuiz),
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-10 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white">Demo Control Panel</h1>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            dev only
          </span>
        </div>
        <p className="text-zinc-400">
          Live view of all GrowthBook flags and experiment assignments for the current session.
          Toggle flags in your{" "}
          <a
            href="https://app.growthbook.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            GrowthBook workspace
          </a>{" "}
          and refresh to see changes here.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Feature Flags */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Feature Flags</h2>
          <div className="flex flex-col gap-3">
            {FLAG_DOCS.map((flag) => {
              const isOn = flagValues[flag.key] ?? false;
              return (
                <div
                  key={flag.key}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <code className="text-xs font-medium text-zinc-300 bg-zinc-800 rounded px-1.5 py-0.5">
                          {flag.key}
                        </code>
                        <span className="text-xs text-zinc-600">{flag.page}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{flag.description}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Metric: <span className="text-zinc-500">{flag.metric}</span>
                      </p>
                    </div>
                    <div
                      className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full px-1 transition-colors ${
                        isOn ? "bg-indigo-600" : "bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          isOn ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Experiments */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Experiments</h2>
          <div className="flex flex-col gap-3 mb-8">
            {EXPERIMENT_DOCS.map((exp) => {
              const assigned = experimentValues[exp.key];
              return (
                <div
                  key={exp.key}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <code className="text-xs font-medium text-zinc-300 bg-zinc-800 rounded px-1.5 py-0.5">
                      {exp.key}
                    </code>
                    <span className="text-xs text-zinc-600">{exp.page}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mb-2">
                    {exp.variants.map((v) => {
                      const isAssigned =
                        String(v) === assigned || String(v).includes(assigned ?? "");
                      return (
                        <div
                          key={String(v)}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                            isAssigned
                              ? "bg-indigo-950/60 text-indigo-300"
                              : "text-zinc-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              isAssigned ? "bg-indigo-400" : "bg-zinc-700"
                            }`}
                          />
                          {String(v)}
                          {isAssigned && (
                            <span className="ml-auto font-medium text-indigo-400">
                              ← current
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-zinc-600">
                    Metric: <span className="text-zinc-500">{exp.metric}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Warehouse queries */}
          <h2 className="mb-4 text-lg font-semibold text-white">Managed Warehouse queries</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Paste these into GrowthBook SQL Explorer. Experiment stats themselves live on the
            experiment results page — GrowthBook joins Experiment Viewed to Sign Up for you.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.keys(WAREHOUSE_QUERIES) as QueryKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setActiveQuery(k)}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  activeQuery === k
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="border-b border-zinc-800 px-4 py-2">
              <p className="text-xs text-zinc-400">{QUERY_LABELS[activeQuery]}</p>
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-300">
              <code>{WAREHOUSE_QUERIES[activeQuery]}</code>
            </pre>
          </div>
        </section>
      </div>

      {/* Demo script callout */}
      <section className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-3 font-semibold text-white">Demo walkthrough</h2>
        <ol className="flex flex-col gap-3">
          {[
            {
              step: 1,
              tool: "Browser",
              action: 'Open / — point out the hero CTA text (the hero-cta-text flag) and ask "does this look different to you?"',
            },
            {
              step: 2,
              tool: "GrowthBook",
              action: "Toggle ai-course-recommendations ON → refresh /courses — course grid changes live",
            },
            {
              step: 3,
              tool: "This page",
              action: "Show experiment assignments — explain bucketing and consistency",
            },
            {
              step: 4,
              tool: "GrowthBook",
              action:
                "Open the Homepage hero CTA experiment (served by the hero-cta-text flag) — Sign Up by variation from Experiment Viewed exposures (not clicks). Keep it running if intervals still cross zero.",
            },
            {
              step: 5,
              tool: "GrowthBook",
              action:
                "Run flagRollout — the completion-rate guardrail regressed for the exposed group, so toggle new-dashboard-layout OFF. Rollback in seconds. (Observational signal — run it as an experiment for a causal read.)",
            },
          ].map(({ step, tool, action }) => (
            <li key={step} className="flex items-start gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-900/60 text-xs font-semibold text-indigo-300">
                {step}
              </span>
              <div>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-400 mr-2">
                  {tool}
                </span>
                <span className="text-zinc-300">{action}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
