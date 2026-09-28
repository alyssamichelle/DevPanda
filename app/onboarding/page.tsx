"use client";

import { useState } from "react";
import Link from "next/link";
import { useExperiment } from "@growthbook/growthbook-react";
import { COURSES } from "@/lib/data";
import { CourseCard } from "@/components/course-card";
import { ExperimentIndicator } from "@/components/flag-indicator";
import { trackCtaClick, trackSignUp } from "@/lib/analytics";
import { EXPERIMENTS } from "@/lib/growthbook";

const QUIZ_QUESTIONS = [
  {
    id: "experience",
    question: "How long have you been writing code?",
    options: ["< 1 year", "1–3 years", "3–5 years", "5+ years"],
  },
  {
    id: "focus",
    question: "What do you want to focus on?",
    options: ["Frontend", "Backend", "DevOps", "Full-stack"],
  },
  {
    id: "goal",
    question: "What's your primary goal?",
    options: ["Get a job", "Level up at work", "Ship a side project", "General curiosity"],
  },
  {
    id: "time",
    question: "How much time can you commit weekly?",
    options: ["< 2 hours", "2–5 hours", "5–10 hours", "10+ hours"],
  },
  {
    id: "language",
    question: "What's your main language today?",
    options: ["JavaScript", "TypeScript", "Python", "Other"],
  },
];

export default function OnboardingPage() {
  // Experiment: simple skill-level picker vs. 5-question quiz
  const { value: showQuiz } = useExperiment({
    key: EXPERIMENTS.ONBOARDING_FLOW,
    variations: [false, true],
  });

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[step];
  const totalQuizSteps = QUIZ_QUESTIONS.length;

  function handleQuizAnswer(answer: string) {
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    if (step + 1 < totalQuizSteps) {
      setStep(step + 1);
    } else {
      setDone(true);
      trackSignUp("email");
      trackCtaClick("Complete quiz", "onboarding");
    }
  }

  function handleSkillSelect(level: string) {
    setSkillLevel(level);
    setDone(true);
    trackSignUp("email");
    trackCtaClick(`Skill: ${level}`, "onboarding");
  }

  // Pick courses based on quiz focus or skill level
  const recommendedCourses = done
    ? answers.focus === "Frontend" || skillLevel === "Beginner"
      ? COURSES.filter((c) => ["Frontend", "Language"].includes(c.category)).slice(0, 3)
      : COURSES.filter((c) => ["Backend", "DevOps"].includes(c.category)).slice(0, 3)
    : [];

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          {done ? "Your learning path" : "Let's get you started"}
        </h1>
        <ExperimentIndicator
          experimentKey={EXPERIMENTS.ONBOARDING_FLOW}
          variant={showQuiz ? "quiz" : "skill-picker"}
        />
      </div>

      {!done && showQuiz && (
        <>
          {/* Progress bar */}
          <div className="mb-8 h-1 rounded-full bg-zinc-800">
            <div
              className="h-1 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${((step + 1) / totalQuizSteps) * 100}%` }}
            />
          </div>

          <p className="mb-2 text-xs text-zinc-500">
            Question {step + 1} of {totalQuizSteps}
          </p>
          <h2 className="mb-6 text-xl font-semibold text-white">
            {currentQuestion.question}
          </h2>

          <div className="grid gap-3">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleQuizAnswer(opt)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-left text-sm text-zinc-300 transition-colors hover:border-indigo-600 hover:text-white"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {!done && !showQuiz && (
        <>
          <p className="mb-6 text-zinc-400">
            Pick your experience level and we&apos;ll suggest the right starting point.
          </p>
          <div className="grid gap-4">
            {["Beginner", "Intermediate", "Advanced"].map((level) => (
              <button
                key={level}
                onClick={() => handleSkillSelect(level)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-5 text-left transition-colors hover:border-indigo-600"
              >
                <p className="font-semibold text-white">{level}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {level === "Beginner" && "New to programming or switching stacks"}
                  {level === "Intermediate" && "Comfortable with the basics, want to go deeper"}
                  {level === "Advanced" && "Experienced dev looking for advanced patterns"}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {done && (
        <div>
          <p className="mb-6 text-zinc-400">
            Based on your answers, here&apos;s where we recommend starting:
          </p>
          <div className="flex flex-col gap-4">
            {recommendedCourses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
          <Link
            href="/courses"
            className="mt-6 block text-center text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Browse all courses instead →
          </Link>
        </div>
      )}
    </div>
  );
}
