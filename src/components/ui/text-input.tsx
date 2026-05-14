"use client";

import { Input } from "@heroui/react";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { fieldControlInputClassName } from "@/components/ui/field-control";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  shellClassName?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    { className = "", invalid = false, shellClassName = "", ...props },
    ref,
  ) {
    return (
      <div className={`${shellClassName}`.trim()}>
        <Input
          ref={ref}
          data-invalid={invalid ? "true" : undefined}
          className={`${fieldControlInputClassName} w-full ${className}`.trim()}
          {...props}
        />
      </div>
    );
  },
);
