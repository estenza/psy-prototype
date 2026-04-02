"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AuthRequiredModal } from "@/features/auth/components/auth-required-modal";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { SessionUser } from "@/features/auth/types";

type AuthRequiredModalContextValue = {
  closeAuthModal: () => void;
  nextHref: string;
  openAuthModal: () => void;
  refreshAuthState: () => Promise<SessionUser | null>;
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  user: SessionUser | null;
};

const AuthRequiredModalContext = createContext<AuthRequiredModalContextValue | null>(
  null,
);

function getCurrentLocationHref() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}` || "/";
}

export function AuthRequiredProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refresh, status, user } = useCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextHref, setNextHref] = useState("/");

  const openAuthModal = useCallback(() => {
    setNextHref(getCurrentLocationHref());
    setIsModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const value = useMemo<AuthRequiredModalContextValue>(
    () => ({
      closeAuthModal,
      nextHref,
      openAuthModal,
      refreshAuthState: refresh,
      status,
      user,
    }),
    [closeAuthModal, nextHref, openAuthModal, refresh, status, user],
  );

  return (
    <AuthRequiredModalContext.Provider value={value}>
      {children}
      <AuthRequiredModal
        isOpen={isModalOpen}
        nextHref={nextHref}
        onClose={closeAuthModal}
      />
    </AuthRequiredModalContext.Provider>
  );
}

export function useAuthRequiredModal() {
  const context = useContext(AuthRequiredModalContext);

  if (!context) {
    throw new Error("useAuthRequiredModal must be used within AuthRequiredProvider.");
  }

  return context;
}

export function useAuthClient() {
  return useAuthRequiredModal();
}
