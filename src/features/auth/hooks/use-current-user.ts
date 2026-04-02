"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_STATE_CHANGED_EVENT } from "@/features/auth/constants";
import type { CurrentUserResponse, SessionUser } from "@/features/auth/types";

type CurrentUserStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type CurrentUserState = {
  error: string | null;
  status: CurrentUserStatus;
  user: SessionUser | null;
};

const INITIAL_STATE: CurrentUserState = {
  error: null,
  status: "loading",
  user: null,
};

export function dispatchAuthStateChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
}

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });
      const payload = (await response.json()) as CurrentUserResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось получить текущего пользователя.");
      }

      setState({
        error: null,
        status: payload.user ? "authenticated" : "unauthenticated",
        user: payload.user,
      });
      return payload.user;
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : "Не удалось загрузить сессию.",
        status: "error",
        user: null,
      });
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleAuthStateChanged() {
      void refresh();
    }

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    };
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
