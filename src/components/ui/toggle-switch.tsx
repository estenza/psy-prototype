"use client";

import { switchVariants } from "@heroui/react";

export function ToggleSwitch({
  "aria-label": ariaLabel,
  checked,
  disabled = false,
  onClick,
}: {
  "aria-label": string;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const slots = switchVariants({
    size: "md",
  });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-selected={checked ? "true" : undefined}
      disabled={disabled}
      className={`${slots.base()} cursor-pointer disabled:cursor-wait disabled:opacity-70`}
      onClick={onClick}
    >
      <span aria-hidden="true" className={slots.control()}>
        <span className={slots.thumb()} />
      </span>
    </button>
  );
}
