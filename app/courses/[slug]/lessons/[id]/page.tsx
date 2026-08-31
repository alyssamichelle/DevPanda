"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { getCourse, getLesson, getLessons } from "@/lib/data";
import { FlagIndicator } from "@/components/flag-indicator";
import { FLAGS } from "@/lib/growthbook";
import {
  trackLessonStart,
  trackLessonComplete,
  trackBeginCheckout,
} from "@/lib/analytics";
import posthog from "posthog-js";

export default function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const lesson = getLesson(id);
  const course = getCourse(slug);

  if (!lesson || !course) notFound();

  // Non-null assertions because notFound() throws; TS can't narrow across closures
  const definiteLesson = lesson!;
  const definiteCourse = course!;

  const lessons = getLessons(slug);
  const lessonIndex = lessons.findIndex((l) => l.id === id);
  const nextLesson = lessons[lessonIndex + 1];
  const prevLesson = lessons[lessonIndex - 1];

  // Flags
  const playgroundEnabled = useFeatureIsOn(FLAGS.CODE_PLAYGROUND);
  const showUpsellBanner = useFeatureIsOn(FLAGS.PRO_UPSELL_BANNER);

  // Track lesson start + elapsed time for lesson_complete
  const startTimeRef = useRef(Date.now());
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    trackLessonStart(definiteLesson.id, definiteCourse.slug, lessonIndex + 1);
  }, [definiteLesson.id, definiteCourse.slug, lessonIndex]);

  function handleComplete() {
    if (completed) return;
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    trackLessonComplete(definiteLesson.id, definiteCourse.slug, elapsed);
    posthog.capture("lesson_completed", {
      lesson_id: definiteLesson.id,
      course_id: definiteCourse.slug,
      lesson_number: lessonIndex + 1,
      time_spent_seconds: elapsed,
    });
    setCompleted(true);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex gap-10">
        {/* Sidebar: lesson list */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6">
            <Link
              href={`/courses/${slug}`}
              className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
            >
              ← {definiteCourse.title}
            </Link>
            <nav className="flex flex-col gap-1">
              {lessons.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/courses/${slug}/lessons/${l.id}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    l.id === id
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-500">
                    {i + 1}
                  </span>
                  <span className="truncate">{l.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <article className="min-w-0 flex-1">
          {/* Pro upsell banner (flag-gated) */}
          {showUpsellBanner && !definiteCourse.isFree && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3">
              <p className="text-sm text-amber-300">
                You&apos;re previewing a Pro lesson. Upgrade for full access.
              </p>
              <div className="flex items-center gap-3">
                <FlagIndicator flagKey={FLAGS.PRO_UPSELL_BANNER} value={showUpsellBanner} />
                <button
                  onClick={() => {
                    trackBeginCheckout({ id: "pro", name: "Pro", priceMonthly: 19 });
                    posthog.capture("pro_upsell_selected", {
                      course_id: definiteCourse.slug,
                      lesson_id: definiteLesson.id,
                      upsell_location: "lesson_banner",
                    });
                  }}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
                >
                  Upgrade →
                </button>
              </div>
            </div>
          )}

          {/* Lesson header */}
          <div className="mb-6">
            <p className="mb-1 text-sm text-zinc-500">
              Lesson {lessonIndex + 1} of {lessons.length} · {definiteLesson.durationMin} min
            </p>
            <h1 className="text-2xl font-bold text-white">{definiteLesson.title}</h1>
          </div>

          {/* Lesson body */}
          <div className="prose prose-invert max-w-none">
            <p className="text-zinc-300 leading-relaxed text-base">{definiteLesson.body}</p>
          </div>

          {/* Code playground (flag-gated) */}
          {playgroundEnabled && definiteLesson.hasCode && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Try it yourself</h3>
                <FlagIndicator flagKey={FLAGS.CODE_PLAYGROUND} value={playgroundEnabled} />
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-zinc-700" />
                    <span className="h-3 w-3 rounded-full bg-zinc-700" />
                    <span className="h-3 w-3 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-xs text-zinc-500 ml-2">playground.ts</span>
                </div>
                <pre className="p-4 text-sm text-zinc-300 overflow-x-auto">
                  <code>{`// Edit and run this code in your browser\n// (Full playground integration coming soon)\n\nconsole.log("Hello from ${definiteLesson.title}!");`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Mark complete + navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-zinc-800 pt-6">
            {prevLesson ? (
              <Link
                href={`/courses/${slug}/lessons/${prevLesson.id}`}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                ← {prevLesson.title}
              </Link>
            ) : (
              <span />
            )}

            <button
              onClick={handleComplete}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                completed
                  ? "bg-emerald-800 text-emerald-200 cursor-default"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              }`}
            >
              {completed ? "Completed ✓" : "Mark complete"}
            </button>

            {nextLesson ? (
              <Link
                href={`/courses/${slug}/lessons/${nextLesson.id}`}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {nextLesson.title} →
              </Link>
            ) : (
              <Link
                href={`/courses/${slug}`}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Back to course →
              </Link>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
