"use client";

import { InputOTP, Modal, REGEXP_ONLY_DIGITS } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/auth-field";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";
import type {
  AuthErrorResponse,
  AuthMessageResponse,
  AuthSuccessResponse,
} from "@/features/auth/types";

type AuthRequiredModalProps = {
  isOpen: boolean;
  nextHref: string;
  onClose: () => void;
};

type ModalStep = "method" | "email" | "otp";
type OtpPurpose = "sign-in" | "sign-up";

const RESEND_COOLDOWN_SECONDS = 60;

export function AuthRequiredModal({
  isOpen,
  nextHref,
  onClose,
}: AuthRequiredModalProps) {
  const [step, setStep] = useState<ModalStep>("method");
  const [purpose, setPurpose] = useState<OtpPurpose>("sign-in");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [debugOtpCode, setDebugOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("method");
      setEmail("");
      setEmailError("");
      setOtp("");
      setOtpError("");
      setDebugOtpCode("");
      setIsSubmitting(false);
      setResendCooldown(0);
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "email") {
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [step]);

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp(targetEmail: string, targetPurpose: OtpPurpose) {
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, purpose: targetPurpose }),
    });

    const payload = (await response.json()) as AuthErrorResponse & AuthMessageResponse;

    if (!response.ok) {
      return { ok: false, error: payload.fieldErrors?.email || payload.error };
    }

    return { ok: true, error: null, debugOtpCode: payload.debugOtpCode ?? "" };
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmailError("");
    setIsSubmitting(true);

    try {
      const result = await sendOtp(email, purpose);

      if (!result.ok) {
        setEmailError(result.error ?? "Не удалось отправить код.");
        return;
      }

      setDebugOtpCode(result.debugOtpCode ?? "");
      setOtp("");
      setOtpError("");
      setStep("otp");
      startResendCooldown();
    } catch {
      setEmailError("Не удалось отправить код. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpComplete(value: string) {
    if (value.length !== 6 || isSubmitting) return;
    setOtpError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: value, purpose }),
      });

      const payload = (await response.json()) as AuthSuccessResponse & AuthErrorResponse;

      if (!response.ok) {
        setOtpError(payload.error ?? "Неверный код.");
        setOtp("");
        return;
      }

      const redirectPath = buildPostAuthRedirectPath(payload.user, nextHref);
      window.location.replace(redirectPath);
    } catch {
      setOtpError("Не удалось проверить код. Попробуйте ещё раз.");
      setOtp("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setOtpError("");

    try {
      const result = await sendOtp(email, purpose);

      if (!result.ok) {
        setOtpError(result.error ?? "Не удалось отправить код.");
        return;
      }

      setDebugOtpCode(result.debugOtpCode ?? "");
      setOtp("");
      startResendCooldown();
    } catch {
      setOtpError("Не удалось отправить код.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

        {step === "method" && (
          <div>
            <div className="pr-10">
              <h2 className="type-modal-title text-[var(--label-primary)]">Войти или создать аккаунт</h2>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full !rounded-full"
                onClick={() => {
                  setPurpose("sign-in");
                  setStep("email");
                }}
              >
                Войти по почте
              </Button>
            </div>

            <p className="type-body-relaxed mt-5 text-[var(--label-secondary)]">
              Нет аккаунта?{" "}
              <button
                type="button"
                className="font-semibold text-[var(--label-primary)] underline decoration-[var(--underline-primary)] underline-offset-4"
                onClick={() => {
                  setPurpose("sign-up");
                  setStep("email");
                }}
              >
                Зарегистрироваться
              </button>
            </p>
          </div>
        )}

        {step === "email" && (
          <div>
            <button
              type="button"
              className="mb-4 flex items-center gap-1.5 text-[14px] text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
              onClick={() => setStep("method")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Назад
            </button>

            <h2 className="type-modal-title text-[var(--label-primary)]">
              {purpose === "sign-up" ? "Регистрация" : "Войти по почте"}
            </h2>
            <p className="type-body-relaxed mt-1 text-[var(--label-tertiary)]">
              Отправим код подтверждения на ваш email
            </p>

            <form className="mt-5 flex flex-col gap-4" onSubmit={handleEmailSubmit}>
              <AuthField
                name="email"
                type="email"
                label="Email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setEmailError("");
                }}
                placeholder="Введите email"
                error={emailError}
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-1 w-full !rounded-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Отправляем..." : "Получить код"}
              </Button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div>
            <button
              type="button"
              className="mb-4 flex items-center gap-1.5 text-[14px] text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
              onClick={() => {
                setStep("email");
                setOtp("");
                setOtpError("");
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Назад
            </button>

            <h2 className="type-modal-title text-[var(--label-primary)]">Введите код</h2>
            <p className="type-body-relaxed mt-1 text-[var(--label-tertiary)]">
              Отправили на <span className="font-medium text-[var(--label-secondary)]">{email}</span>
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={otp}
                isInvalid={Boolean(otpError)}
                isDisabled={isSubmitting}
                onChange={(value) => {
                  setOtp(value);
                  setOtpError("");
                }}
                onComplete={handleOtpComplete}
                autoFocus
              >
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group>
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>

              {otpError && (
                <p className="type-caption text-[var(--danger)]">{otpError}</p>
              )}
              {debugOtpCode && (
                <p className="type-caption rounded-2xl bg-[var(--fill-quaternary)] px-4 py-3 text-[var(--label-secondary)]">
                  Локальный код: <span className="font-semibold text-[var(--label-primary)]">{debugOtpCode}</span>
                </p>
              )}

              {isSubmitting && (
                <p className="type-caption text-[var(--label-tertiary)]">Проверяем код...</p>
              )}
            </div>

            <div className="mt-5 flex items-center gap-1.5">
              <span className="type-body-relaxed text-[var(--label-secondary)]">Не получили код?</span>
              {resendCooldown > 0 ? (
                <span className="type-body-relaxed text-[var(--label-tertiary)]">
                  Повторить через {resendCooldown} с
                </span>
              ) : (
                <button
                  type="button"
                  className="type-body-relaxed font-semibold text-[var(--label-primary)] underline decoration-[var(--underline-primary)] underline-offset-4 disabled:opacity-50"
                  onClick={handleResend}
                  disabled={isSubmitting}
                >
                  Отправить снова
                </button>
              )}
            </div>
          </div>
        )}
      </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>,
    document.body,
  );
}
