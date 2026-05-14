"use client";

import { Modal } from "@heroui/react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buttonClassName } from "@/components/ui/button-styles";
import { CloseIcon } from "@/components/ui/icons";
import { AuthOnboarding } from "@/features/auth/components/auth-onboarding";
import { AuthOtpFlow } from "@/features/auth/components/auth-otp-flow";
import { resolveOnboardingStep } from "@/features/auth/lib/profile";
import type { AuthUser, SessionUser } from "@/features/auth/types";

type AuthRequiredModalProps = {
  initialEmail?: string;
  isOpen: boolean;
  methodTitle?: string;
  nextHref: string;
  onAuthStateChanged: () => Promise<SessionUser | null>;
  onClose: () => void;
};

export function AuthRequiredModal({
  initialEmail,
  isOpen,
  methodTitle,
  nextHref,
  onAuthStateChanged,
  onClose,
}: AuthRequiredModalProps) {
  const [onboardingUser, setOnboardingUser] = useState<AuthUser | null>(null);
  const onboardingCloseHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const closeAndReset = useCallback(() => {
    onboardingCloseHandlerRef.current = null;
    setOnboardingUser(null);
    onClose();
  }, [onClose]);

  const finishAuth = useCallback(async () => {
    await onAuthStateChanged();
    onboardingCloseHandlerRef.current = null;
    setOnboardingUser(null);
    onClose();
  }, [onAuthStateChanged, onClose]);

  const handleAuthenticated = useCallback(async (user: AuthUser) => {
    await onAuthStateChanged();

    if (resolveOnboardingStep(user) === "complete") {
      closeAndReset();
      return;
    }

    setOnboardingUser(user);
  }, [closeAndReset, onAuthStateChanged]);

  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null;

    if (target?.closest('[data-slot="modal-dialog"]')) {
      return;
    }

    const closeOnboarding = onboardingCloseHandlerRef.current;

    if (closeOnboarding) {
      void closeOnboarding();
      return;
    }

    closeAndReset();
  }, [closeAndReset]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <Modal.Backdrop
      isOpen
      variant="opaque"
      isDismissable
      onClickCapture={handleBackdropClick}
      className="fixed inset-0 z-[200]"
    >
      <Modal.Container className="flex min-h-dvh items-center justify-center p-4">
      {onboardingUser ? (
        <Modal.Dialog
          aria-label="Завершить вход"
          className="contents"
        >
          <AuthOnboarding
            closeHref={nextHref}
            currentUser={onboardingUser}
            nextPath={nextHref}
            onCancel={closeAndReset}
            onCloseHandlerChange={(handler) => {
              onboardingCloseHandlerRef.current = handler;
            }}
            onComplete={finishAuth}
          />
        </Modal.Dialog>
      ) : (
      <Modal.Dialog
        aria-labelledby="auth-modal-title"
        className="modal-surface surface-elevated relative w-full max-w-[420px] px-5 py-6 min-[480px]:px-6"
      >
        <button
          type="button"
          aria-label="Закрыть"
          onClick={closeAndReset}
          className={buttonClassName({
            className: "absolute right-5 top-5 text-[var(--label-secondary)] hover:text-[var(--label-primary)]",
            isIconOnly: true,
            size: "sm",
            variant: "quaternary",
          })}
        >
          <CloseIcon />
        </button>
        <AuthOtpFlow
          initialEmail={initialEmail}
          methodTitle={methodTitle}
          nextHref={nextHref}
          onAuthenticated={handleAuthenticated}
          titleAs="h2"
        />
      </Modal.Dialog>
      )}
      </Modal.Container>
    </Modal.Backdrop>,
    document.body,
  );
}
