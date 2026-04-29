"use client";

import { Button } from "@heroui/react";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { MoreHorizontalIcon } from "@/components/ui/icons";

type MoreMenuButtonProps = {
  ariaLabel?: string;
  className?: string;
  isTooltipDisabled?: boolean;
  tooltipLabel?: string;
};

export function MoreMenuButton({
  ariaLabel = "Еще",
  className = "",
  isTooltipDisabled = false,
  tooltipLabel = "Еще",
}: MoreMenuButtonProps) {
  const defaultClassName =
    "interactive-tertiary button--blur-no-focus button--icon-only more-menu-button relative !inline-flex h-9 w-9 min-w-9 rounded-full px-0 text-[var(--label-secondary)]";

  return (
    <HoverTooltip
      label={tooltipLabel}
      triggerClassName="inline-flex"
      isDisabled={isTooltipDisabled}
    >
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={ariaLabel}
        className={`${defaultClassName} ${className}`.trim()}
      >
        <MoreHorizontalIcon aria-hidden />
      </Button>
    </HoverTooltip>
  );
}
