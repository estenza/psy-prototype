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
  adminAccessKey: string;
  email: string;
  password: string;
};

const INITIAL_FORM_STATE: FormState = {
  adminAccessKey: "",
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
                adminAccessKey: isAdminContext ? formState.adminAccessKey : undefined,
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
    <div className="surface-primary border-separator w-full max-w-[460px] rounded-[28px] border px-5 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-7">
      <div className="flex flex-col gap-2">
        <h1 className="font-helvetica text-[28px] font-bold leading-none text-[var(--label-primary)]">
          {heading}
        </h1>
        <p className="text-label-tertiary text-[14px] leading-6">
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

        {isAdminContext && !isSignUp ? (
          <AuthField
            name="adminAccessKey"
            type="password"
            label="Ключ доступа"
            value={formState.adminAccessKey}
            onChange={(value) => {
              updateField("adminAccessKey", value);
            }}
            placeholder="Введите ключ доступа"
            error={fieldErrors.adminAccessKey}
            autoComplete="off"
          />
        ) : null}

        {!isSignUp ? (
          <Link
            href="/forgot-password"
            className="-mt-2 self-start text-[13px] font-medium text-[var(--label-secondary)] underline decoration-[color-mix(in_srgb,var(--label-secondary)_20%,transparent)] underline-offset-4"
          >
            Забыли пароль?
          </Link>
        ) : null}

        {formError ? (
          <div className="rounded-2xl bg-[color-mix(in_srgb,var(--accent-critical)_10%,white)] px-4 py-3 text-[13px] leading-5 text-[var(--accent-critical)]">
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
        <div className="mt-5 text-[14px] leading-6 text-[var(--label-secondary)]">
          {isSignUp ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
          <Link
            href={alternateAuthHref}
            className="font-semibold text-[var(--label-primary)] underline decoration-[color-mix(in_srgb,var(--label-primary)_18%,transparent)] underline-offset-4"
          >
            {isSignUp ? "Войти" : "Зарегистрироваться"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
