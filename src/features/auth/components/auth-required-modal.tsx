"use client";

import Link from "next/link";
import { useEffect } from "react";

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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-modal-title"
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px]"
      />

      <div className="surface-primary border-separator relative z-10 w-full max-w-[420px] rounded-[28px] border px-5 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:px-6">
        <button
          type="button"
          aria-label="Закрыть модалку авторизации"
          onClick={onClose}
          className="interactive-control absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none"
        >
          x
        </button>

        <div className="pr-8">
          <h2
            id="auth-required-modal-title"
            className="font-helvetica text-[26px] font-bold leading-none text-[var(--label-primary)]"
          >
            Нужна авторизация
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--label-secondary)]">
            Чтобы продолжить это действие, войдите в аккаунт или зарегистрируйтесь.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={signInHref}
            onClick={onClose}
            className="interactive-fill inline-flex min-h-11 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
          >
            Войти
          </Link>
          <Link
            href={signUpHref}
            onClick={onClose}
            className="interactive-control inline-flex min-h-11 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
          >
            Регистрация
          </Link>
        </div>
      </div>
    </div>
  );
}
