"use client";

import { Tooltip } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

type HoverTooltipProps = {
  children: ReactNode;
  contentClassName?: string;
  delay?: number;
  isDisabled?: boolean;
  label: string;
  placement?: ComponentProps<typeof Tooltip.Content>["placement"];
  showArrow?: boolean;
  triggerClassName?: string;
};

export function HoverTooltip({
  children,
  contentClassName,
  delay = 500,
  isDisabled = false,
  label,
  placement,
  showArrow = false,
  triggerClassName,
}: HoverTooltipProps) {
  return (
    <Tooltip.Root delay={delay} closeDelay={80} isDisabled={isDisabled}>
      <Tooltip.Trigger className={triggerClassName}>{children}</Tooltip.Trigger>
      <Tooltip.Content
        className={contentClassName}
        placement={placement}
        showArrow={showArrow}
      >
        {label}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
