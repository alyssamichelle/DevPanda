"use client";

/**
 * Visible flag/experiment indicators shown in dev mode.
 * These make it obvious during a demo which feature is controlled by GrowthBook.
 */

type FlagIndicatorProps = {
  flagKey: string;
  value: boolean;
  label?: string;
};

export function FlagIndicator({ flagKey, value, label }: FlagIndicatorProps) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded border border-dashed border-zinc-600 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-400"
      title={`GrowthBook flag: ${flagKey}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${value ? "bg-emerald-400" : "bg-zinc-600"}`}
      />
      <span className="font-mono">{flagKey}</span>
      {label && <span className="text-zinc-600">·</span>}
      {label && <span>{label}</span>}
    </div>
  );
}

type ExperimentIndicatorProps = {
  experimentKey: string;
  variant: string;
};

export function ExperimentIndicator({ experimentKey, variant }: ExperimentIndicatorProps) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded border border-dashed border-indigo-700/60 bg-indigo-950/50 px-2 py-1 text-xs text-indigo-400"
      title={`GrowthBook experiment: ${experimentKey}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
      <span className="font-mono">{experimentKey}</span>
      <span className="text-indigo-700">·</span>
      <span className="font-semibold">{variant}</span>
    </div>
  );
}

/**
 * Dev-only: become a brand-new visitor. Experiments bucket on the `dp_anon_id`
 * cookie, so a refresh keeps the same variant. Clearing the cookie and
 * reloading makes `proxy.ts` mint a fresh id, which may land in another variant.
 */
export function CycleVisitorButton() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = "dp_anon_id=; path=/; max-age=0";
        window.location.reload();
      }}
      className="inline-flex items-center gap-1.5 rounded border border-dashed border-zinc-600 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-200"
      title="Clear the anonymous id and reload as a new visitor"
    >
      <span aria-hidden>↻</span>
      Cycle to different user
    </button>
  );
}
