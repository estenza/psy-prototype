"use client";

import { useCallback } from "react";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";

type EventLike = {
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

type AuthModalOptions = {
  initialEmail?: string;
  methodTitle?: string;
  nextHref?: string;
};

export function useAuthRequiredAction() {
  const {
    openAuthModal,
    refreshAuthState,
    status,
    user,
  } = useAuthClient();

  const requireAuth = useCallback(
    async (event?: EventLike, modalOptions?: AuthModalOptions) => {
      if (user) {
        return true;
      }

      let refreshedUser = null;

      if (status === "loading") {
        refreshedUser = await refreshAuthState();
      }

      if (user || refreshedUser) {
        return true;
      }

      event?.preventDefault?.();
      event?.stopPropagation?.();
      openAuthModal(modalOptions);

      return false;
    },
    [openAuthModal, refreshAuthState, status, user],
  );

  const runIfAuthorized = useCallback(
    async <T>(
      action: () => T | Promise<T>,
      event?: EventLike,
      modalOptions?: AuthModalOptions,
    ) => {
      if (!(await requireAuth(event, modalOptions))) {
        return false as const;
      }

      return action();
    },
    [requireAuth],
  );

  return {
    isAuthenticated: Boolean(user),
    openAuthModal,
    requireAuth,
    runIfAuthorized,
    user,
  };
}
