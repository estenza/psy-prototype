"use client";

import { ErrorMessage, Input, InputGroup, Label, TextField } from "@heroui/react";
import { useState, type CSSProperties } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === "password";
  const resolvedType = isPasswordField
    ? (isPasswordVisible ? "text" : "password")
    : type;
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
      {isPasswordField ? (
        <InputGroup className="w-full rounded-2xl">
          <InputGroup.Input
            id={id}
            name={name}
            type={resolvedType}
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
            className="type-input min-w-0 px-4 py-3"
          />
          <InputGroup.Suffix className="pr-3">
            <button
              type="button"
              aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((currentState) => !currentState)}
              className="interactive-tertiary inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)]"
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </InputGroup.Suffix>
        </InputGroup>
      ) : (
        <Input
          id={id}
          name={name}
          type={resolvedType}
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
      )}
      {error ? (
        <ErrorMessage className="type-caption-tight text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}
