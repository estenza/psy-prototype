/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { Button } from "@/components/ui/button";
import { ImageCropModal } from "@/features/media/components/image-crop-modal";
import {
  buildCroppedImageDataUrl,
  DEFAULT_IMAGE_CROP_VALUE,
  getImageUploadErrorMessage,
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MAX_SIZE_BYTES,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
  readImageFileAsDataUrl,
  type ImageCropValue,
} from "@/features/media/lib/image-upload";

type ImageUploadCropFieldProps = {
  aspectRatio: `${number}:${number}`;
  helperText: string;
  label: string;
  onClear: () => void;
  onSourceImageChange: (nextImage: string | null) => void;
  onValueChange: (nextValue: ImageCropValue) => void;
  outputHeight: number;
  outputWidth: number;
  previewVariant?: "avatar" | "default";
  sourceImage: string | null;
  uploadLabel?: string;
  value: ImageCropValue;
};

function parseAspectRatio(aspectRatio: `${number}:${number}`) {
  const [width, height] = aspectRatio.split(":").map(Number);

  return width / height;
}

export function ImageUploadCropField({
  aspectRatio,
  helperText,
  label,
  onClear,
  onSourceImageChange,
  onValueChange,
  outputHeight,
  outputWidth,
  previewVariant = "default",
  sourceImage,
  uploadLabel = "Загрузить изображение",
  value,
}: ImageUploadCropFieldProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const numericAspectRatio = useMemo(
    () => parseAspectRatio(aspectRatio),
    [aspectRatio],
  );

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    accept: IMAGE_UPLOAD_ACCEPT,
    maxFiles: 1,
    maxSize: IMAGE_UPLOAD_MAX_SIZE_BYTES,
    multiple: false,
    noClick: Boolean(sourceImage),
    onDropAccepted: async (acceptedFiles) => {
      const file = acceptedFiles[0];

      if (!file) {
        return;
      }

      try {
        const nextImage = await readImageFileAsDataUrl(file);
        onSourceImageChange(nextImage);
        onValueChange(DEFAULT_IMAGE_CROP_VALUE);
        setErrorMessage("");
        setIsCropOpen(true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить изображение.",
        );
      }
    },
    onDropRejected: (rejections) => {
      setErrorMessage(getImageUploadErrorMessage(rejections));
    },
  });

  useEffect(() => {
    let isCancelled = false;

    async function updatePreview() {
      if (!sourceImage) {
        setPreviewUrl(null);
        return;
      }

      try {
        const nextPreview = await buildCroppedImageDataUrl({
          crop: value,
          outputHeight,
          outputWidth,
          sourceImage,
        });

        if (!isCancelled) {
          setPreviewUrl(nextPreview);
        }
      } catch {
        if (!isCancelled) {
          setPreviewUrl(sourceImage);
        }
      }
    }

    void updatePreview();

    return () => {
      isCancelled = true;
    };
  }, [outputHeight, outputWidth, sourceImage, value]);

  return (
    <>
      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--label-primary)]">{label}</p>
            {helperText ? (
              <p className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
                {helperText}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-4 grid gap-4 ${
            previewUrl
              ? previewVariant === "avatar"
                ? "items-start lg:grid-cols-[120px_minmax(0,1fr)]"
                : "lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]"
              : ""
          }`.trim()}
        >
          {previewUrl ? (
            previewVariant === "avatar" ? (
              <div
                className="relative h-[120px] w-[120px]"
                style={{ aspectRatio: `${numericAspectRatio}` }}
              >
                <div className="h-full w-full overflow-hidden rounded-full">
                  <img
                    src={previewUrl}
                    alt={label}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 rounded-full bg-[rgba(0,0,0,0.4)]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <input {...getInputProps()} />
                  <HoverTooltip label="Заменить фотографию">
                    <button
                      type="button"
                      className="interactive-fill-inverse relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--label-inverse)]"
                      aria-label="Заменить фотографию"
                      onClick={() => open()}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path
                          d="M11.4995 2C11.9137 2 12.2495 2.33579 12.2495 2.75C12.2495 3.16421 11.9137 3.5 11.4995 3.5H8.49951C8.13615 3.50008 7.95207 3.58697 7.83936 3.66895C7.70686 3.76534 7.59887 3.90725 7.44873 4.14746C7.32367 4.34757 7.12063 4.70849 6.83936 4.97852C6.50873 5.29584 6.07395 5.5 5.49951 5.5H4.74854C3.50594 5.50005 2.49854 6.50739 2.49854 7.75V13.75C2.49854 14.9926 3.50594 16 4.74854 16H15.2495C16.4922 16 17.4995 14.9926 17.4995 13.75V10C17.4995 9.58595 17.8355 9.25026 18.2495 9.25C18.6637 9.25 18.9995 9.58579 18.9995 10V13.75C18.9995 15.8211 17.3206 17.5 15.2495 17.5H4.74854C2.67751 17.5 0.998535 15.821 0.998535 13.75V7.75C0.998535 5.67896 2.67751 4.00005 4.74854 4H5.49951C5.67492 4 5.7413 3.95404 5.80127 3.89648C5.91047 3.79156 5.98902 3.65215 6.17627 3.35254C6.33853 3.09292 6.5745 2.73463 6.95752 2.45605C7.36025 2.16321 7.86351 2.00008 8.49951 2H11.4995ZM10.0005 6.5C12.0713 6.50026 13.7505 8.17909 13.7505 10.25C13.7505 12.3209 12.0713 13.9997 10.0005 14C7.92942 14 6.25049 12.3211 6.25049 10.25C6.25049 8.17893 7.92942 6.5 10.0005 6.5ZM10.0005 8C8.75785 8 7.75049 9.00736 7.75049 10.25C7.75049 11.4926 8.75785 12.5 10.0005 12.5C11.2429 12.4997 12.2505 11.4925 12.2505 10.25C12.2505 9.00752 11.2429 8.00026 10.0005 8ZM16.5005 1.75C16.9145 1.75026 17.2505 2.08595 17.2505 2.5V4.25H19.0005C19.4145 4.25026 19.7505 4.58595 19.7505 5C19.7505 5.41405 19.4145 5.74974 19.0005 5.75H17.2505V7.5C17.2505 7.91405 16.9145 8.24974 16.5005 8.25C16.0863 8.25 15.7505 7.91421 15.7505 7.5V5.75H14.0005C13.5863 5.75 13.2505 5.41421 13.2505 5C13.2505 4.58579 13.5863 4.25 14.0005 4.25H15.7505V2.5C15.7505 2.08579 16.0863 1.75 16.5005 1.75Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </HoverTooltip>
                </div>
              </div>
            ) : (
              <div
                className="surface-secondary border-separator overflow-hidden rounded-[16px] border"
                style={{ aspectRatio: `${numericAspectRatio}` }}
              >
                <img
                  src={previewUrl}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              </div>
            )
          ) : null}

          <div className="grid gap-4">
            {sourceImage ? (
              <div className="flex flex-wrap gap-2">
                {previewVariant === "default" ? (
                  <>
                    <input {...getInputProps()} />
                    <Button
                      type="button"
                      variant="tertiary"
                      className="!rounded-full !px-4"
                      onClick={() => open()}
                    >
                      Заменить
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="tertiary"
                  className="!rounded-full !px-4"
                  onClick={() => setIsCropOpen(true)}
                >
                  Изменить
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  className="!rounded-full !px-4"
                  onClick={() => {
                    setErrorMessage("");
                    onClear();
                  }}
                >
                  Удалить
                </Button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-separator flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed px-5 py-6 text-center transition-colors ${
                  isDragActive ? "surface-elevated" : "bg-background-primary"
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-sm font-semibold text-[var(--label-primary)]">
                  {isDragActive
                    ? "Отпустите файл, чтобы загрузить"
                    : "Перетащите изображение сюда"}
                </p>
                <p className="mt-2 max-w-[320px] text-[13px] leading-5 text-[var(--label-secondary)]">
                  Или выберите файл вручную. Поддерживаются JPG, JPEG и PNG до{" "}
                  {IMAGE_UPLOAD_MAX_SIZE_LABEL}.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 !rounded-full !px-4"
                  onClick={(event) => {
                    event.stopPropagation();
                    open();
                  }}
                >
                  {uploadLabel}
                </Button>
              </div>
            )}

            {errorMessage ? (
              <p className="text-sm text-[var(--accent-critical)]">{errorMessage}</p>
            ) : null}
          </div>
        </div>
      </section>

      {sourceImage ? (
        <ImageCropModal
          aspectRatio={aspectRatio}
          helperText={helperText}
          imageSrc={sourceImage}
          isOpen={isCropOpen}
          label={label}
          value={value}
          onApply={(nextValue) => {
            onValueChange(nextValue);
            setIsCropOpen(false);
          }}
          onClose={() => setIsCropOpen(false)}
        />
      ) : null}
    </>
  );
}
