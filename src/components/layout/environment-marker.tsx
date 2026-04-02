"use client";

import { useEffect, useState } from "react";

type AppEnvironment = "production" | "staging" | "development" | "unknown";

type AppEnvironmentResponse = {
  appEnv: AppEnvironment;
  isStaging: boolean;
};

export function EnvironmentMarker() {
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadEnvironment() {
      try {
        const response = await fetch("/api/app-environment", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AppEnvironmentResponse;

        if (!isCancelled) {
          setIsStaging(payload.isStaging);
        }
      } catch {
        // Silent fallback: if config cannot be loaded, we prefer hiding the marker.
      }
    }

    void loadEnvironment();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isStaging) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100]">
      <div className="rounded-full bg-[var(--accent-critical)] px-3 py-1.5 text-[11px] font-black tracking-[0.24em] text-[var(--label-inverse)] shadow-[0_10px_30px_rgba(255,59,48,0.28)]">
        STAGING
      </div>
    </div>
  );
}
