"use client";

import { InputOTP, REGEXP_ONLY_DIGITS } from "@heroui/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/auth-field";
import type {
  AuthErrorResponse,
  AuthMessageResponse,
  AuthSuccessResponse,
} from "@/features/auth/types";

const RESEND_COOLDOWN_SECONDS = 60;

type Step = "email" | "otp";

export function AdminOtpSignIn({ redirectPath }: { redirectPath: string }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [debugOtpCode, setDebugOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [accessError, setAccessError] = useState("");
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp(targetEmail: string) {
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminContext: true,
        email: targetEmail,
        purpose: "sign-in",
      }),
    });
    const payload = (await response.json()) as AuthErrorResponse & AuthMessageResponse;
    if (!response.ok) {
      return { ok: false, error: payload.fieldErrors?.email || payload.error };
    }
    return { ok: true, error: null, debugOtpCode: payload.debugOtpCode ?? "" };
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setAccessError("");
    setIsSubmitting(true);
    try {
      const result = await sendOtp(email);
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
        body: JSON.stringify({ email, code: value, purpose: "sign-in" }),
      });
      const payload = (await response.json()) as AuthSuccessResponse & AuthErrorResponse;
      if (!response.ok) {
        setOtpError(payload.error ?? "Неверный код.");
        setOtp("");
        return;
      }
      if (!payload.user?.isModerator) {
        await fetch("/api/auth/sign-out", { method: "POST" });
        setAccessError("У этого аккаунта нет доступа к административной панели.");
        setOtp("");
        setDebugOtpCode("");
        setStep("email");
        return;
      }
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
      const result = await sendOtp(email);
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

  return (
    <div className="w-full max-w-[400px]">
      {accessError && (
        <div className="mb-4 rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {accessError}
        </div>
      )}

      {step === "email" && (
        <div>
          <h1 className="type-h1 font-bold text-[var(--label-primary)]">Вход в Admin</h1>
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
              size="md"
              className="mt-1 w-full"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Получить код
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
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад
          </button>

          <h1 className="type-h1 font-bold text-[var(--label-primary)]">Введите код</h1>
          <p className="type-body-relaxed mt-1 text-[var(--label-tertiary)]">
            Отправили на{" "}
            <span className="font-medium text-[var(--label-secondary)]">{email}</span>
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
    </div>
  );
}
