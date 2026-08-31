"use client";

import Link from "next/link";
import type { Course } from "@/lib/data";
import posthog from "posthog-js";

const LEVEL_COLORS = {
  Beginner: "bg-emerald-900/50 text-emerald-400",
  Intermediate: "bg-amber-900/50 text-amber-400",
  Advanced: "bg-red-900/50 text-red-400",
};

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      onClick={() =>
        posthog.capture("course_selected", {
          course_id: course.slug,
          course_category: course.category,
          course_level: course.level,
          is_free: course.isFree,
        })
      }
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600"
    >
      {/* Color band */}
      <div
        className="h-1.5 rounded-t-xl"
        style={{ backgroundColor: course.color }}
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Category + level */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">{course.category}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[course.level]}`}
          >
            {course.level}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
          {course.title}
        </h3>

        {/* Description */}
        <p className="flex-1 text-sm leading-relaxed text-zinc-400">{course.description}</p>

        {/* Meta */}
        <div className="flex items-center justify-between pt-1 text-xs text-zinc-500">
          <span>{course.lessonCount} lessons · {Math.round(course.durationMin / 60)}h</span>
          {course.isFree ? (
            <span className="font-medium text-emerald-400">Free</span>
          ) : (
            <span className="font-medium text-indigo-400">Pro</span>
          )}
        </div>
      </div>
    </Link>
  );
}
