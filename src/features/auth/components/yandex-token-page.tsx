"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { decodeYandexDirectAuthState } from "@/features/auth/lib/yandex-direct-auth";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";
import { publishStoredTopicDraftAfterAuth } from "@/features/topic-creation/lib/publish-stored-topic-draft";
import type {
  AuthErrorResponse,
  AuthSuccessResponse,
} from "@/features/auth/types";

declare global {
  interface Window {
    YaSendSuggestToken?: (origin: string, options: { flag: boolean }) => void;
  }
}

export function YandexTokenPage() {
  const [error, setError] = useState("");
  const [directAuthState] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    return decodeYandexDirectAuthState(params.get("state"));
  });

  const sendToken = useCallback(() => {
    try {
      window.YaSendSuggestToken?.(window.location.origin, { flag: true });
    } catch {
      setError("Не удалось завершить вход через Yandex ID.");
    }
  }, []);

  useEffect(() => {
    if (!directAuthState) {
      return;
    }

    const currentDirectAuthState = directAuthState;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    async function finishDirectAuth() {
      const accessToken = params.get("access_token")?.trim();

      if (!accessToken) {
        setError("Не удалось завершить вход через Yandex ID.");
        return;
      }

      try {
        const response = await fetch("/api/auth/yandex/sign-in", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessToken }),
        });
        const payload = (await response.json()) as AuthSuccessResponse &
          AuthErrorResponse;

        if (!response.ok) {
          setError(payload.error ?? "Не удалось завершить вход через Yandex ID.");
          return;
        }

        if (currentDirectAuthState.isPublishingFlow) {
          await publishStoredTopicDraftAfterAuth();
          window.location.replace("/");
          return;
        }

        window.location.replace(
          buildPostAuthRedirectPath(payload.user, currentDirectAuthState.nextHref),
        );
      } catch {
        setError("Не удалось завершить вход через Yandex ID.");
      }
    }

    void finishDirectAuth();
  }, [directAuthState]);

  return (
    <main className="surface-primary flex min-h-dvh items-center justify-center px-4">
      {!directAuthState ? (
        <Script
          src="https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-token-with-polyfills-latest.js"
          strategy="afterInteractive"
          onLoad={sendToken}
          onError={() => {
            setError("Не удалось загрузить Yandex ID.");
          }}
        />
      ) : null}
      <p className="type-body-relaxed text-center text-[var(--label-secondary)]">
        {error || "Завершаем вход..."}
      </p>
    </main>
  );
}
