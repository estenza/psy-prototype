"use client";

import { Modal, Slider } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_IMAGE_CROP_VALUE,
  type ImageCropValue,
} from "@/features/media/lib/image-upload";

type ImageCropModalProps = {
  aspectRatio: `${number}:${number}`;
  helperText: string;
  imageSrc: string;
  isOpen: boolean;
  label: string;
  onApply: (nextValue: ImageCropValue) => void;
  onClose: () => void;
  value: ImageCropValue;
};

function parseAspectRatio(aspectRatio: `${number}:${number}`) {
  const [width, height] = aspectRatio.split(":").map(Number);

  return width / height;
}

export function ImageCropModal({
  aspectRatio,
  imageSrc,
  isOpen,
  onApply,
  onClose,
  value,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(() =>
    value.croppedAreaPixels,
  );
  const [zoom, setZoom] = useState(() => value.zoom || DEFAULT_IMAGE_CROP_VALUE.zoom);

  const numericAspectRatio = useMemo(
    () => parseAspectRatio(aspectRatio),
    [aspectRatio],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <Modal.Backdrop
      variant="opaque"
      className="fixed inset-0 z-[260]"
      isDismissable
      onClick={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('[data-slot="modal-dialog"]')) return;
        onClose();
      }}
    >
      <Modal.Container className="flex min-h-dvh items-center justify-center p-4">
      <Modal.Dialog
        aria-label="Редактировать изображение"
        className="modal-surface relative w-fit max-w-[calc(100vw-32px)] p-5"
      >
        <button
          type="button"
          className="interactive-tertiary absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--label-primary)] text-lg"
          aria-label="Закрыть"
          onClick={onClose}
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
              d="M16 4L4 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 4L16 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.4697 3.46967C15.7626 3.17678 16.2374 3.17678 16.5302 3.46967C16.8231 3.76257 16.8231 4.23734 16.5302 4.53022L11.0605 9.99996L16.5302 15.4697C16.8231 15.7626 16.8231 16.2374 16.5302 16.5302C16.2374 16.8231 15.7626 16.8231 15.4697 16.5302L9.99996 11.0605L4.53022 16.5302C4.23734 16.8231 3.76257 16.8231 3.46967 16.5302C3.17678 16.2374 3.17678 15.7626 3.46967 15.4697L8.93941 9.99996L3.46967 4.53022C3.17678 4.23733 3.17678 3.76256 3.46967 3.46967C3.76256 3.17678 4.23733 3.17678 4.53022 3.46967L9.99996 8.93941L15.4697 3.46967Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <div className="mt-10 grid w-[400px] max-w-full gap-5">
          <div className="border-separator relative min-h-[360px] overflow-hidden rounded-[16px] border bg-[var(--background-primary)]">
            <Cropper
              key={`${imageSrc}-${aspectRatio}`}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={numericAspectRatio}
              minZoom={1}
              maxZoom={3}
              showGrid
              initialCroppedAreaPixels={value.croppedAreaPixels ?? undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, nextCroppedAreaPixels) => {
                setCroppedAreaPixels(nextCroppedAreaPixels);
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Slider
              aria-label="Масштаб изображения"
              minValue={1}
              maxValue={3}
              step={0.05}
              value={zoom}
              onChange={(nextValue) => {
                setZoom(Array.isArray(nextValue) ? nextValue[0] : nextValue);
              }}
              className="w-[200px] shrink-0"
            >
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            <Button
              type="button"
              variant="primary"
              className="!rounded-full !px-5"
              onClick={() => {
                onApply({
                  croppedAreaPixels,
                  zoom,
                });
              }}
            >
              Готово
            </Button>
          </div>
        </div>
      </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
