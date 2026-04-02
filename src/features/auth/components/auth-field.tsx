"use client";

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
  placeholder,
  type = "text",
  value,
}: AuthFieldProps) {
  const id = `auth-field-${name}`;

  return (
    <label
      htmlFor={id}
      className="flex flex-col gap-2"
    >
      <span className="text-[14px] font-medium text-[var(--label-primary)]">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        className="border-separator bg-background-primary text-label-primary focus-visible:ring-accent-primary rounded-2xl border px-4 py-3 text-sm outline-none transition-shadow focus-visible:ring-2"
      />
      {error ? (
        <span className="text-[12px] leading-4 text-[var(--accent-critical)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}
