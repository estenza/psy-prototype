"use client";

import { useEffect } from "react";

type AppEnvironment = "production" | "staging" | "development" | "unknown";

type AppEnvironmentResponse = {
  appEnv: AppEnvironment;
};

export function EnvironmentAttributes() {
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
          document.documentElement.dataset.appEnv = payload.appEnv;
        }
      } catch {
        // If runtime config cannot be loaded, keep the default production-like styling.
      }
    }

    void loadEnvironment();

    return () => {
      isCancelled = true;
    };
  }, []);

  return null;
}
