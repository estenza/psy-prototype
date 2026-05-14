"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button-styles";
import { CloseIcon } from "@/components/ui/icons";
import { AuthField } from "@/features/auth/components/auth-field";
import { buildPostAuthRedirectPath } from "@/features/auth/lib/profile";
import type { AuthErrorResponse, AuthSuccessResponse } from "@/features/auth/types";

type AuthMode = "sign-in" | "sign-up";
type AuthFormContext = "default" | "admin";

type AuthFormProps = {
  closeHref?: string;
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
  closeHref,
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

  const heading = "Вход";
  const subheading = isAdminContext
    ? "Войдите, чтобы открыть админку"
    : "Войдите, чтобы продолжить";
  const submitLabel = "Войти";
  const submitPath = "/api/auth/sign-in";
  const nextPath = searchParams.get("next")?.trim() || defaultNextPath;
  const resolvedCloseHref = closeHref ?? nextPath;

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
    <div className="modal-surface surface-elevated relative w-full max-w-[460px] px-5 py-6 min-[480px]:px-7">
      <Link
        href={resolvedCloseHref}
        aria-label="Закрыть"
        className={buttonClassName({
          className: "absolute right-5 top-5 text-[var(--label-secondary)] hover:text-[var(--label-primary)]",
          isIconOnly: true,
          size: "sm",
          variant: "quaternary",
        })}
      >
        <CloseIcon />
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="type-h1 font-bold text-label-primary">
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
          autoComplete="current-password"
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
          size="md"
          className="mt-2 w-full"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {submitLabel}
        </Button>
      </form>

    </div>
  );
}
