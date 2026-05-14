"use client";

import { Modal } from "@heroui/react";
import { toast } from "@/components/feedback/toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button-styles";
import { TextareaField, TextInputField } from "@/components/ui/field-control";
import { buildGeneratedAvatarUrl } from "@/lib/dicebear-avatar";
import {
  buildCroppedImageDataUrl,
  DEFAULT_IMAGE_CROP_VALUE,
  type ImageCropValue,
} from "@/features/media/lib/image-upload";
import { ImageUploadCropField } from "@/features/media/components/image-upload-crop-field";
import type { AuthErrorResponse, CurrentUserResponse } from "@/features/auth/types";

const PROFILE_COVER_OUTPUT_WIDTH = 1280;
const PROFILE_COVER_OUTPUT_HEIGHT = 400;
const PROFILE_AVATAR_OUTPUT_SIZE = 512;
const PROFILE_NAME_MAX_LENGTH = 40;
const PROFILE_DESCRIPTION_MAX_LENGTH = 150;

type ProfileEditModalProps = {
  avatarSeed: string;
  avatarSourceUrl: string | null;
  avatarUrl: string | null;
  displayName: string;
  isOpen: boolean;
  onClose: () => void;
  profileCoverUrl: string | null;
  profileDescription: string | null;
  showProfileCover: boolean;
};

