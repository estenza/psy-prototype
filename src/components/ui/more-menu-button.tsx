"use client";

import { Button } from "@/components/ui/button";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { MoreHorizontalIcon } from "@/components/ui/icons";

type MoreMenuButtonProps = {
  ariaLabel?: string;
  "aria-expanded"?: boolean;
  className?: string;
  isTooltipDisabled?: boolean;
  onPress?: () => void;
  tooltipLabel?: string;
};

export function MoreMenuButton({
  ariaLabel = "Еще",
  "aria-expanded": ariaExpanded,
  className = "",
  isTooltipDisabled = false,
  onPress,
  tooltipLabel = "Еще",
}: MoreMenuButtonProps) {
  const defaultClassName =
    "button--blur-no-focus more-menu-button relative text-[var(--label-secondary)]";

  return (
    <HoverTooltip
      label={tooltipLabel}
      triggerClassName="inline-flex"
      isDisabled={isTooltipDisabled}
    >
      <Button
        isIconOnly
        variant="quaternary"
        size="sm"
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        className={`${defaultClassName} ${className}`.trim()}
        onPress={onPress}
      >
        <MoreHorizontalIcon aria-hidden />
      </Button>
    </HoverTooltip>
  );
}
