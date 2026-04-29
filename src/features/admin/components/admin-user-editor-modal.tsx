"use client";

import { Checkbox, ErrorMessage, Input, Label, Modal, TextArea, TextField, cn } from "@heroui/react";
import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import {
  ADMIN_ACCOUNT_NAME_MAX_LENGTH,
  ADMIN_USER_NAME_MAX_LENGTH,
  getAdminAccountNameError,
  getAdminUserNameError,
  normalizeAdminAccountName,
} from "@/features/admin/lib/admin-user-fields";
import { ADMIN_SPECIALTY_OPTIONS } from "@/features/admin/lib/admin-specialties";
import { AdminSpecialtyTags } from "@/features/admin/components/admin-specialty-tags";
import {
  buildCroppedImageDataUrl,
  DEFAULT_IMAGE_CROP_VALUE,
  type ImageCropValue,
} from "@/features/media/lib/image-upload";
import { ImageUploadCropField } from "@/features/media/components/image-upload-crop-field";
import { BackNavigationButton } from "@/features/topic-creation/components/back-navigation-button";
import type { AdminListedUser, AdminManagedUserFieldErrorName } from "@/features/admin/types";
import type { UserRole } from "@/features/auth/types";

type AdminUserEditorModalProps = {
  defaultRole?: UserRole;
  embedded?: boolean;
  initialUser?: AdminListedUser | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
};

type AdminUserEditorFormErrors = {
  [Key in AdminManagedUserFieldErrorName]?: string;
};

const EMPTY_ERROR = "";
const REQUIRED_FIELD_ERROR = "Это поле обязательно";
const USER_DESCRIPTION_LIMIT = 250;
const SPECIALIST_DESCRIPTION_LIMIT = 750;
const EMPTY_FORM_ERRORS: AdminUserEditorFormErrors = {};
const GENERATED_EMAIL_DOMAIN = "example.test";
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function FormTextField({
  autoCapitalize = "sentences",
  autoComplete = "on",
  autoCorrect = "on",
  counter,
  disablePasswordManagerHints = false,
  error,
  inputMode,
  label,
  maxLength,
  onChange,
  onBlur,
  placeholder,
  prefix,
  spellCheck = true,
  type = "text",
  value,
}: {
  autoCapitalize?: "characters" | "none" | "off" | "on" | "sentences" | "words";
  autoComplete?: string;
  autoCorrect?: "off" | "on";
  counter?: ReactNode;
  disablePasswordManagerHints?: boolean;
  error?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder: string;
  prefix?: ReactNode;
  spellCheck?: boolean;
  type?: "email" | "password" | "text";
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextField isInvalid={Boolean(error)} className="flex flex-col gap-2 text-sm">
      <Label className="font-medium text-[var(--label-primary)]">{label}</Label>
      <div className="relative">
        {counter && isFocused ? (
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 pl-2 text-[12px] font-medium leading-4 text-[var(--label-tertiary)]">
            {counter}
          </span>
        ) : null}
        {prefix ? (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 w-[1ch] -translate-y-1/2 text-center text-[16px] leading-6 text-[var(--label-secondary)]">
            {prefix}
          </span>
        ) : null}
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event.target.value);
          }}
          autoCapitalize={autoCapitalize}
          autoComplete={disablePasswordManagerHints ? "off" : autoComplete}
          autoCorrect={autoCorrect}
          data-1p-ignore={disablePasswordManagerHints ? "true" : undefined}
          data-bwignore={disablePasswordManagerHints ? "true" : undefined}
          data-form-type={disablePasswordManagerHints ? "other" : undefined}
          data-lpignore={disablePasswordManagerHints ? "true" : undefined}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          spellCheck={spellCheck}
          className={cn(
            "min-h-[54px] w-full rounded-[16px] py-4 text-[16px] leading-6",
            prefix ? "pl-8" : "",
            counter && isFocused ? "pr-12" : "",
          )}
        />
      </div>
      {error ? (
        <ErrorMessage className="mt-0.5 text-[14px] leading-5 text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}

function FormTextareaField({
  helper,
  label,
  maxLength,
  minHeightClassName,
  onChange,
  placeholder,
  value,
}: {
  helper?: ReactNode;
  label: string;
  maxLength?: number;
  minHeightClassName: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <TextField className="grid gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        <Label className="font-medium text-[var(--label-primary)]">{label}</Label>
        {helper}
      </span>
      <TextArea
        ref={textareaRef}
        rows={1}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          event.currentTarget.style.height = "0px";
          event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
        }}
        placeholder={placeholder}
        className={`w-full resize-none overflow-hidden rounded-[16px] py-4 text-[16px] leading-6 ${minHeightClassName}`.trim()}
      />
    </TextField>
  );
}

