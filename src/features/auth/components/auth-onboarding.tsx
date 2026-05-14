"use client";

import {
  Description,
  ErrorMessage,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button-styles";
import { CloseIcon } from "@/components/ui/icons";
import {
  fieldControlInputClassName,
  fieldControlLabelClassName,
} from "@/components/ui/field-control";
import {
  buildPostAuthRedirectPath,
  resolveOnboardingStep,
} from "@/features/auth/lib/profile";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import { publishStoredTopicDraftAfterAuth } from "@/features/topic-creation/lib/publish-stored-topic-draft";
import type {
  AuthErrorResponse,
  AuthSuccessResponse,
  AuthUser,
  UserRole,
} from "@/features/auth/types";

type AuthOnboardingProps = {
  closeHref?: string;
  currentUser: AuthUser;
  nextPath: string;
  onCancel?: () => void;
  onCloseHandlerChange?: (handler: (() => Promise<void>) | null) => void;
  onComplete?: (user: AuthUser) => Promise<void> | void;
};

type FieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "nickname"
    | "patronymic"
    | "role",
    string
  >
>;

type SuggestedDisplayNameResponse = {
  displayName?: string;
} & AuthErrorResponse;

function isPostPublishingFlow(nextPath: string) {
  return nextPath.split(/[?#]/, 1)[0] === "/create-topic";
}

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
      <Label htmlFor={id} className={fieldControlLabelClassName}>
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
        className={`${fieldControlInputClassName} w-full`}
      />
      {error ? (
        <ErrorMessage className="mt-0.5 text-[14px] leading-5 text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}

export function AuthOnboarding({
  closeHref,
  currentUser,
  nextPath,
  onCancel,
  onCloseHandlerChange,
  onComplete,
}: AuthOnboardingProps) {
  const router = useRouter();
  const [user, setUser] = useState(currentUser);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [nickname, setNickname] = useState(user.displayName ?? user.nickname ?? "");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [patronymic, setPatronymic] = useState(user.patronymic ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const hasAutoSelectedRoleRef = useRef(false);

  const currentStep = resolveOnboardingStep(user);
  const resolvedCloseHref = closeHref ?? nextPath;
  const shouldSkipRoleSelection = isPostPublishingFlow(nextPath);

  const applyUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setNickname(nextUser.displayName ?? nextUser.nickname ?? "");
    setFirstName(nextUser.firstName ?? "");
    setLastName(nextUser.lastName ?? "");
    setPatronymic(nextUser.patronymic ?? "");
    setFieldErrors({});
    setFormError(null);
    dispatchAuthStateChanged();
  }, []);

  const updateDisplayName = useCallback((value: string) => {
    setNickname(value);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      nickname: "",
    }));
    setFormError(null);
  }, []);

  const generateAnotherDisplayName = useCallback(async () => {
    setIsGeneratingName(true);
    setFormError(null);

    try {
      const response = await fetch("/api/auth/onboarding/suggested-display-name", {
        cache: "no-store",
      });
      const payload = (await response.json()) as SuggestedDisplayNameResponse;

      if (!response.ok || !payload.displayName) {
        setFormError(payload.error ?? "Не удалось сгенерировать другое имя.");
        return;
      }

      updateDisplayName(payload.displayName);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Не удалось сгенерировать другое имя.",
      );
    } finally {
      setIsGeneratingName(false);
    }
  }, [updateDisplayName]);

  const submitTo = useCallback(async (path: string, body: Record<string, unknown>) => {
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
        if (onComplete) {
          await onComplete(payload.user);
          return;
        }

        if (shouldSkipRoleSelection) {
          await publishStoredTopicDraftAfterAuth();
          window.location.replace("/");
          return;
        }

        router.replace(buildPostAuthRedirectPath(payload.user, nextPath));
        router.refresh();
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Не удалось завершить вход.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [applyUser, nextPath, onComplete, router, shouldSkipRoleSelection]);

  const handleClose = useCallback(async () => {
    if (isSubmitting || isGeneratingName) {
      return;
    }

    if (currentStep === "user-profile") {
      await submitTo("/api/auth/onboarding/user-profile", {
        displayName: nickname,
      });
      return;
    }

    if (onCancel) {
      onCancel();
      return;
    }

    router.push(resolvedCloseHref);
  }, [
    currentStep,
    isGeneratingName,
    isSubmitting,
    nickname,
    onCancel,
    resolvedCloseHref,
    router,
    submitTo,
  ]);

  useEffect(() => {
    if (!onCloseHandlerChange) {
      return;
    }

    onCloseHandlerChange(handleClose);

    return () => {
      onCloseHandlerChange(null);
    };
  }, [handleClose, onCloseHandlerChange]);

  useEffect(() => {
    if (
      currentStep !== "role"
      || !shouldSkipRoleSelection
      || isSubmitting
      || hasAutoSelectedRoleRef.current
    ) {
      return;
    }

    hasAutoSelectedRoleRef.current = true;
    void submitTo("/api/auth/onboarding/role", {
      role: "user",
    });
  }, [currentStep, isSubmitting, shouldSkipRoleSelection, submitTo]);

  return (
    <div className="modal-surface surface-elevated pointer-events-auto relative w-full max-w-[420px] px-5 py-6 min-[480px]:px-6">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={() => {
          void handleClose();
        }}
        className={buttonClassName({
          className: "absolute right-5 top-5 text-[var(--label-secondary)] hover:text-[var(--label-primary)]",
          isIconOnly: true,
          size: "sm",
          variant: "quaternary",
        })}
        disabled={isSubmitting}
      >
        <CloseIcon />
      </button>

      {currentStep === "role" && shouldSkipRoleSelection ? (
        <div className="flex flex-col gap-3">
          <h1 className="type-h1 font-bold text-[var(--label-primary)]">
            Готовим профиль
          </h1>
          <p className="type-body-relaxed text-[var(--label-secondary)]">
            Ещё секунда, и можно будет опубликовать пост.
          </p>
          {formError ? (
            <p className="type-caption text-[var(--danger)]">
              {formError}
            </p>
          ) : null}
        </div>
      ) : null}

      {currentStep === "role" && !shouldSkipRoleSelection ? (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="type-h1 font-bold text-[var(--label-primary)]">
              Выберите роль
            </h1>
          </div>

          <div className="flex flex-col gap-3">
            {[
              {
                description: "Читать, публиковать, участвовать в комментариях",
                role: "user" as const,
                title: "Я ищу поддержку",
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
            size="md"
              className="w-full"
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
            isLoading={isSubmitting}
          >
            Продолжить
          </Button>
        </div>
      ) : null}

      {currentStep === "user-profile" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitTo("/api/auth/onboarding/user-profile", {
              displayName: nickname,
            });
          }}
        >
          <div>
            <h1 className="type-h1 font-bold text-[var(--label-primary)]">
              Как вас будут видеть другие?
            </h1>
          </div>

          <TextField
            aria-label="Имя или псевдоним"
            isInvalid={Boolean(fieldErrors.nickname)}
            className="flex flex-col gap-2"
          >
            <Input
              id="onboarding-display-name"
              name="displayName"
              type="text"
              value={nickname}
              onChange={(event) => {
                updateDisplayName(event.target.value);
              }}
              onInput={(event) => {
                updateDisplayName(event.currentTarget.value);
              }}
              autoComplete="nickname"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Имя или псевдоним"
              className={`${fieldControlInputClassName} w-full`}
            />
            {fieldErrors.nickname ? (
              <ErrorMessage className="mt-0.5 text-[14px] leading-5 text-[var(--danger)]">
                {fieldErrors.nickname}
              </ErrorMessage>
            ) : null}
          </TextField>

          {formError ? (
            <p className="type-caption text-[var(--danger)]">
              {formError}
            </p>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="md"
              className="w-full"
            disabled={isSubmitting || isGeneratingName}
            onClick={() => {
              void generateAnotherDisplayName();
            }}
          >
            {isGeneratingName ? "Генерируем..." : "Сгенерировать другое имя"}
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
              className="w-full"
            disabled={isSubmitting || isGeneratingName}
            isLoading={isSubmitting}
          >
            Войти
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
              specialistPhoneCountry: null,
              specialistPhoneNumber: null,
            });
          }}
        >
          <div>
            <h1 className="type-h1 font-bold text-[var(--label-primary)]">
              Публичные данные профиля
            </h1>
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
            description="Необязательное поле. Оно нужно только для анкеты и не показывается в профиле."
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
            size="md"
              className="w-full"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Войти
          </Button>
        </form>
      ) : null}
    </div>
  );
}
