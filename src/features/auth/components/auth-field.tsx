"use client";

import { useState } from "react";

type AuthFieldProps = {
  autoCapitalize?: string;
  autoComplete?: string;
  error?: string;
  label: string;
  maxLength?: number;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "password" | "text";
  value: string;
};

export function AuthField({
  autoCapitalize = "none",
  autoComplete,
  error,
  label,
  maxLength,
  name,
  onChange,
  type = "text",
  value,
}: AuthFieldProps) {
  const id = `auth-field-${name}`;
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || value.trim().length > 0;

  return (
    <label
      htmlFor={id}
      className="flex w-full flex-col gap-2"
    >
      <div className="relative w-full">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-label={label}
          className={`bg-background-primary text-label-primary w-full rounded-2xl border px-4 pb-3 pt-6 text-[16px] leading-5 outline-none transition-colors ${
            error
              ? "border-[var(--accent-critical)] focus:border-[var(--accent-critical)]"
              : "border-separator focus:border-[var(--label-primary)]"
          }`}
        />
        <span
          className={`pointer-events-none absolute left-4 right-4 top-1/2 origin-left text-[16px] leading-5 transform-gpu will-change-transform transition-[transform,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
            isFloating
              ? "text-label-tertiary -translate-y-[22px] scale-[0.75]"
              : "text-label-secondary -translate-y-1/2 scale-100"
          }`}
        >
          {label}
        </span>
      </div>
      {error ? (
        <span className="text-[12px] leading-4 text-[var(--accent-critical)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}
