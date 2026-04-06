"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { ADMIN_SPECIALTY_OPTIONS } from "@/features/admin/lib/admin-specialties";
import { AdminSpecialtyTags } from "@/features/admin/components/admin-specialty-tags";
import {
  AdminImageCropField,
  buildCroppedImageDataUrl,
  DEFAULT_ADMIN_IMAGE_CROP_SETTINGS,
  type AdminImageCropSettings,
} from "@/features/admin/components/admin-image-crop-field";
import type { AdminListedUser } from "@/features/admin/types";
import type { UserRole } from "@/features/auth/types";

type AdminUserEditorModalProps = {
  initialUser?: AdminListedUser | null;
  isOpen: boolean;
  onClose: () => void;
};

const ROLE_OPTIONS: Array<{
  description: string;
  label: string;
  value: UserRole;
}> = [
  {
    description: "Псевдоним, описание профиля и квадратный аватар для продукта.",
    label: "Пользователь",
    value: "user",
  },
  {
    description: "Имя, фамилия, направления, описание и два формата фото.",
    label: "Специалист",
    value: "specialist",
  },
];

const EMPTY_ERROR = "";
const USER_DESCRIPTION_LIMIT = 250;
const SPECIALIST_DESCRIPTION_LIMIT = 750;

function buildInitialState(initialUser?: AdminListedUser | null) {
  const role = initialUser?.role ?? "user";

  return {
    avatarCardCrop: DEFAULT_ADMIN_IMAGE_CROP_SETTINGS,
    avatarSourceUrl:
      initialUser?.avatarSourceUrl
      ?? initialUser?.avatarCardUrl
      ?? initialUser?.avatarUrl
      ?? null,
    avatarSquareCrop: DEFAULT_ADMIN_IMAGE_CROP_SETTINGS,
    displayName: initialUser?.role === "user" ? initialUser.displayName : "",
    email: initialUser?.email ?? "",
    firstName: initialUser?.firstName ?? "",
    lastName: initialUser?.lastName ?? "",
    password: "",
    profileDescription: initialUser?.profileDescription ?? "",
    role,
    specialties: initialUser?.specialties ?? [],
  };
}

