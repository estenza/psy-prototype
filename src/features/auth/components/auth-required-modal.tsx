"use client";

import { Modal } from "@heroui/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AuthOtpFlow } from "@/features/auth/components/auth-otp-flow";

type AuthRequiredModalProps = {
  initialEmail?: string;
  isOpen: boolean;
  nextHref: string;
  onClose: () => void;
};

export function AuthRequiredModal({
  initialEmail,
  isOpen,
  nextHref,
  onClose,
}: AuthRequiredModalProps) {
  useEffect(() => {
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <Modal.Backdrop
      isOpen
      variant="opaque"
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onClickCapture={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('[data-slot="modal-dialog"]')) return;
        onClose();
      }}
      className="fixed inset-0 z-[200]"
    >
      <Modal.Container className="flex min-h-dvh items-center justify-center p-4">
      <Modal.Dialog
        aria-labelledby="auth-modal-title"
        className="modal-surface surface-elevated surface--default relative w-full max-w-[420px] px-5 py-6 sm:px-6"
      >
        <button
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--label-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>
        <AuthOtpFlow initialEmail={initialEmail} nextHref={nextHref} titleAs="h2" />
      </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>,
    document.body,
  );
}
