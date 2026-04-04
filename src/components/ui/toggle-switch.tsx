"use client";

export function ToggleSwitch({
  checked,
}: {
  checked: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full p-1 transition-colors duration-200 ${
        checked
          ? "bg-[var(--accent-success)]"
          : "bg-[color-mix(in_srgb,var(--label-primary)_14%,transparent)]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.16)] transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  );
}
