"use client";

import { useExperiment } from "@growthbook/growthbook-react";
import Link from "next/link";
import { ExperimentIndicator } from "@/components/flag-indicator";
import { trackPricingView, trackBeginCheckout } from "@/lib/analytics";
import { EXPERIMENTS } from "@/lib/growthbook";
import { useEffect } from "react";
import posthog from "posthog-js";

const PLANS = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    description: "Everything you need to get started.",
    features: [
      "Access to all free courses",
      "Progress tracking",
      "Community forum access",
      "Certificate of completion",
    ],
    cta: "Start for free",
    href: "/onboarding",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    description: "Unlock every course and go deep.",
    features: [
      "Everything in Free",
      "All Pro courses unlocked",
      "Interactive code playground",
      "Downloadable resources",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/onboarding?plan=pro",
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 49,
    description: "For engineering teams leveling up together.",
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "Team progress dashboard",
      "Custom learning paths",
      "Slack integration",
    ],
    cta: "Start team trial",
    href: "/onboarding?plan=team",
  },
];

export default function PricingPage() {
  // Experiment: highlight the Pro plan as "Most Popular"
  const { value: highlightPro } = useExperiment({
    key: EXPERIMENTS.PRICING_HIGHLIGHT,
    variations: [false, true],
  });

  useEffect(() => {
    // Exposure for this experiment is recorded by GrowthBook's trackingCallback
    // (experiment_viewed); pricing_view just records which layout was shown.
    trackPricingView(highlightPro ? "pro" : "none");
  }, [highlightPro]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-white">Simple, honest pricing</h1>
        <p className="mt-3 text-zinc-400">
          Start free. Upgrade when you want more.
        </p>
        <div className="mt-4 flex justify-center">
          <ExperimentIndicator
            experimentKey={EXPERIMENTS.PRICING_HIGHLIGHT}
            variant={highlightPro ? "pro-highlighted" : "control"}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isHighlighted = highlightPro && plan.id === "pro";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-7 transition-all ${
                isHighlighted
                  ? "border-2 border-indigo-500 bg-indigo-950/30 scale-[1.02]"
                  : "border border-zinc-800 bg-zinc-900"
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${plan.priceMonthly}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-zinc-500">/mo</span>
                  )}
                </div>
              </div>

              <ul className="mb-8 flex flex-1 flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                onClick={() => {
                  trackBeginCheckout({
                    id: plan.id,
                    name: plan.name,
                    priceMonthly: plan.priceMonthly,
                  });
                  posthog.capture("checkout_started", {
                    plan_id: plan.id,
                    plan_name: plan.name,
                    monthly_price: plan.priceMonthly,
                  });
                }}
                className={`block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  isHighlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-zinc-500">
        All plans include a 14-day money-back guarantee. No questions asked.
      </p>
    </div>
  );
}