function buildInitialState(
  initialUser?: AdminListedUser | null,
  defaultRole: UserRole = "user",
) {
  const role = initialUser?.role ?? defaultRole;

  return {
    avatarCardCrop: DEFAULT_IMAGE_CROP_VALUE,
    avatarSourceUrl:
      initialUser?.avatarSourceUrl
      ?? initialUser?.avatarCardUrl
      ?? initialUser?.avatarUrl
      ?? null,
    avatarSquareCrop: DEFAULT_IMAGE_CROP_VALUE,
    displayName: initialUser?.role === "user" ? initialUser.displayName : "",
    email: initialUser?.email ?? "",
    firstName: initialUser?.firstName ?? "",
    lastName: initialUser?.lastName ?? "",
    nickname: initialUser?.nickname ?? "",
    password: "",
    profileDescription: initialUser?.profileDescription ?? "",
    role,
    specialties: initialUser?.specialties ?? [],
  };
}

function generateRandomToken(length: number) {
  const randomValues = crypto.getRandomValues(new Uint32Array(length));

  return Array.from(randomValues, (value) =>
    PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length])
    .join("");
}

function generateRandomEmail(role: UserRole) {
  return `${role}.${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}@${GENERATED_EMAIL_DOMAIN}`;
}

export function AdminUserEditorModal({
  defaultRole = "user",
  embedded = false,
  initialUser = null,
  isOpen,
  onClose,
  onBack,
}: AdminUserEditorModalProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(embedded);
  const [role, setRole] = useState<UserRole>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [avatarSourceUrl, setAvatarSourceUrl] = useState<string | null>(null);
  const [avatarSquareCrop, setAvatarSquareCrop] = useState<ImageCropValue>(
    DEFAULT_IMAGE_CROP_VALUE,
  );
  const [avatarCardCrop, setAvatarCardCrop] = useState<ImageCropValue>(
    DEFAULT_IMAGE_CROP_VALUE,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(EMPTY_ERROR);
  const [formErrors, setFormErrors] = useState<AdminUserEditorFormErrors>(
    EMPTY_FORM_ERRORS,
  );
  const [requiredFieldWasFilled, setRequiredFieldWasFilled] = useState<
    Partial<Record<AdminManagedUserFieldErrorName, boolean>>
  >({});
  const isEditing = Boolean(initialUser);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialState = buildInitialState(initialUser, defaultRole);
    setAvatarCardCrop(initialState.avatarCardCrop);
    setAvatarSourceUrl(initialState.avatarSourceUrl);
    setAvatarSquareCrop(initialState.avatarSquareCrop);
    setDisplayName(initialState.displayName);
    setEmail(initialState.email);
    setFirstName(initialState.firstName);
    setLastName(initialState.lastName);
    setNickname(initialState.nickname);
    setPassword(initialState.password);
    setProfileDescription(initialState.profileDescription);
    setRole(initialState.role);
    setSpecialties(initialState.specialties);
    setErrorMessage(EMPTY_ERROR);
    setFormErrors(EMPTY_FORM_ERRORS);
    setIsSaving(false);
    setRequiredFieldWasFilled({});
  }, [defaultRole, initialUser, isOpen]);

  // In embedded mode there is no Modal wrapper to handle keyboard events,
  // so we need to intercept Escape manually.
  useEffect(() => {
    if (!isOpen || !embedded) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [embedded, isOpen, isSaving, onClose]);

  if (!isOpen || (!embedded && !isMounted)) {
    return null;
  }

  const title = isEditing
    ? "Редактировать аккаунт"
    : defaultRole === "specialist"
      ? "Добавить специалиста"
      : "Добавить пользователя";

  function toggleSpecialty(nextValue: string) {
    setSpecialties((currentValues) =>
      currentValues.includes(nextValue)
        ? currentValues.filter((value) => value !== nextValue)
        : [...currentValues, nextValue],
    );
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      specialties: undefined,
    }));
  }

  function handleGenerateCredentials() {
    setEmail(generateRandomEmail(role));
    setPassword(generateRandomToken(16));
    setRequiredFieldWasFilled((currentState) => ({
      ...currentState,
      email: true,
      password: true,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      email: undefined,
      password: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: AdminUserEditorFormErrors = {};

    if (!isEditing) {
      if (!email.trim()) {
        nextErrors.email = REQUIRED_FIELD_ERROR;
      }

      if (!password) {
        nextErrors.password = REQUIRED_FIELD_ERROR;
      }
    }

    if (role === "user") {
      const normalizedNickname = normalizeAdminAccountName(nickname);
      const displayNameError = !displayName.trim()
        ? REQUIRED_FIELD_ERROR
        : getAdminUserNameError(displayName);
      const nicknameError = !normalizedNickname
        ? REQUIRED_FIELD_ERROR
        : getAdminAccountNameError(normalizedNickname);

      if (displayNameError) {
        nextErrors.displayName = displayNameError;
      }

      if (nicknameError) {
        nextErrors.nickname = nicknameError;
      }
    } else {
      if (!firstName.trim()) {
        nextErrors.firstName = "Введите имя";
      }

      if (!lastName.trim()) {
        nextErrors.lastName = "Введите фамилию";
      }

      if (specialties.length === 0) {
        nextErrors.specialties = "Выберите хотя бы один подход";
      }
    }

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function setRequiredFieldError(fieldName: AdminManagedUserFieldErrorName, value: string) {
    if (!value.trim() && !requiredFieldWasFilled[fieldName]) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        [fieldName]: undefined,
      }));
      return;
    }

    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: value.trim() ? undefined : REQUIRED_FIELD_ERROR,
    }));
  }

  function handleUserAccountNameChange(value: string) {
    const normalizedValue = normalizeAdminAccountName(value);
    const nextError = normalizedValue
      ? getAdminAccountNameError(normalizedValue)
      : undefined;

    setNickname(normalizedValue);
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      nickname: nextError ?? undefined,
    }));
  }

  function mapRequestErrorMessage(message: string) {
    const normalizedMessage = message.trim().toLowerCase();

    if (!normalizedMessage) {
      return "Не удалось сохранить";
    }

    if (normalizedMessage.includes("access denied")) {
      return "Доступ закрыт";
    }

    if (normalizedMessage.includes("failed to fetch")) {
      return "Нет соединения";
    }

    return message;
  }

  async function buildAvatarPayload() {
    if (!avatarSourceUrl) {
      return {
        avatarCardUrl: null,
        avatarSourceUrl: null,
        avatarUrl: null,
      };
    }

    const avatarUrl = await buildCroppedImageDataUrl({
      crop: avatarSquareCrop,
      outputHeight: 512,
      outputWidth: 512,
      sourceImage: avatarSourceUrl,
    });

    const avatarCardUrl = role === "specialist"
      ? await buildCroppedImageDataUrl({
          crop: avatarCardCrop,
          outputHeight: 720,
          outputWidth: 960,
          sourceImage: avatarSourceUrl,
        })
      : null;

    return {
      avatarCardUrl,
      avatarSourceUrl,
      avatarUrl,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(EMPTY_ERROR);

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const avatarPayload = await buildAvatarPayload();
      const basePayload = {
        ...avatarPayload,
        displayName: role === "user" ? displayName.trim() : undefined,
        firstName: role === "specialist" ? firstName : undefined,
        lastName: role === "specialist" ? lastName : undefined,
        nickname: role === "user" ? normalizeAdminAccountName(nickname) : undefined,
        profileDescription,
        role,
        specialties: role === "specialist" ? specialties : [],
      };

      const response = await fetch(
        isEditing ? `/api/admin/users/${initialUser?.id}` : "/api/admin/users",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? basePayload
              : {
                  ...basePayload,
                  email,
                  password,
                },
          ),
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        fieldErrors?: AdminUserEditorFormErrors;
      };

      if (!response.ok) {
        if (payload.fieldErrors) {
          setFormErrors(payload.fieldErrors);
          setErrorMessage(EMPTY_ERROR);
          return;
        }

        throw new Error(payload.error ?? "Не удалось сохранить аккаунт.");
      }

      router.refresh();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? mapRequestErrorMessage(error.message)
          : "Не удалось сохранить",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const innerContent = (
    <>
      {!embedded ? (
        <IconButton
          className="absolute right-3 top-3 text-[var(--label-primary)]"
          label="Закрыть"
          onClick={() => {
            if (!isSaving) {
              onClose();
            }
          }}
          icon={<CloseIcon />}
        />
      ) : null}

      {embedded ? (
        <div className="flex items-center gap-3 pr-10">
          <BackNavigationButton
            onClick={() => {
              if (!isSaving) {
                onBack?.();
              }
            }}
          />
          <h2
            id="admin-user-editor-title"
            className="font-helvetica text-[28px] font-bold leading-none"
          >
            {title}
          </h2>
        </div>
      ) : (
        <div className="pr-10">
          <h2
            id="admin-user-editor-title"
            className="font-helvetica text-[30px] font-bold leading-none"
          >
            {title}
          </h2>
        </div>
      )}

      <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
          {!isEditing ? (
            <section className="grid gap-3">
              <div className="grid gap-4 min-[1280px]:grid-cols-2">
                <FormTextField
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  disablePasswordManagerHints
                  error={formErrors.email}
                  inputMode="email"
                  label="Email"
                  onBlur={(value) => setRequiredFieldError("email", value)}
                  spellCheck={false}
                  type="email"
                  value={email}
                  onChange={(value) => {
                    const hasValue = value.trim().length > 0;
                    setRequiredFieldWasFilled((currentState) => (
                      hasValue
                        ? {
                            ...currentState,
                            email: true,
                          }
                        : currentState
                    ));
                    setEmail(value);
                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      email:
                        !hasValue && requiredFieldWasFilled.email
                          ? REQUIRED_FIELD_ERROR
                          : undefined,
                    }));
                  }}
                  placeholder="name@example.com"
                />

                <FormTextField
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  disablePasswordManagerHints
                  error={formErrors.password}
                  label="Пароль"
                  onBlur={(value) => setRequiredFieldError("password", value)}
                  spellCheck={false}
                  type="password"
                  value={password}
                  onChange={(value) => {
                    const hasValue = value.trim().length > 0;
                    setRequiredFieldWasFilled((currentState) => (
                      hasValue
                        ? {
                            ...currentState,
                            password: true,
                          }
                        : currentState
                    ));
                    setPassword(value);
                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      password:
                        !hasValue && requiredFieldWasFilled.password
                          ? REQUIRED_FIELD_ERROR
                          : undefined,
                    }));
                  }}
                  placeholder="Минимум 8 символов"
                />
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleGenerateCredentials}
                  className="cursor-pointer text-sm font-medium text-[var(--accent-primary)] transition-none hover:text-[var(--color-accent-hover)]"
                >
                  Сгенерировать
                </button>
              </div>
            </section>
          ) : null}

          {role === "user" ? (
            <section className="grid gap-6">
              <div className="grid gap-4 min-[1280px]:grid-cols-2 min-[1280px]:items-start">
                <FormTextField
                  counter={`${displayName.length}/${ADMIN_USER_NAME_MAX_LENGTH}`}
                  error={formErrors.displayName}
                  label="Имя"
                  maxLength={ADMIN_USER_NAME_MAX_LENGTH}
                  onBlur={(value) => setRequiredFieldError("displayName", value)}
                  value={displayName}
                  onChange={(value) => {
                    const hasValue = value.trim().length > 0;
                    setRequiredFieldWasFilled((currentState) => (
                      hasValue
                        ? {
                            ...currentState,
                            displayName: true,
                          }
                        : currentState
                    ));
                    setDisplayName(value);
                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      displayName:
                        !hasValue && requiredFieldWasFilled.displayName
                          ? REQUIRED_FIELD_ERROR
                          : undefined,
                    }));
                  }}
                  placeholder="Имя пользователя"
                />

                <FormTextField
                  autoCapitalize="none"
                  autoCorrect="off"
                  counter={`${nickname.length}/${ADMIN_ACCOUNT_NAME_MAX_LENGTH}`}
                  error={formErrors.nickname}
                  inputMode="text"
                  label="Имя аккаунта"
                  maxLength={ADMIN_ACCOUNT_NAME_MAX_LENGTH}
                  onBlur={(value) => {
                    if (!value.trim()) {
                      if (!requiredFieldWasFilled.nickname) {
                        setFormErrors((currentErrors) => ({
                          ...currentErrors,
                          nickname: undefined,
                        }));
                        return;
                      }

                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        nickname: REQUIRED_FIELD_ERROR,
                      }));
                      return;
                    }

                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      nickname: getAdminAccountNameError(value) ?? undefined,
                    }));
                  }}
                  prefix="@"
                  spellCheck={false}
                  value={nickname}
                  onChange={(value) => {
                    const normalizedValue = normalizeAdminAccountName(value);
                    const hasValue = normalizedValue.length > 0;
                    setRequiredFieldWasFilled((currentState) => (
                      hasValue
                        ? {
                            ...currentState,
                            nickname: true,
                          }
                        : currentState
                    ));

                    if (!hasValue && requiredFieldWasFilled.nickname) {
                      setNickname(normalizedValue);
                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        nickname: REQUIRED_FIELD_ERROR,
                      }));
                      return;
                    }

                    handleUserAccountNameChange(value);
                  }}
                  placeholder="username"
                />
              </div>

              <FormTextareaField
                label="Описание профиля"
                helper={(
                  <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                    {profileDescription.length}/{USER_DESCRIPTION_LIMIT}
                  </span>
                )}
                maxLength={USER_DESCRIPTION_LIMIT}
                minHeightClassName="min-h-[132px]"
                value={profileDescription}
                onChange={setProfileDescription}
                placeholder="Короткое описание пользователя"
              />

              <ImageUploadCropField
                aspectRatio="1:1"
                label="Аватар"
                helperText=""
                sourceImage={avatarSourceUrl}
                previewVariant="avatar"
                value={avatarSquareCrop}
                outputHeight={512}
                outputWidth={512}
                onSourceImageChange={(nextImage) => {
                  setAvatarSourceUrl(nextImage);
                  setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                }}
                onValueChange={setAvatarSquareCrop}
                onClear={() => {
                  setAvatarSourceUrl(null);
                  setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                }}
              />
            </section>
          ) : (
            <section className="grid gap-6">
              <div className="grid gap-4 min-[1280px]:grid-cols-2">
                <FormTextField
                  error={formErrors.firstName}
                  label="Имя"
                  value={firstName}
                  onChange={(value) => {
                    setFirstName(value);
                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      firstName: undefined,
                    }));
                  }}
                  placeholder="Имя специалиста"
                />

                <FormTextField
                  error={formErrors.lastName}
                  label="Фамилия"
                  value={lastName}
                  onChange={(value) => {
                    setLastName(value);
                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      lastName: undefined,
                    }));
                  }}
                  placeholder="Фамилия специалиста"
                />
              </div>

              <section className="border-separator rounded-[16px] border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--label-primary)]">
                      Психотерапевтические подходы
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
                      Выбранные подходы показываются тегами в таблице и доступны для редактирования.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <AdminSpecialtyTags specialties={specialties} />
                </div>

                {formErrors.specialties ? (
                  <p className="mt-3 text-[13px] text-[var(--danger)]">
                    {formErrors.specialties}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2 min-[1280px]:grid-cols-2">
                  {ADMIN_SPECIALTY_OPTIONS.map((specialty) => {
                    const isSelected = specialties.includes(specialty);

                    return (
                      <Checkbox
                        key={specialty}
                        isSelected={isSelected}
                        onChange={() => toggleSpecialty(specialty)}
                        className={cn(
                          "border-separator rounded-[12px] border px-4 py-3 text-sm transition-colors",
                          isSelected ? "surface-elevated" : "bg-[var(--background-primary)]",
                        )}
                      >
                        {specialty}
                      </Checkbox>
                    );
                  })}
                </div>
              </section>

              <FormTextareaField
                label="Описание"
                helper={(
                  <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                    {profileDescription.length}/{SPECIALIST_DESCRIPTION_LIMIT}
                  </span>
                )}
                maxLength={SPECIALIST_DESCRIPTION_LIMIT}
                minHeightClassName="min-h-[150px]"
                value={profileDescription}
                onChange={setProfileDescription}
                placeholder="Краткое описание специалиста"
              />

              <div className="grid gap-4 min-[1280px]:grid-cols-2">
                <ImageUploadCropField
                  aspectRatio="1:1"
                  label="Фото 1:1"
                  helperText="Квадратный вариант для ленты, комментариев и компактных элементов интерфейса."
                  sourceImage={avatarSourceUrl}
                  value={avatarSquareCrop}
                  outputHeight={512}
                  outputWidth={512}
                  uploadLabel="Выбрать исходное фото"
                  onSourceImageChange={(nextImage) => {
                    setAvatarSourceUrl(nextImage);
                    setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                    setAvatarCardCrop(DEFAULT_IMAGE_CROP_VALUE);
                  }}
                  onValueChange={setAvatarSquareCrop}
                  onClear={() => {
                    setAvatarSourceUrl(null);
                    setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                    setAvatarCardCrop(DEFAULT_IMAGE_CROP_VALUE);
                  }}
                />

                <ImageUploadCropField
                  aspectRatio="4:3"
                  label="Фото 4:3"
                  helperText="Более крупный вариант сохраняется для карточки специалиста и future-friendly поверхностей."
                  sourceImage={avatarSourceUrl}
                  value={avatarCardCrop}
                  outputHeight={720}
                  outputWidth={960}
                  uploadLabel="Использовать то же исходное фото"
                  onSourceImageChange={(nextImage) => {
                    setAvatarSourceUrl(nextImage);
                    setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                    setAvatarCardCrop(DEFAULT_IMAGE_CROP_VALUE);
                  }}
                  onValueChange={setAvatarCardCrop}
                  onClear={() => {
                    setAvatarSourceUrl(null);
                    setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                    setAvatarCardCrop(DEFAULT_IMAGE_CROP_VALUE);
                  }}
                />
              </div>
            </section>
          )}

          {errorMessage ? (
            <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="submit"
              variant="primary"
              className="!rounded-full !px-5"
              disabled={isSaving}
            >
              {isSaving ? "Сохраняем..." : isEditing ? "Сохранить изменения" : "Создать аккаунт"}
            </Button>
          </div>
      </form>
    </>
  );

  if (embedded) {
    return <div className="w-full">{innerContent}</div>;
  }

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      variant="opaque"
      isDismissable={!isSaving}
      onClick={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('[data-slot="modal-dialog"]')) return;
        if (!isSaving) onClose();
      }}
      className="fixed inset-0 z-[220]"
    >
      <Modal.Container scroll="outside" className="!p-4">
        <Modal.Dialog
          aria-label={title}
          className="modal-surface relative w-full max-w-[720px] p-6"
        >
          {innerContent}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