export function AdminUserEditorModal({
  initialUser = null,
  isOpen,
  onClose,
}: AdminUserEditorModalProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [avatarSourceUrl, setAvatarSourceUrl] = useState<string | null>(null);
  const [avatarSquareCrop, setAvatarSquareCrop] = useState<AdminImageCropSettings>(
    DEFAULT_ADMIN_IMAGE_CROP_SETTINGS,
  );
  const [avatarCardCrop, setAvatarCardCrop] = useState<AdminImageCropSettings>(
    DEFAULT_ADMIN_IMAGE_CROP_SETTINGS,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(EMPTY_ERROR);

  const isEditing = Boolean(initialUser);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialState = buildInitialState(initialUser);
    setAvatarCardCrop(initialState.avatarCardCrop);
    setAvatarSourceUrl(initialState.avatarSourceUrl);
    setAvatarSquareCrop(initialState.avatarSquareCrop);
    setDisplayName(initialState.displayName);
    setEmail(initialState.email);
    setFirstName(initialState.firstName);
    setLastName(initialState.lastName);
    setPassword(initialState.password);
    setProfileDescription(initialState.profileDescription);
    setRole(initialState.role);
    setSpecialties(initialState.specialties);
    setErrorMessage(EMPTY_ERROR);
    setIsSaving(false);
  }, [initialUser, isOpen]);

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, isSaving, onClose]);

  const selectedRoleMeta = useMemo(
    () => ROLE_OPTIONS.find((option) => option.value === role) ?? ROLE_OPTIONS[0],
    [role],
  );

  if (!isOpen) {
    return null;
  }

  function toggleSpecialty(nextValue: string) {
    setSpecialties((currentValues) =>
      currentValues.includes(nextValue)
        ? currentValues.filter((value) => value !== nextValue)
        : [...currentValues, nextValue],
    );
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
      outputHeight: 512,
      outputWidth: 512,
      settings: avatarSquareCrop,
      sourceImage: avatarSourceUrl,
    });

    const avatarCardUrl = role === "specialist"
      ? await buildCroppedImageDataUrl({
          outputHeight: 720,
          outputWidth: 960,
          settings: avatarCardCrop,
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
    setIsSaving(true);
    setErrorMessage(EMPTY_ERROR);

    try {
      const avatarPayload = await buildAvatarPayload();
      const basePayload = {
        ...avatarPayload,
        displayName: role === "user" ? displayName : undefined,
        firstName: role === "specialist" ? firstName : undefined,
        lastName: role === "specialist" ? lastName : undefined,
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
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось сохранить аккаунт.");
      }

      router.refresh();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить аккаунт.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-editor-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,23,42,0.46)] backdrop-blur-[3px]"
        aria-label="Закрыть модалку"
        onClick={() => {
          if (!isSaving) {
            onClose();
          }
        }}
      />

      <div className="surface-primary border-separator relative z-10 max-h-[90dvh] w-full max-w-[920px] overflow-y-auto rounded-[30px] border p-5 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:p-6">
        <button
          type="button"
          className="interactive-control absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg"
          aria-label="Закрыть"
          onClick={() => {
            if (!isSaving) {
              onClose();
            }
          }}
        >
          x
        </button>

        <div className="pr-10">
          <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--label-secondary)]">
            Admin
          </p>
          <h2
            id="admin-user-editor-title"
            className="font-helvetica mt-2 text-[30px] font-bold leading-none"
          >
            {isEditing ? "Редактировать аккаунт" : "Добавить пользователя"}
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--label-secondary)]">
            {selectedRoleMeta.description}
          </p>
        </div>

        <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
          <section className="space-y-4">
            <div className="inline-flex rounded-[16px] bg-[var(--fill-control-hover)] p-1">
              {ROLE_OPTIONS.map((option) => {
                const isActive = option.value === role;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isEditing}
                    onClick={() => {
                      if (!isEditing) {
                        setRole(option.value);
                      }
                    }}
                    className={`rounded-[12px] px-5 py-3 text-left text-[14px] font-bold leading-5 transition-colors ${
                      isActive
                        ? "surface-elevated text-[var(--accent-primary)]"
                        : "text-label-tertiary"
                    } ${isEditing ? "cursor-default opacity-70" : "cursor-pointer"}`.trim()}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {isEditing ? (
              <p className="text-[12px] leading-5 text-[var(--label-tertiary)]">
                Тип аккаунта в текущей версии не меняется через редактирование.
              </p>
            ) : null}
          </section>

          {!isEditing ? (
            <section className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--label-primary)]">Email</span>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--label-primary)]">Пароль</span>
                <TextInput
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Минимум 8 символов"
                />
              </label>
            </section>
          ) : (
            <div className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--label-primary)]">Email</span>
              <div className="border-separator bg-background-primary rounded-[22px] border px-5 py-4 text-[var(--label-secondary)]">
                {initialUser?.email}
              </div>
            </div>
          )}

          {role === "user" ? (
            <section className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm sm:col-span-2">
                  <span className="font-medium text-[var(--label-primary)]">Ник</span>
                  <TextInput
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Как показывать пользователя в продукте"
                  />
                </label>

                <label className="grid gap-2 text-sm sm:col-span-2">
                  <span className="flex items-center justify-between gap-3 font-medium text-[var(--label-primary)]">
                    <span>Описание профиля</span>
                    <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                      {profileDescription.length}/{USER_DESCRIPTION_LIMIT}
                    </span>
                  </span>
                  <textarea
                    value={profileDescription}
                    maxLength={USER_DESCRIPTION_LIMIT}
                    onChange={(event) => setProfileDescription(event.target.value)}
                    placeholder="Короткое описание пользователя"
                    className="field-shell min-h-[132px] rounded-[24px] px-5 py-4 text-[15px] outline-none placeholder:text-[var(--label-tertiary)]"
                  />
                </label>
              </div>

              <AdminImageCropField
                aspectRatio="1:1"
                label="Аватар"
                helperText="Квадратный аватар используется в ленте, комментариях и в меню профиля."
                sourceImage={avatarSourceUrl}
                settings={avatarSquareCrop}
                onSelectFile={(nextImage) => {
                  setAvatarSourceUrl(nextImage);
                  setAvatarSquareCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                }}
                onSettingsChange={setAvatarSquareCrop}
                onClear={() => {
                  setAvatarSourceUrl(null);
                  setAvatarSquareCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                }}
              />
            </section>
          ) : (
            <section className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--label-primary)]">Имя</span>
                  <TextInput
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Имя специалиста"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--label-primary)]">Фамилия</span>
                  <TextInput
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Фамилия специалиста"
                  />
                </label>
              </div>

              <section className="border-separator rounded-[24px] border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--label-primary)]">Направления</p>
                    <p className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
                      Выбранные направления показываются тегами в таблице и доступны для редактирования.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <AdminSpecialtyTags specialties={specialties} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ADMIN_SPECIALTY_OPTIONS.map((specialty) => {
                    const isSelected = specialties.includes(specialty);

                    return (
                      <label
                        key={specialty}
                        className={`border-separator flex cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-3 text-sm transition-colors ${
                          isSelected ? "surface-elevated" : "bg-background-primary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSpecialty(specialty)}
                        />
                        <span>{specialty}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <label className="grid gap-2 text-sm">
                <span className="flex items-center justify-between gap-3 font-medium text-[var(--label-primary)]">
                  <span>Описание</span>
                  <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                    {profileDescription.length}/{SPECIALIST_DESCRIPTION_LIMIT}
                  </span>
                </span>
                <textarea
                  value={profileDescription}
                  maxLength={SPECIALIST_DESCRIPTION_LIMIT}
                  onChange={(event) => setProfileDescription(event.target.value)}
                  placeholder="Краткое описание специалиста"
                  className="field-shell min-h-[150px] rounded-[24px] px-5 py-4 text-[15px] outline-none placeholder:text-[var(--label-tertiary)]"
                />
              </label>

              <div className="grid gap-4 xl:grid-cols-2">
                <AdminImageCropField
                  aspectRatio="1:1"
                  label="Фото 1:1"
                  helperText="Квадратный вариант для ленты, комментариев и компактных элементов интерфейса."
                  sourceImage={avatarSourceUrl}
                  settings={avatarSquareCrop}
                  uploadLabel="Выбрать исходное фото"
                  onSelectFile={(nextImage) => {
                    setAvatarSourceUrl(nextImage);
                    setAvatarSquareCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                    setAvatarCardCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                  }}
                  onSettingsChange={setAvatarSquareCrop}
                  onClear={() => {
                    setAvatarSourceUrl(null);
                    setAvatarSquareCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                    setAvatarCardCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                  }}
                />

                <AdminImageCropField
                  aspectRatio="4:3"
                  label="Фото 4:3"
                  helperText="Более крупный вариант сохраняется для карточки специалиста и future-friendly поверхностей."
                  sourceImage={avatarSourceUrl}
                  settings={avatarCardCrop}
                  uploadLabel="Использовать то же исходное фото"
                  onSelectFile={(nextImage) => {
                    setAvatarSourceUrl(nextImage);
                    setAvatarSquareCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                    setAvatarCardCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                  }}
                  onSettingsChange={setAvatarCardCrop}
                  onClear={() => {
                    setAvatarSourceUrl(null);
                    setAvatarSquareCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                    setAvatarCardCrop(DEFAULT_ADMIN_IMAGE_CROP_SETTINGS);
                  }}
                />
              </div>
            </section>
          )}

          {errorMessage ? (
            <p className="text-sm text-[var(--accent-critical)]">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="!rounded-full !px-5"
              disabled={isSaving}
              onClick={onClose}
            >
              Отмена
            </Button>
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
      </div>
    </div>
  );
}
