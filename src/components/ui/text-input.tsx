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
      <label
        className={`field-shell flex items-center rounded-[22px] px-5 py-4 ${shellClassName}`.trim()}
        data-invalid={invalid ? "true" : undefined}
      >
        <input
          ref={ref}
          className={`text-label-primary w-full min-w-0 bg-transparent outline-none placeholder:text-[var(--label-tertiary)] ${className}`.trim()}
          {...props}
        />
      </label>
    );
  },
);
