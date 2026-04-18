"use client";

import { ErrorMessage, Input, Label, TextField } from "@heroui/react";
import type { CSSProperties } from "react";

type AuthFieldProps = {
  autoCapitalize?: string;
  autoComplete?: string;
  autoCorrect?: "off" | "on";
  disablePasswordManagerHints?: boolean;
  error?: string;
  maskedText?: boolean;
  label: string;
  maxLength?: number;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  spellCheck?: boolean;
  type?: "email" | "password" | "text";
  value: string;
};

export function AuthField({
  autoCapitalize = "none",
  autoComplete,
  autoCorrect = "off",
  disablePasswordManagerHints = false,
  error,
  maskedText = false,
  label,
  maxLength,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
  spellCheck = false,
}: AuthFieldProps) {
  const id = `auth-field-${name}`;
  const maskedTextStyle = maskedText
    ? ({ WebkitTextSecurity: "disc" } as CSSProperties)
    : undefined;

  return (
    <TextField
      isInvalid={Boolean(error)}
      className="flex w-full flex-col gap-2"
    >
      <Label
        htmlFor={id}
        className="type-body-md-medium text-[var(--label-primary)]"
      >
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        autoCapitalize={autoCapitalize}
        autoComplete={disablePasswordManagerHints ? "off" : autoComplete}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        placeholder={placeholder}
        spellCheck={spellCheck}
        aria-label={label}
        data-1p-ignore={disablePasswordManagerHints ? "true" : undefined}
        data-bwignore={disablePasswordManagerHints ? "true" : undefined}
        data-form-type={disablePasswordManagerHints ? "other" : undefined}
        data-lpignore={disablePasswordManagerHints ? "true" : undefined}
        style={maskedTextStyle}
        className="type-input w-full rounded-2xl px-4 py-3"
      />
      {error ? (
        <ErrorMessage className="type-caption-tight text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}
