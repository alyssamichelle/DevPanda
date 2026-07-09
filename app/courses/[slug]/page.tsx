"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { getCourse, getLessons } from "@/lib/data";
import { CoursePromoBanner } from "@/components/course-promo-banner";
import { FlagIndicator } from "@/components/flag-indicator";
import { FLAGS } from "@/lib/growthbook";
import { trackCourseView } from "@/lib/analytics";

export default function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const course = getCourse(slug);

  if (!course) notFound();

  const lessons = getLessons(slug);

  // Flag: beta code playground — show an inline code environment CTA on lessons
  const playgroundEnabled = useFeatureIsOn(FLAGS.CODE_PLAYGROUND);

  useEffect(() => {
    if (course) {
      trackCourseView(course.slug, course.title, course.category, course.isFree);
    }
  }, [course]);

  return (
    <>
      <CoursePromoBanner />

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/courses" className="hover:text-white">Courses</Link>
          <span>/</span>
          <span className="text-zinc-300">{course.title}</span>
        </nav>

        {/* Course header */}
        <div
          className="h-1.5 rounded-full mb-6"
          style={{ backgroundColor: course.color }}
        />
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <span>{course.category}</span>
          <span>·</span>
          <span>{course.level}</span>
          <span>·</span>
          <span>{Math.round(course.durationMin / 60)}h total</span>
          {course.isFree ? (
            <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Free
            </span>
          ) : (
            <span className="rounded-full bg-indigo-900/40 px-2 py-0.5 text-xs font-medium text-indigo-400">
              Pro
            </span>
          )}
        </div>

        <h1 className="mb-4 text-3xl font-bold text-white">{course.title}</h1>
        <p className="text-zinc-400 leading-relaxed">{course.description}</p>

        {/* Playground callout (flag-gated) */}
        {playgroundEnabled && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-indigo-800/50 bg-indigo-950/30 p-4">
            <span className="mt-0.5 text-indigo-400">⌨</span>
            <div>
              <p className="text-sm font-medium text-indigo-300">
                Interactive code playground available
              </p>
              <p className="mt-0.5 text-xs text-indigo-500">
                Run code directly in your browser for lessons with hands-on exercises.
              </p>
            </div>
            <FlagIndicator flagKey={FLAGS.CODE_PLAYGROUND} value={playgroundEnabled} />
          </div>
        )}

        {/* Lessons */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {lessons.length} lessons
          </h2>

          <div className="flex flex-col gap-2">
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/courses/${slug}/lessons/${lesson.id}`}
                className="group flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-600"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-500 group-hover:border-indigo-600 group-hover:text-indigo-400 transition-colors">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {lesson.durationMin} min
                    {lesson.hasCode && " · includes code"}
                  </p>
                </div>
                <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA if not free */}
        {!course.isFree && (
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-400 mb-4">
              This is a Pro course. Upgrade to unlock all lessons.
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
