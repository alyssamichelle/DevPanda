"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GrowthBookProvider } from "@growthbook/growthbook-react";
import {
  getGrowthBook,
  visitorAttributes,
  type GrowthBookBootstrap,
} from "@/lib/growthbook";

function readAnonIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )dp_anon_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function Providers({
  children,
  bootstrap,
}: {
  children: ReactNode;
  bootstrap?: GrowthBookBootstrap;
}) {
  // Initialize the client SDK with the same anon id + payload the server used,
  // so the first client render matches the server HTML (no flag flicker).
  const anonId = bootstrap?.anonId ?? readAnonIdFromCookie();
  const gb = useMemo(
    () =>
      getGrowthBook({
        anonId,
        payload: bootstrap?.payload ?? null,
      }),
    [anonId, bootstrap?.payload]
  );

  // Keep the visitor id in sync without mutating the SDK during render.
  // (The instance is created with this id, but if it resolves later — e.g. the
  // cookie becomes readable on the client — update it here in the effect phase.)
  useEffect(() => {
    if (!anonId) return;
    const attrs = gb.getAttributes();
    if (attrs.id === anonId && attrs.device_id === anonId) return;
    void gb.setAttributes({ ...attrs, ...visitorAttributes(anonId) });
  }, [gb, anonId]);

  // Dev-only local preview: `?ff=flag-a,flag-b` force-enables those flags so you
  // can preview a flag's UI without a GrowthBook key. Uses GrowthBook's
  // setForcedFeatures — the same mechanism the GrowthBook DevTools use.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const ff = searchParams?.get("ff");
    const forced = new Map<string, boolean>(
      (ff ? ff.split(",") : [])
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => [k, true] as const)
    );
    gb.setForcedFeatures(forced);
  }, [gb, pathname, searchParams]);

  useEffect(() => {
    // Refresh features when the user returns to the tab (picks up flag
    // changes made in the GrowthBook UI without a reload).
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        gb.refreshFeatures().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [gb]);

  return <GrowthBookProvider growthbook={gb}>{children}</GrowthBookProvider>;
}
