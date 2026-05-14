"use client";

import type {
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@heroui/react";

type FileUploadDropzoneProps = {
  activeTitle: string;
  buttonLabel: string;
  helperText: ReactNode;
  idleTitle: string;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  isDragActive: boolean;
  onButtonClick: () => void;
  rootProps: HTMLAttributes<HTMLDivElement>;
};

export function FileUploadDropzone({
  activeTitle,
  buttonLabel,
  helperText,
  idleTitle,
  inputProps,
  isDragActive,
  onButtonClick,
  rootProps,
}: FileUploadDropzoneProps) {
  return (
    <div
      {...rootProps}
      className={cn(
        "flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed px-5 py-6 text-center transition-colors",
        isDragActive
          ? "surface-elevated border-[var(--field-focus-border)]"
          : "border-[var(--color-field-border)] bg-background-primary hover:border-[var(--color-field-border-hover)]",
        rootProps.className,
      )}
    >
      <input {...inputProps} />
      <p className="text-sm font-semibold text-[var(--label-primary)]">
        {isDragActive ? activeTitle : idleTitle}
      </p>
      <p className="mt-2 max-w-[320px] text-[14px] leading-5 text-[var(--label-tertiary)]">
        {helperText}
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        onClick={(event) => {
          event.stopPropagation();
          onButtonClick();
        }}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
