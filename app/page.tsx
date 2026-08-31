"use client";

import Image from "next/image";
import Link from "next/link";
import { useExperiment, useFeatureIsOn } from "@growthbook/growthbook-react";
import { COURSES } from "@/lib/data";
import { CourseCard } from "@/components/course-card";
import { ExperimentIndicator, FlagIndicator } from "@/components/flag-indicator";
import { trackCtaClick } from "@/lib/analytics";
import { EXPERIMENTS, FLAGS, HERO_CTA_VARIANTS } from "@/lib/growthbook";

export default function HomePage() {
  // Experiment: hero CTA text (3 variants)
  const { value: ctaText } = useExperiment({
    key: EXPERIMENTS.HERO_CTA_TEXT,
    variations: [...HERO_CTA_VARIANTS],
  });

  // Flag: social proof widget
  const showSocialProof = useFeatureIsOn(FLAGS.SOCIAL_PROOF_WIDGET);

  const featuredCourses = COURSES.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        {showSocialProof && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-sm text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Join 50,000 developers learning this week
          </div>
        )}

        <Image
          src="/devpanda-logo.png"
          alt="DevPanda"
          width={524}
          height={524}
          className="mx-auto mb-8 h-56 w-56 sm:h-64 sm:w-64"
          priority
          unoptimized
        />

        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          The fast path from{" "}
          <span className="text-indigo-400">tutorial to production</span>
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          Focused, practical courses on TypeScript, React, Node.js, Docker, and more.
          Built for developers who want to ship — not just learn.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/onboarding"
            onClick={() => trackCtaClick(ctaText, "hero")}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {ctaText}
          </Link>
          <Link
            href="/courses"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Browse courses
          </Link>
        </div>

        {/* Dev mode: show active flags and experiment */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ExperimentIndicator
            experimentKey={EXPERIMENTS.HERO_CTA_TEXT}
            variant={ctaText}
          />
          <FlagIndicator
            flagKey={FLAGS.SOCIAL_PROOF_WIDGET}
            value={showSocialProof}
          />
        </div>
      </section>

      {/* Featured courses */}
      <section className="mt-24">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Featured courses</h2>
          <Link
            href="/courses"
            className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCourses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="mt-24 grid gap-8 sm:grid-cols-3">
        {[
          {
            title: "Learn by doing",
            body: "Every concept is backed by code you can run. No slide decks, no theory for theory's sake.",
          },
          {
            title: "Production-focused",
            body: "We skip the hello-world setup and go straight to the patterns you'd use in a real codebase.",
          },
          {
            title: "Built for busy developers",
            body: "Courses are short enough to finish in a weekend and deep enough to be worth your time.",
          },
        ].map(({ title, body }) => (
          <div key={title} className="rounded-xl border border-zinc-800 p-6">
            <h3 className="mb-2 font-semibold text-white">{title}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
