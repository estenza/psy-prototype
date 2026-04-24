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
  openAuthModal: (options?: {
    initialEmail?: string;
    nextHref?: string;
  }) => void;
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
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const { refresh, status, user } = useCurrentUser(initialUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState("");
  const [nextHref, setNextHref] = useState("/");

  const openAuthModal = useCallback((options?: {
    initialEmail?: string;
    nextHref?: string;
  }) => {
    setInitialEmail(options?.initialEmail?.trim() ?? "");
    setNextHref(options?.nextHref ?? getCurrentLocationHref());
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
        initialEmail={initialEmail}
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
