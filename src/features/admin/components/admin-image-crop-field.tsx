/* eslint-disable @next/next/no-img-element */

"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";

export type AdminImageCropSettings = {
  centerX: number;
  centerY: number;
  zoom: number;
};

type AdminImageCropFieldProps = {
  aspectRatio: `${number}:${number}`;
  helperText: string;
  label: string;
  onClear: () => void;
  onSelectFile: (nextImage: string) => void;
  onSettingsChange: (nextSettings: AdminImageCropSettings) => void;
  settings: AdminImageCropSettings;
  sourceImage: string | null;
  uploadLabel?: string;
};

export const DEFAULT_ADMIN_IMAGE_CROP_SETTINGS: AdminImageCropSettings = {
  centerX: 50,
  centerY: 50,
  zoom: 1,
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;

      if (!value) {
        reject(new Error("Не удалось прочитать изображение."));
        return;
      }

      resolve(value);
    };

    reader.onerror = () => {
      reject(new Error("Не удалось прочитать изображение."));
    };

    reader.readAsDataURL(file);
  });
}

export async function buildCroppedImageDataUrl({
  outputHeight,
  outputWidth,
  settings,
  sourceImage,
}: {
  outputHeight: number;
  outputWidth: number;
  settings: AdminImageCropSettings;
  sourceImage: string | null;
}) {
  if (!sourceImage) {
    return null;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Не удалось обработать изображение."));
    nextImage.src = sourceImage;
  });

  const targetAspect = outputWidth / outputHeight;
  const sourceAspect = image.width / image.height;
  const zoom = Math.max(1, settings.zoom);

  let cropWidth = image.width;
  let cropHeight = image.height;

  if (sourceAspect > targetAspect) {
    cropWidth = image.height * targetAspect;
  } else {
    cropHeight = image.width / targetAspect;
  }

  cropWidth /= zoom;
  cropHeight /= zoom;

  const maxOffsetX = Math.max(0, image.width - cropWidth);
  const maxOffsetY = Math.max(0, image.height - cropHeight);
  const cropX = maxOffsetX * (settings.centerX / 100);
  const cropY = maxOffsetY * (settings.centerY / 100);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Не удалось подготовить изображение.");
  }

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL("image/jpeg", 0.86);
}

export function AdminImageCropField({
  aspectRatio,
  helperText,
  label,
  onClear,
  onSelectFile,
  onSettingsChange,
  settings,
  sourceImage,
  uploadLabel = "Загрузить изображение",
}: AdminImageCropFieldProps) {
  const inputId = useId();
  const [aspectWidth, aspectHeight] = aspectRatio.split(":").map(Number);

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    const nextImage = await readFileAsDataUrl(file);
    onSelectFile(nextImage);
  }

  return (
    <div className="border-separator rounded-[24px] border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--label-primary)]">{label}</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">{helperText}</p>
        </div>

        {sourceImage ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="!rounded-full !px-4"
            onClick={onClear}
          >
            Удалить
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        <label
          htmlFor={inputId}
          className="interactive-control inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-semibold"
        >
          {uploadLabel}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            void handleFileChange(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div
          className="surface-secondary border-separator overflow-hidden rounded-[20px] border"
          style={{ aspectRatio: `${aspectWidth} / ${aspectHeight}` }}
        >
          {sourceImage ? (
            <img
              src={sourceImage}
              alt={label}
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${settings.centerX}% ${settings.centerY}%`,
                transform: `scale(${settings.zoom})`,
                transformOrigin: "center center",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-[13px] text-[var(--label-tertiary)]">
              Изображение пока не выбрано
            </div>
          )}
        </div>

        {sourceImage ? (
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--label-primary)]">
                Масштаб: {settings.zoom.toFixed(1)}x
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={settings.zoom}
                onChange={(event) => {
                  onSettingsChange({
                    ...settings,
                    zoom: Number(event.target.value),
                  });
                }}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--label-primary)]">
                Горизонталь: {Math.round(settings.centerX)}%
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.centerX}
                onChange={(event) => {
                  onSettingsChange({
                    ...settings,
                    centerX: Number(event.target.value),
                  });
                }}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--label-primary)]">
                Вертикаль: {Math.round(settings.centerY)}%
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.centerY}
                onChange={(event) => {
                  onSettingsChange({
                    ...settings,
                    centerY: Number(event.target.value),
                  });
                }}
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
