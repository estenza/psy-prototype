"use client";

import { Dropdown } from "@heroui/react";
import type { ComponentProps } from "react";

type DropdownPopoverProps = Omit<
  ComponentProps<typeof Dropdown.Popover>,
  "className"
> & {
  className?: string;
};

export function DropdownPopover({
  className = "",
  containerPadding = 12,
  offset = 8,
  placement = "bottom",
  shouldFlip = false,
  ...props
}: DropdownPopoverProps) {
  return (
    <Dropdown.Popover
      {...props}
      className={`dropdown-popover ${className}`.trim()}
      containerPadding={containerPadding}
      offset={offset}
      placement={placement}
      shouldFlip={shouldFlip}
    />
  );
}
