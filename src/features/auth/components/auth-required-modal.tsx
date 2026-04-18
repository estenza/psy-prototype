"use client";

import { Modal } from "@heroui/react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonClassName } from "@/components/ui/button-styles";

type AuthRequiredModalProps = {
  isOpen: boolean;
  nextHref: string;
  onClose: () => void;
};

export function AuthRequiredModal({
  isOpen,
  nextHref,
  onClose,
}: AuthRequiredModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(nextHref)}`;
  const signUpHref = `/sign-up?next=${encodeURIComponent(nextHref)}`;

  return (
    <Modal.Backdrop
      isOpen
      className="overlay-scrim-strong fixed inset-0 z-[200]"
      isDismissable
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Modal.Container className="flex min-h-dvh items-center justify-center p-4">
        <Modal.Dialog
          aria-labelledby="auth-required-modal-title"
          className="modal-surface relative w-full max-w-[420px] px-5 py-6 sm:px-6"
        >
          <Modal.CloseTrigger
            className="absolute right-6 top-6 text-[var(--label-primary)]"
            aria-label="Закрыть модалку авторизации"
          />

          <div className="pr-8">
            <h2
              id="auth-required-modal-title"
              className="type-modal-title text-[var(--label-primary)]"
            >
              Нужна авторизация
            </h2>
            <p className="mt-3 text-[14px] leading-5 text-[var(--label-secondary)]">
              Чтобы продолжить это действие, войдите в аккаунт или зарегистрируйтесь.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={signInHref}
              onClick={onClose}
              className={buttonClassName({
                className: "min-h-11 w-full justify-center rounded-full",
                variant: "primary",
              })}
            >
              Войти
            </Link>
            <Link
              href={signUpHref}
              onClick={onClose}
              className={buttonClassName({
                className: "min-h-11 w-full justify-center rounded-full",
                variant: "secondary",
              })}
            >
              Регистрация
            </Link>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
