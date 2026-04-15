"use client";

import { switchVariants } from "@heroui/react";

export function ToggleSwitch({
  checked,
}: {
  checked: boolean;
}) {
  const slots = switchVariants({
    size: "md",
  });

  return (
    <span
      aria-hidden="true"
      data-selected={checked ? "true" : undefined}
      className={slots.base()}
    >
      <span className={slots.control()}>
        <span className={slots.thumb()} />
      </span>
    </span>
  );
}
