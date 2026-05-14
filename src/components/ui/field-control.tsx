"use client";

import {
  ErrorMessage,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  cn,
} from "@heroui/react";
import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { CheckIndicatorIcon } from "@/components/ui/icons";

export const fieldControlLabelClassName =
  "pl-0.5 text-[14px] font-normal leading-5 text-[var(--label-tertiary)]";

export const fieldControlInputClassName =
  "h-12 min-h-12 rounded-[16px] px-4 py-[12px] text-[16px] leading-6";

export const fieldControlSelectTriggerClassName =
  "h-12 min-h-12 rounded-[16px] px-4 py-[12px] text-[16px] font-normal leading-6 shadow-none";

export const fieldControlSelectButtonClassName =
  "flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--field-background)] px-4 py-[12px] text-left text-[16px] font-normal leading-6 shadow-none";

export const fieldControlDateTriggerClassName =
  "field-control-date-trigger min-h-[48px] w-full rounded-[16px] px-4 py-[12px] text-[16px] font-normal leading-6 shadow-none";

export const fieldControlPhoneGroupClassName =
  "field-control-phone-group flex h-12 min-h-12 items-center gap-2 rounded-[16px] px-1 py-1";

export const fieldControlSelectItemClassName =
  "gap-0 !pl-4 !pr-4 py-2 font-normal transition-colors data-[selected=true]:text-[var(--accent-primary)]";

export const fieldControlSelectItemIndicatorClassName =
  "!static !top-auto !right-auto !translate-y-0 ml-3 flex h-5 w-5 flex-none items-center justify-center text-[var(--accent-primary)]";

type TextInputFieldProps = {
  autoCapitalize?: "characters" | "none" | "off" | "on" | "sentences" | "words";
  autoComplete?: string;
  autoCorrect?: "off" | "on";
  counter?: ReactNode;
  disablePasswordManagerHints?: boolean;
  disabled?: boolean;
  error?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  maxLength?: number;
  name?: string;
  onBlur?: (value: string) => void;
  onChange: (value: string) => void;
  placeholder: string;
  prefix?: ReactNode;
  spellCheck?: boolean;
  type?: "date" | "email" | "number" | "tel" | "text" | "url";
  value: string;
};

type TextareaFieldProps = {
  autoResize?: boolean;
  error?: string;
  helper?: ReactNode;
  label: string;
  maxLength?: number;
  minHeightClassName?: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder: string;
  resize?: "none" | "vertical";
  rows?: number;
  value: string;
};

type SelectFieldProps = {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
};

export function FieldControlError({ children }: { children?: ReactNode }) {
  return children ? (
    <ErrorMessage className="mt-0.5 text-[14px] leading-5 text-[var(--danger)]">
      {children}
    </ErrorMessage>
  ) : null;
}

export function FieldControlLabel({ children }: { children: ReactNode }) {
  return (
    <Label className={fieldControlLabelClassName}>
      {children}
    </Label>
  );
}

export function TextInputField({
  autoCapitalize = "sentences",
  autoComplete = "on",
  autoCorrect = "on",
  counter,
  disablePasswordManagerHints = false,
  disabled = false,
  error,
  inputMode,
  label,
  maxLength,
  name,
  onBlur,
  onChange,
  placeholder,
  prefix,
  spellCheck = true,
  type = "text",
  value,
}: TextInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextField isInvalid={Boolean(error)} className="grid gap-2 text-sm">
      <FieldControlLabel>{label}</FieldControlLabel>
      <div className="relative">
        {counter && isFocused ? (
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 pl-2 text-[12px] font-medium leading-4 text-[var(--label-tertiary)]">
            {counter}
          </span>
        ) : null}
        {prefix ? (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 w-[1ch] -translate-y-1/2 text-center text-[16px] leading-6 text-[var(--label-secondary)]">
            {prefix}
          </span>
        ) : null}
        <Input
          autoCapitalize={autoCapitalize}
          autoComplete={disablePasswordManagerHints ? "off" : autoComplete}
          autoCorrect={autoCorrect}
          data-1p-ignore={disablePasswordManagerHints ? "true" : undefined}
          data-bwignore={disablePasswordManagerHints ? "true" : undefined}
          data-form-type={disablePasswordManagerHints ? "other" : undefined}
          data-lpignore={disablePasswordManagerHints ? "true" : undefined}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
          name={name}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event.target.value);
          }}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          spellCheck={spellCheck}
          type={type}
          value={value}
          className={cn(
            fieldControlInputClassName,
            "w-full",
            prefix ? "pl-8" : "",
            counter && isFocused ? "pr-12" : "",
          )}
        />
      </div>
      <FieldControlError>{error}</FieldControlError>
    </TextField>
  );
}

export function TextareaField({
  autoResize = true,
  error,
  helper,
  label,
  maxLength,
  minHeightClassName = "min-h-[112px]",
  name,
  onChange,
  placeholder,
  resize = "none",
  rows = 3,
  value,
}: TextareaFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea || !autoResize) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [autoResize, value]);

  return (
    <TextField isInvalid={Boolean(error)} className="grid gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        <FieldControlLabel>{label}</FieldControlLabel>
        {helper}
      </span>
      <TextArea
        ref={textareaRef}
        rows={rows}
        maxLength={maxLength}
        name={name}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);

          if (!autoResize) {
            return;
          }

          event.currentTarget.style.height = "0px";
          event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
        }}
        placeholder={placeholder}
        className={cn(
          "w-full overflow-hidden rounded-[16px] px-4 py-4 text-[16px] leading-6 shadow-none",
          resize === "vertical" ? "resize-y" : "resize-none",
          minHeightClassName,
        )}
      />
      <FieldControlError>{error}</FieldControlError>
    </TextField>
  );
}

export function SelectField({
  error,
  label,
  onChange,
  options,
  placeholder,
  value,
}: SelectFieldProps) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";

  return (
    <TextField isInvalid={Boolean(error)} className="grid gap-2 text-sm">
      <FieldControlLabel>{label}</FieldControlLabel>
      <Select
        selectedKey={value || undefined}
        onSelectionChange={(nextKey) => {
          if (typeof nextKey === "string") {
            onChange(nextKey);
          }
        }}
        className="w-full"
      >
        <Select.Trigger
          data-invalid={error ? "true" : undefined}
          className={fieldControlSelectTriggerClassName}
        >
          <Select.Value className="min-w-0 text-[16px] leading-6">
            <span
              className={selectedLabel
                ? "min-w-0 truncate text-[var(--label-primary)]"
                : "min-w-0 truncate text-[var(--label-quaternary)]"}
            >
              {selectedLabel || placeholder}
            </span>
          </Select.Value>
          <Select.Indicator className="right-4 text-[var(--label-quaternary)]" />
        </Select.Trigger>
        <Select.Popover className="dropdown-popover" placement="bottom start">
          <ListBox
            aria-label={label}
            className="dropdown-menu-default max-h-[320px] overflow-y-auto text-[16px] leading-6"
          >
            <ListBox.Section>
              {options.map((option) => (
                <ListBox.Item
                  key={option.value}
                  id={option.value}
                  textValue={option.label}
                  className={fieldControlSelectItemClassName}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-normal">
                      {option.label}
                    </span>
                    <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                      {({ isSelected }) => (
                        isSelected ? <CheckIndicatorIcon /> : null
                      )}
                    </ListBox.ItemIndicator>
                  </span>
                </ListBox.Item>
              ))}
            </ListBox.Section>
          </ListBox>
        </Select.Popover>
      </Select>
      <FieldControlError>{error}</FieldControlError>
    </TextField>
  );
}
