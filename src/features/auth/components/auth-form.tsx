"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/auth-field";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";
import type { AuthErrorResponse, AuthSuccessResponse } from "@/features/auth/types";

type AuthMode = "sign-in" | "sign-up";
type AuthFormContext = "default" | "admin";

type AuthFormProps = {
  context?: AuthFormContext;
  defaultNextPath?: string;
  mode: AuthMode;
};

type FormState = {
  email: string;
  password: string;
};

const INITIAL_FORM_STATE: FormState = {
  email: "",
  password: "",
};

export function AuthForm({
  context = "default",
  defaultNextPath = "/",
  mode,
}: AuthFormProps) {
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";
  const isAdminContext = context === "admin";

  const heading = isSignUp ? "Регистрация" : "Вход";
  const subheading = isAdminContext
    ? "Войдите, чтобы открыть админку"
    : isSignUp
      ? "Зарегистрируйтесь, чтобы продолжить"
      : "Войдите, чтобы продолжить";
  const submitLabel = isSignUp ? "Зарегистрироваться" : "Войти";
  const submitPath = isSignUp ? "/api/auth/sign-up" : "/api/auth/sign-in";
  const nextPath = searchParams.get("next")?.trim() || defaultNextPath;
  const alternateAuthHref = isSignUp
    ? `/sign-in?next=${encodeURIComponent(nextPath)}`
    : `/sign-up?next=${encodeURIComponent(nextPath)}`;

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
      const response = await fetch(submitPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isSignUp
            ? {
                email: formState.email,
                password: formState.password,
              }
            : {
                email: formState.email,
                password: formState.password,
              },
        ),
      });
      const payload = (await response.json()) as AuthSuccessResponse & AuthErrorResponse;

      if (!response.ok) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          ...payload.fieldErrors,
        }));
        setFormError(payload.error);
        return;
      }

      const redirectPath = buildPostAuthRedirectPath(payload.user, nextPath);

      // The next screen is server-rendered from the fresh session cookie, so use
      // a full document navigation instead of relying on client router cache.
      window.location.replace(redirectPath);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Не удалось выполнить запрос.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary border-separator w-full max-w-[460px] rounded-[28px] border px-5 py-6 sm:px-7">
      <div className="flex flex-col gap-2">
        <h1 className="type-page-title text-label-primary">
          {heading}
        </h1>
        <p className="type-body-relaxed text-label-tertiary">
          {subheading}
        </p>
      </div>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <AuthField
          name="email"
          type="email"
          label="Email"
          value={formState.email}
          onChange={(value) => {
            updateField("email", value);
          }}
          placeholder="Введите Email"
          error={fieldErrors.email}
          autoComplete="email"
        />

        <AuthField
          name="password"
          type="password"
          label="Пароль"
          value={formState.password}
          onChange={(value) => {
            updateField("password", value);
          }}
          placeholder="Введите пароль"
          error={fieldErrors.password}
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />

        {!isSignUp && !isAdminContext ? (
          <Link
            href="/forgot-password"
            className="type-caption-medium -mt-2 self-start text-[var(--label-secondary)] underline decoration-[var(--underline-secondary)] underline-offset-4"
          >
            Забыли пароль?
          </Link>
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
          {isSubmitting ? "Секунду..." : submitLabel}
        </Button>
      </form>

      {!isAdminContext ? (
        <div className="type-body-relaxed mt-5 text-[var(--label-secondary)]">
          {isSignUp ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
          <Link
            href={alternateAuthHref}
            className="font-semibold text-[var(--label-primary)] underline decoration-[var(--underline-primary)] underline-offset-4"
          >
            {isSignUp ? "Войти" : "Зарегистрироваться"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
