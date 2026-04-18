"use client";

import { Description, ErrorMessage, Input, Label, TextField } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
} from "@/features/auth/constants";
import {
  buildPostAuthRedirectPath,
  normalizeNickname,
  resolveOnboardingStep,
} from "@/features/auth/lib/profile";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import type {
  AuthErrorResponse,
  AuthSuccessResponse,
  AuthUser,
  UserRole,
} from "@/features/auth/types";

type AuthOnboardingProps = {
  currentUser: AuthUser;
  nextPath: string;
};

type FieldErrors = Partial<
  Record<"firstName" | "lastName" | "nickname" | "patronymic" | "role", string>
>;

function OnboardingField({
  description,
  error,
  label,
  onChange,
  placeholder,
  value,
}: {
  description: string;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const id = `onboarding-field-${label}`;

  return (
    <TextField isInvalid={Boolean(error)} className="flex flex-col gap-2">
      <Label htmlFor={id} className="type-body-md-medium text-[var(--label-primary)]">
        {label}
      </Label>
      <Description className="type-caption text-[var(--label-secondary)]">
        {description}
      </Description>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl px-4 py-3 text-sm"
      />
      {error ? (
        <ErrorMessage className="type-caption-tight text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}

export function AuthOnboarding({ currentUser, nextPath }: AuthOnboardingProps) {
  const router = useRouter();
  const [user, setUser] = useState(currentUser);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [patronymic, setPatronymic] = useState(user.patronymic ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<{
    message: string;
    tone: "error" | "idle" | "success";
  }>({
    message: "",
    tone: "idle",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = resolveOnboardingStep(user);
  const normalizedNickname = useMemo(() => normalizeNickname(nickname), [nickname]);

  useEffect(() => {
    if (currentStep !== "user-profile") {
      return;
    }

    if (!normalizedNickname) {
      setNicknameStatus({
        message: "Можно использовать псевдоним.",
        tone: "idle",
      });
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/auth/nickname-availability?nickname=${encodeURIComponent(normalizedNickname)}`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as {
          available: boolean;
          reason?: string;
        };

        if (cancelled) {
          return;
        }

        if (payload.available) {
          setNicknameStatus({
            message: "Ник свободен.",
            tone: "success",
          });
          return;
        }

        setNicknameStatus({
          message: payload.reason ?? "Ник пока недоступен.",
          tone: "error",
        });
      } catch {
        if (!cancelled) {
          setNicknameStatus({
            message: "",
            tone: "idle",
          });
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [currentStep, normalizedNickname]);

  function applyUser(nextUser: AuthUser) {
    setUser(nextUser);
    setNickname(nextUser.nickname ?? "");
    setFirstName(nextUser.firstName ?? "");
    setLastName(nextUser.lastName ?? "");
    setPatronymic(nextUser.patronymic ?? "");
    setFieldErrors({});
    setFormError(null);
    dispatchAuthStateChanged();
  }

  async function submitTo(path: string, body: Record<string, unknown>) {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as AuthSuccessResponse & AuthErrorResponse;

      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        setFormError(payload.error);
        return;
      }

      applyUser(payload.user);

      if (resolveOnboardingStep(payload.user) === "complete") {
        router.replace(buildPostAuthRedirectPath(payload.user, nextPath));
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary border-separator w-full max-w-[520px] rounded-[28px] border px-5 py-6 sm:px-7">
      {currentStep === "role" ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="type-page-title text-[var(--label-primary)]">
              Выберите роль
            </h1>
            <p className="type-body-relaxed text-[var(--label-secondary)]">
              Сначала определим, как вы планируете использовать платформу. Роль можно изменить позже.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              {
                description: "Читать, публиковать, участвовать в обсуждениях",
                role: "user" as const,
                title: "Я ищу поддержку",
              },
              {
                description: "Отвечать как эксперт, оформить профессиональный профиль",
                role: "specialist" as const,
                title: "Я специалист",
              },
            ].map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => {
                  setSelectedRole(option.role);
                  setFieldErrors({});
                  setFormError(null);
                }}
                className={`border-separator cursor-pointer rounded-[24px] border px-5 py-4 text-left transition-colors ${
                  selectedRole === option.role
                    ? "bg-[var(--fill-selected-subtle)]"
                    : "bg-transparent"
                }`}
              >
                <div className="type-subtitle text-[var(--label-primary)]">
                  {option.title}
                </div>
                <div className="type-body-md mt-1 text-[var(--label-secondary)]">
                  {option.description}
                </div>
              </button>
            ))}
          </div>

          {fieldErrors.role || formError ? (
            <p className="type-caption text-[var(--danger)]">
              {fieldErrors.role ?? formError}
            </p>
          ) : null}

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full !rounded-full"
            disabled={isSubmitting || !selectedRole}
            onClick={() => {
              if (!selectedRole) {
                setFieldErrors({
                  role: "Выберите роль, чтобы продолжить.",
                });
                return;
              }

              void submitTo("/api/auth/onboarding/role", {
                role: selectedRole,
              });
            }}
          >
            {isSubmitting ? "Секунду..." : "Продолжить"}
          </Button>
        </div>
      ) : null}

      {currentStep === "user-profile" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitTo("/api/auth/onboarding/user-profile", {
              nickname,
            });
          }}
        >
          <div className="flex flex-col gap-3">
            <h1 className="type-page-title text-[var(--label-primary)]">
              Как вас будут видеть другие?
            </h1>
            <p className="type-body-relaxed text-[var(--label-secondary)]">
              Ник нужен, чтобы вы могли публиковать и участвовать в обсуждениях без раскрытия реального имени.
            </p>
          </div>

          <OnboardingField
            label="Никнейм"
            description="Можно использовать псевдоним. Подойдут латиница, кириллица, цифры, точка и underscore без пробелов."
            value={nickname}
            onChange={(value) => {
              setNickname(value);
              setFieldErrors((currentErrors) => ({
                ...currentErrors,
                nickname: "",
              }));
              setFormError(null);
            }}
            placeholder={`${NICKNAME_MIN_LENGTH}-${NICKNAME_MAX_LENGTH} символов`}
            error={fieldErrors.nickname}
          />

          {nicknameStatus.message ? (
            <p
              className={`type-caption ${
                nicknameStatus.tone === "error"
                  ? "text-[var(--danger)]"
                  : nicknameStatus.tone === "success"
                    ? "text-[var(--success)]"
                    : "text-[var(--label-secondary)]"
              }`}
            >
              {nicknameStatus.message}
            </p>
          ) : null}

          {formError ? (
            <p className="type-caption text-[var(--danger)]">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full !rounded-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Секунду..." : "Завершить регистрацию"}
          </Button>
        </form>
      ) : null}

      {currentStep === "specialist-profile" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitTo("/api/auth/onboarding/specialist-profile", {
              firstName,
              lastName,
              patronymic,
            });
          }}
        >
          <div className="flex flex-col gap-3">
            <h1 className="type-page-title text-[var(--label-primary)]">
              Публичные данные профиля
            </h1>
            <p className="type-body-relaxed text-[var(--label-secondary)]">
              Эти данные будут отображаться в профиле и видны пользователям, чтобы профиль выглядел профессионально и вызывал доверие.
            </p>
          </div>

          <OnboardingField
            label="Имя"
            description="Нужно, чтобы пользователи видели, как к вам обращаться."
            value={firstName}
            onChange={(value) => {
              setFirstName(value);
              setFieldErrors((currentErrors) => ({
                ...currentErrors,
                firstName: "",
              }));
              setFormError(null);
            }}
            placeholder="Как вас зовут в публичном профиле"
            error={fieldErrors.firstName}
          />

          <OnboardingField
            label="Фамилия"
            description="Нужна для полного публичного имени специалиста."
            value={lastName}
            onChange={(value) => {
              setLastName(value);
              setFieldErrors((currentErrors) => ({
                ...currentErrors,
                lastName: "",
              }));
              setFormError(null);
            }}
            placeholder="Какую фамилию увидят пользователи"
            error={fieldErrors.lastName}
          />

          <OnboardingField
            label="Отчество"
            description="Необязательное поле. Добавьте его, если хотите показывать полное имя."
            value={patronymic}
            onChange={(value) => {
              setPatronymic(value);
              setFieldErrors((currentErrors) => ({
                ...currentErrors,
                patronymic: "",
              }));
              setFormError(null);
            }}
            placeholder="Можно пропустить"
            error={fieldErrors.patronymic}
          />

          {formError ? (
            <p className="type-caption text-[var(--danger)]">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full !rounded-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Секунду..." : "Завершить регистрацию"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
