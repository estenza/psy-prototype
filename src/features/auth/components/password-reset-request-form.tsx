"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/auth-field";
import type { AuthErrorResponse, AuthMessageResponse } from "@/features/auth/types";

type PasswordResetRequestFormProps = {
  initialEmail?: string;
};

export function PasswordResetRequestForm({
  initialEmail = "",
}: PasswordResetRequestFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldError(null);
    setFormError(null);
    setSuccessMessage(null);
    setDebugResetUrl(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const payload = (await response.json()) as AuthErrorResponse & AuthMessageResponse;

      if (!response.ok) {
        setFieldError(payload.fieldErrors?.email ?? null);
        setFormError(payload.error);
        return;
      }

      setSuccessMessage(payload.message);
      setDebugResetUrl(payload.debugResetUrl ?? null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Не удалось отправить запрос.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary border-separator w-full max-w-[460px] rounded-[28px] border px-5 py-6 min-[480px]:px-7">
      <div className="flex flex-col gap-3">
        <h1 className="type-h1 font-bold text-label-primary">
          Восстановление пароля
        </h1>
        <p className="type-body-relaxed text-[var(--label-secondary)]">
          Введите email, который использовали для входа. Если такой аккаунт
          существует, мы отправим письмо со ссылкой для сброса пароля.
        </p>
      </div>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <AuthField
          name="email"
          type="email"
          label="Email для восстановления"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setFieldError(null);
            setFormError(null);
          }}
          placeholder="name@example.com"
          error={fieldError ?? undefined}
          autoComplete="email"
        />

        {formError ? (
          <div className="feedback-critical-surface type-caption rounded-2xl px-4 py-3">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="feedback-primary-surface type-caption rounded-2xl px-4 py-3">
            <p>{successMessage}</p>
            {debugResetUrl ? (
              <p className="mt-2">
                Локальный preview:{" "}
                <a
                  href={debugResetUrl}
                  className="font-semibold underline underline-offset-4"
                >
                  открыть ссылку для сброса
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="mt-2 w-full"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Отправить письмо
        </Button>
      </form>

      <div className="type-body-relaxed mt-5 text-[var(--label-secondary)]">
        Вспомнили пароль?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-[var(--label-primary)] underline decoration-[var(--underline-primary)] underline-offset-4"
        >
          Вернуться ко входу
        </Link>
      </div>
    </div>
  );
}
