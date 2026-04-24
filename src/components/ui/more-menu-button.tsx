"use client";

import { Button } from "@heroui/react";
import { MoreHorizontalIcon } from "@/components/ui/icons";

type MoreMenuButtonProps = {
  ariaLabel?: string;
  className?: string;
};

export function MoreMenuButton({
  ariaLabel = "Еще",
  className = "",
}: MoreMenuButtonProps) {
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      aria-label={ariaLabel}
      className={className}
    >
      <MoreHorizontalIcon aria-hidden />
    </Button>
  );
}
