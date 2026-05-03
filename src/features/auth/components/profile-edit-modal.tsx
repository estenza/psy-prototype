"use client";

import { ErrorMessage, Input, Label, Modal, TextArea, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
};

type ProfileUpdateResponse = (CurrentUserResponse & { error?: string }) | AuthErrorResponse;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
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
}: ProfileEditModalProps) {
  const router = useRouter();
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
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

  useEffect(() => {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [description, isOpen]);

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
          profileCoverUrl: nextCoverUrl,
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
      <Modal.Container scroll="outside" className="!p-3 min-[481px]:!p-4">
        <Modal.Dialog
          aria-label="Изменить профиль"
          className="modal-surface w-full max-w-[720px] overflow-hidden p-0"
        >
          <Modal.Body className="p-0">
            <header className="relative px-5 pb-2 pt-5 min-[481px]:px-6">
              <h2 className="min-w-0 pr-12 text-[24px] font-semibold leading-8 text-[var(--label-primary)]">
                Изменить профиль
              </h2>
              <button
                type="button"
                aria-label="Закрыть"
                disabled={isSaving}
                className="interactive-tertiary absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--label-primary)]"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="grid gap-6 px-5 py-5 min-[481px]:px-6">
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

              <TextField
                isInvalid={Boolean(fieldErrors.displayName)}
                className="grid gap-2"
              >
                <Label className="text-[14px] font-medium text-[var(--label-primary)]">
                  Имя
                </Label>
                <Input
                  value={name}
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  placeholder="Имя"
                  className="type-input w-full rounded-2xl px-4 py-3"
                  onChange={(event) => setName(event.target.value)}
                />
                {fieldErrors.displayName ? (
                  <ErrorMessage className="text-[14px] leading-5 text-[var(--danger)]">
                    {fieldErrors.displayName}
                  </ErrorMessage>
                ) : null}
              </TextField>

              <TextField
                isInvalid={Boolean(fieldErrors.profileDescription)}
                className="grid gap-2"
              >
                <span className="flex items-center justify-between gap-3">
                  <Label className="text-[14px] font-medium text-[var(--label-primary)]">
                    О себе
                  </Label>
                  <span className="text-[13px] text-[var(--label-tertiary)]">
                    {description.length}/{PROFILE_DESCRIPTION_MAX_LENGTH}
                  </span>
                </span>
                <TextArea
                  ref={descriptionRef}
                  rows={4}
                  maxLength={PROFILE_DESCRIPTION_MAX_LENGTH}
                  value={description}
                  placeholder="Расскажите немного о себе. Можно добавить ссылки на соцсети."
                  className="min-h-[132px] w-full resize-none overflow-hidden rounded-2xl px-4 py-3 text-[16px] leading-6"
                  onChange={(event) => {
                    setDescription(event.target.value);
                    event.currentTarget.style.height = "0px";
                    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                  }}
                />
                {fieldErrors.profileDescription ? (
                  <ErrorMessage className="text-[14px] leading-5 text-[var(--danger)]">
                    {fieldErrors.profileDescription}
                  </ErrorMessage>
                ) : null}
              </TextField>

              {formError ? (
                <p className="text-[14px] leading-5 text-[var(--danger)]">{formError}</p>
              ) : null}
            </div>

            <footer className="flex justify-end px-5 pb-5 pt-1 min-[481px]:px-6">
              <Button
                type="button"
                variant="primary"
                disabled={isSaving}
                className="!h-10 !px-5 text-[15px] font-medium"
                onClick={handleSave}
              >
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </Button>
            </footer>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
