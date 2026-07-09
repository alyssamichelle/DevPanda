import Image from "next/image";
import Link from "next/link";

export function CoursePromoBanner() {
  return (
    <section
      className="course-promo-banner overflow-visible border-b border-zinc-300/80 bg-zinc-100"
      data-promo-banner
      aria-labelledby="course-promo-headline"
    >
      <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
          <div className="min-w-0 flex-1">
            <p
              className="course-promo-banner__eyebrow mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500"
              data-promo-eyebrow
            >
              Limited-time offer
            </p>

            <h2
              id="course-promo-headline"
              className="course-promo-banner__headline text-xl font-semibold leading-snug text-zinc-900 sm:text-2xl"
              data-promo-headline
            >
              Get 50% off courses when you sign up today
            </h2>

            <p
              className="course-promo-banner__supporting mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base"
              data-promo-supporting
            >
              Build practical skills with hands-on courses designed for busy teams
              and curious builders.
            </p>

            <div className="mt-5">
              <Link
                href="/courses"
                className="course-promo-banner__cta inline-block rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                data-promo-cta
              >
                Browse courses
              </Link>
            </div>
          </div>

          <div
            className="course-promo-banner__visual relative mx-auto h-32 w-36 shrink-0 translate-y-21 sm:h-36 sm:w-40 md:mx-0 md:h-40 md:w-44 lg:h-44 lg:w-48"
            data-promo-visual
            aria-hidden="true"
          >
            <Image
              src="/course-promo-possum-peek.png"
              alt=""
              width={512}
              height={512}
              className="absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-bottom drop-shadow-md"
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
}
