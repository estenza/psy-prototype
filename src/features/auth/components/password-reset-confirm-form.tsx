"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/auth-field";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/constants";
import type { AuthErrorResponse, AuthMessageResponse } from "@/features/auth/types";

type PasswordResetConfirmFormProps = {
  token: string;
  tokenValid: boolean;
};

type FormState = {
  password: string;
  passwordConfirmation: string;
};

const INITIAL_FORM_STATE: FormState = {
  password: "",
  passwordConfirmation: "",
};

export function PasswordResetConfirmForm({
  token,
  tokenValid,
}: PasswordResetConfirmFormProps) {
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"password" | "passwordConfirmation" | "token", string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField(name: keyof FormState, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: formState.password,
          passwordConfirmation: formState.passwordConfirmation,
          token,
        }),
      });

      const payload = (await response.json()) as AuthErrorResponse & AuthMessageResponse;

      if (!response.ok) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          ...payload.fieldErrors,
        }));
        setFormError(payload.error);
        return;
      }

      setSuccessMessage(payload.message);
      setFormState(INITIAL_FORM_STATE);
      setFieldErrors({});
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Не удалось обновить пароль.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary border-separator w-full max-w-[460px] rounded-[28px] border px-5 py-6 min-[481px]:px-7">
      <div className="flex flex-col gap-3">
        <h1 className="type-page-title text-label-primary">
          Новый пароль
        </h1>
        <p className="type-body-relaxed text-[var(--label-secondary)]">
          Задайте новый пароль для входа. После сохранения старые сессии будут
          завершены, и войти можно будет только с новым паролем.
        </p>
      </div>

      {!tokenValid ? (
        <div className="feedback-critical-surface type-body-relaxed mt-6 rounded-2xl px-4 py-4">
          <p>Ссылка для восстановления недействительна или уже истекла.</p>
          <p className="mt-2">
            <Link
              href="/forgot-password"
              className="font-semibold underline underline-offset-4"
            >
              Запросить новую ссылку
            </Link>
          </p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="feedback-primary-surface type-body-relaxed mt-6 rounded-2xl px-4 py-4">
          <p>{successMessage}</p>
          <p className="mt-2">
            <Link
              href="/sign-in"
              className="font-semibold underline underline-offset-4"
            >
              Перейти ко входу
            </Link>
          </p>
        </div>
      ) : null}

      {tokenValid && !successMessage ? (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <AuthField
            name="password"
            type="password"
            label="Новый пароль"
            value={formState.password}
            onChange={(value) => {
              updateField("password", value);
            }}
            placeholder={`Минимум ${PASSWORD_MIN_LENGTH} символов`}
            error={fieldErrors.password}
            autoComplete="new-password"
          />

          <AuthField
            name="passwordConfirmation"
            type="password"
            label="Повторите новый пароль"
            value={formState.passwordConfirmation}
            onChange={(value) => {
              updateField("passwordConfirmation", value);
            }}
            placeholder="Ещё раз введите новый пароль"
            error={fieldErrors.passwordConfirmation}
            autoComplete="new-password"
          />

          {fieldErrors.token ? (
            <div className="feedback-critical-surface type-caption rounded-2xl px-4 py-3">
              {fieldErrors.token}
            </div>
          ) : null}

          {formError ? (
            <div className="feedback-critical-surface type-caption rounded-2xl px-4 py-3">
              {formError}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full !rounded-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Сохраняем..." : "Сохранить новый пароль"}
          </Button>
        </form>
      ) : null}

      <div className="type-body-relaxed mt-5 text-[var(--label-secondary)]">
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
