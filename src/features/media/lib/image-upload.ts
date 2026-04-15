import type { Area } from "react-easy-crop";
import type { FileRejection } from "react-dropzone";

export const IMAGE_UPLOAD_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
} as const;

export const IMAGE_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_SIZE_LABEL = "10 МБ";

export type ImageCropValue = {
  croppedAreaPixels: Area | null;
  zoom: number;
};

export const DEFAULT_IMAGE_CROP_VALUE: ImageCropValue = {
  croppedAreaPixels: null,
  zoom: 1,
};

export async function readImageFileAsDataUrl(file: File) {
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

export function getImageUploadErrorMessage(rejections: FileRejection[]) {
  const firstRejection = rejections[0];
  const firstError = firstRejection?.errors[0];

  if (!firstError) {
    return "Не удалось загрузить изображение.";
  }

  switch (firstError.code) {
    case "file-invalid-type":
      return "Поддерживаются только JPG, JPEG и PNG.";
    case "file-too-large":
      return `Размер файла не должен превышать ${IMAGE_UPLOAD_MAX_SIZE_LABEL}.`;
    case "too-many-files":
      return "Можно выбрать только одно изображение.";
    default:
      return "Не удалось загрузить изображение.";
  }
}

async function loadImage(sourceImage: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось обработать изображение."));
    image.src = sourceImage;
  });
}

function getCenteredCropArea(image: HTMLImageElement, targetAspect: number) {
  const sourceAspect = image.width / image.height;

  if (sourceAspect > targetAspect) {
    const width = image.height * targetAspect;

    return {
      height: image.height,
      width,
      x: Math.round((image.width - width) / 2),
      y: 0,
    };
  }

  const height = image.width / targetAspect;

  return {
    height,
    width: image.width,
    x: 0,
    y: Math.round((image.height - height) / 2),
  };
}

export async function buildCroppedImageDataUrl({
  crop,
  outputHeight,
  outputWidth,
  sourceImage,
}: {
  crop: ImageCropValue;
  outputHeight: number;
  outputWidth: number;
  sourceImage: string | null;
}) {
  if (!sourceImage) {
    return null;
  }

  const image = await loadImage(sourceImage);
  const cropArea = crop.croppedAreaPixels
    ?? getCenteredCropArea(image, outputWidth / outputHeight);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Не удалось подготовить изображение.");
  }

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL("image/jpeg", 0.86);
}
