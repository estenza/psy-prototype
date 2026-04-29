"use client";

import { Input } from "@heroui/react";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

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
          className={`w-full rounded-[22px] px-5 py-4 ${className}`.trim()}
          {...props}
        />
      </div>
    );
  },
);