type ProfileUpdateResponse = (CurrentUserResponse & { error?: string }) | AuthErrorResponse;

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M16 4L4 16M4 4l12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileEditModal({
  avatarSeed,
  avatarSourceUrl,
  avatarUrl,
  displayName,
  isOpen,
  onClose,
  profileCoverUrl,
  profileDescription,
  showProfileCover,
}: ProfileEditModalProps) {
  const router = useRouter();
  const generatedAvatarUrl = buildGeneratedAvatarUrl(avatarSeed);
  const [avatarCrop, setAvatarCrop] = useState<ImageCropValue>(DEFAULT_IMAGE_CROP_VALUE);
  const [avatarSourceImage, setAvatarSourceImage] = useState<string | null>(
    avatarSourceUrl ?? avatarUrl ?? generatedAvatarUrl,
  );
  const [avatarWasChanged, setAvatarWasChanged] = useState(false);
  const [coverCrop, setCoverCrop] = useState<ImageCropValue>(DEFAULT_IMAGE_CROP_VALUE);
  const [coverSourceImage, setCoverSourceImage] = useState<string | null>(profileCoverUrl);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"displayName" | "profileDescription", string>>>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(displayName);
  const [description, setDescription] = useState(profileDescription ?? "");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCoverCrop(DEFAULT_IMAGE_CROP_VALUE);
    setCoverSourceImage(profileCoverUrl);
    setAvatarCrop(DEFAULT_IMAGE_CROP_VALUE);
    setAvatarSourceImage(avatarSourceUrl ?? avatarUrl ?? generatedAvatarUrl);
    setAvatarWasChanged(false);
    setDescription(profileDescription ?? "");
    setFieldErrors({});
    setFormError("");
    setName(displayName);
  }, [
    avatarSourceUrl,
    avatarUrl,
    displayName,
    generatedAvatarUrl,
    isOpen,
    profileCoverUrl,
    profileDescription,
  ]);

  if (!isOpen) {
    return null;
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const trimmedName = name.trim();
    const nextFieldErrors: Partial<Record<"displayName" | "profileDescription", string>> = {};

    if (!trimmedName) {
      nextFieldErrors.displayName = "Укажите имя.";
    } else if (trimmedName.length > PROFILE_NAME_MAX_LENGTH) {
      nextFieldErrors.displayName = `Имя должно быть не длиннее ${PROFILE_NAME_MAX_LENGTH} символов.`;
    }

    if (description.length > PROFILE_DESCRIPTION_MAX_LENGTH) {
      nextFieldErrors.profileDescription = `Описание должно быть не длиннее ${PROFILE_DESCRIPTION_MAX_LENGTH} символов.`;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormError("");

    try {
      const nextCoverUrl = coverSourceImage
        ? await buildCroppedImageDataUrl({
            crop: coverCrop,
            outputHeight: PROFILE_COVER_OUTPUT_HEIGHT,
            outputWidth: PROFILE_COVER_OUTPUT_WIDTH,
            sourceImage: coverSourceImage,
          })
        : null;
      const nextAvatarUrl = avatarWasChanged && avatarSourceImage
        ? await buildCroppedImageDataUrl({
            crop: avatarCrop,
            outputHeight: PROFILE_AVATAR_OUTPUT_SIZE,
            outputWidth: PROFILE_AVATAR_OUTPUT_SIZE,
            sourceImage: avatarSourceImage,
          })
        : null;

      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(avatarWasChanged
            ? {
                avatarSourceUrl: avatarSourceImage,
                avatarUrl: nextAvatarUrl,
              }
            : {}),
          displayName: trimmedName,
          ...(showProfileCover ? { profileCoverUrl: nextCoverUrl } : {}),
          profileDescription: description.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ProfileUpdateResponse | null;

      if (!response.ok || !payload || !("user" in payload) || !payload.user) {
        const errorPayload = payload as AuthErrorResponse | null;
        setFieldErrors({
          displayName: errorPayload?.fieldErrors?.displayName,
          profileDescription: errorPayload?.fieldErrors?.profileDescription,
        });
        throw new Error(errorPayload?.error ?? "Не удалось сохранить профиль.");
      }

      toast.success("Профиль сохранен.");
      router.refresh();
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить профиль.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal.Backdrop
      isOpen
      variant="opaque"
      isDismissable={!isSaving}
      className="fixed inset-0 z-[240]"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        if (!isSaving) onClose();
      }}
    >
      <Modal.Container scroll="outside" className="!p-3 min-[480px]:!p-4">
        <Modal.Dialog
          aria-label="Изменить профиль"
          className="modal-surface w-full max-w-[720px] overflow-hidden p-0"
        >
          <Modal.Body className="p-0">
            <header className="relative px-5 pb-2 pt-5 min-[480px]:px-6">
              <h2 className="type-h2 min-w-0 pr-12 font-semibold text-[var(--label-primary)]">
                Изменить профиль
              </h2>
              <button
                type="button"
                aria-label="Закрыть"
                disabled={isSaving}
                className={buttonClassName({
                  className: "absolute right-3 top-3 text-[var(--label-primary)]",
                  isIconOnly: true,
                  size: "sm",
                  variant: "quaternary",
                })}
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="grid gap-6 px-5 py-5 min-[480px]:px-6">
              {showProfileCover ? (
                <ImageUploadCropField
                  aspectRatio="16:5"
                  helperText="Обложка будет выглядывать из-за карточки профиля."
                  isHeaderHidden
                  label="Cover-photo"
                  outputHeight={PROFILE_COVER_OUTPUT_HEIGHT}
                  outputWidth={PROFILE_COVER_OUTPUT_WIDTH}
                  previewVariant="cover-overlay"
                  sourceImage={coverSourceImage}
                  uploadLabel="Загрузить cover-photo"
                  value={coverCrop}
                  onClear={() => {
                    setCoverSourceImage(null);
                    setCoverCrop(DEFAULT_IMAGE_CROP_VALUE);
                  }}
                  onSourceImageChange={(nextImage) => {
                    setCoverSourceImage(nextImage);
                  }}
                  onValueChange={setCoverCrop}
                />
              ) : null}

              <ImageUploadCropField
                aspectRatio="1:1"
                helperText=""
                isHeaderHidden
                label="Аватар"
                outputHeight={PROFILE_AVATAR_OUTPUT_SIZE}
                outputWidth={PROFILE_AVATAR_OUTPUT_SIZE}
                previewVariant="avatar-overlay"
                sourceImage={avatarSourceImage}
                uploadLabel="Загрузить аватар"
                value={avatarCrop}
                onClear={() => {
                  setAvatarSourceImage(null);
                  setAvatarCrop(DEFAULT_IMAGE_CROP_VALUE);
                  setAvatarWasChanged(true);
                }}
                onSourceImageChange={(nextImage) => {
                  setAvatarSourceImage(nextImage);
                  setAvatarWasChanged(true);
                }}
                onValueChange={(nextCrop) => {
                  setAvatarCrop(nextCrop);
                  setAvatarWasChanged(true);
                }}
              />

              <TextInputField
                error={fieldErrors.displayName}
                label="Имя"
                maxLength={PROFILE_NAME_MAX_LENGTH}
                onChange={setName}
                placeholder="Имя"
                value={name}
              />

              <TextareaField
                error={fieldErrors.profileDescription}
                helper={(
                  <span className="text-[14px] text-[var(--label-tertiary)]">
                    {description.length}/{PROFILE_DESCRIPTION_MAX_LENGTH}
                  </span>
                )}
                label="О себе"
                maxLength={PROFILE_DESCRIPTION_MAX_LENGTH}
                minHeightClassName="min-h-[132px]"
                onChange={setDescription}
                placeholder="Расскажите немного о себе. Можно добавить ссылки на соцсети."
                rows={4}
                value={description}
              />

              {formError ? (
                <p className="text-[14px] leading-5 text-[var(--danger)]">{formError}</p>
              ) : null}
            </div>

            <footer className="flex justify-end px-5 pb-5 pt-1 min-[480px]:px-6">
              <Button
                type="button"
                variant="primary"
                disabled={isSaving}
                isLoading={isSaving}
                onClick={handleSave}
              >
                Сохранить
              </Button>
            </footer>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
