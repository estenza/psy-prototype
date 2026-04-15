"use client";

import { Tooltip } from "@heroui/react";
import type { ReactNode } from "react";

type HoverTooltipProps = {
  children: ReactNode;
  delay?: number;
  label: string;
  showArrow?: boolean;
};

export function HoverTooltip({
  children,
  delay = 500,
  label,
  showArrow = false,
}: HoverTooltipProps) {
  return (
    <Tooltip.Root delay={delay} closeDelay={80}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content showArrow={showArrow}>{label}</Tooltip.Content>
    </Tooltip.Root>
  );
}
