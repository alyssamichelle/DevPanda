"use client";

import { useFeatureIsOn, useFeatureValue, useExperiment } from "@growthbook/growthbook-react";
import { BQ_QUERIES } from "@/lib/analytics";
import { FLAGS, EXPERIMENTS, HERO_CTA_VARIANTS } from "@/lib/growthbook";
import { useState } from "react";

type QueryKey = keyof typeof BQ_QUERIES;

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
    metric: "sign_up",
  },
  {
    key: EXPERIMENTS.PRICING_HIGHLIGHT,
    page: "/pricing",
    variants: ["false (equal)", "true (Pro highlighted)"],
    metric: "checkout_start (plan=pro)",
  },
  {
    key: EXPERIMENTS.ONBOARDING_FLOW,
    page: "/onboarding",
    variants: ["false (skill picker)", "true (5-question quiz)"],
    metric: "lesson_complete within 24h",
  },
];

const BQ_LABELS: Record<QueryKey, string> = {
  funnel: "Funnel: browse → sign up → enroll → complete",
  experimentImpact: "Experiment lift: sign-up rate by hero-cta variation (exposure-based)",
  flagRollout: "Monitored rollout guardrail: new-dashboard-layout completion rate",
};

export default function DemoPage() {
  const [activeQuery, setActiveQuery] = useState<QueryKey>("funnel");

  // Read current flag states
  const aiRecs = useFeatureIsOn(FLAGS.AI_RECOMMENDATIONS);
  const playground = useFeatureIsOn(FLAGS.CODE_PLAYGROUND);
  const upsellBanner = useFeatureIsOn(FLAGS.PRO_UPSELL_BANNER);
  const newDashboard = useFeatureIsOn(FLAGS.NEW_DASHBOARD_LAYOUT);
  const socialProof = useFeatureIsOn(FLAGS.SOCIAL_PROOF_WIDGET);
  const lessonHints = useFeatureIsOn(FLAGS.AI_LESSON_HINTS);
  const personalizedBanner = useFeatureIsOn(FLAGS.PERSONALIZED_COURSE_BANNER);

  const flagValues: Record<string, boolean> = {
    [FLAGS.AI_RECOMMENDATIONS]: aiRecs,
    [FLAGS.CODE_PLAYGROUND]: playground,
    [FLAGS.PRO_UPSELL_BANNER]: upsellBanner,
    [FLAGS.NEW_DASHBOARD_LAYOUT]: newDashboard,
    [FLAGS.SOCIAL_PROOF_WIDGET]: socialProof,
    [FLAGS.AI_LESSON_HINTS]: lessonHints,
    [FLAGS.PERSONALIZED_COURSE_BANNER]: personalizedBanner,
  };

  // Read current experiment assignments
  const { value: ctaVariant } = useExperiment({
    key: EXPERIMENTS.HERO_CTA_TEXT,
    variations: [...HERO_CTA_VARIANTS],
  });

  const { value: pricingHighlight } = useExperiment({
    key: EXPERIMENTS.PRICING_HIGHLIGHT,
    variations: [false, true],
  });

  const { value: onboardingQuiz } = useExperiment({
    key: EXPERIMENTS.ONBOARDING_FLOW,
    variations: [false, true],
  });

  const experimentValues: Record<string, string> = {
    [EXPERIMENTS.HERO_CTA_TEXT]: ctaVariant,
    [EXPERIMENTS.PRICING_HIGHLIGHT]: String(pricingHighlight),
    [EXPERIMENTS.ONBOARDING_FLOW]: onboardingQuiz ? "quiz" : "skill-picker",
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

          {/* BigQuery queries */}
          <h2 className="mb-4 text-lg font-semibold text-white">BigQuery Queries</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.keys(BQ_QUERIES) as QueryKey[]).map((k) => (
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
              <p className="text-xs text-zinc-400">{BQ_LABELS[activeQuery]}</p>
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-300">
              <code>{BQ_QUERIES[activeQuery]}</code>
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
              action: 'Open / — point out the hero CTA text and ask "does this look different to you?"',
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
              tool: "BigQuery",
              action:
                "Run experimentImpact — sign-up rate by variation, joined from experiment_viewed exposures (not clicks). Let GrowthBook judge significance.",
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
