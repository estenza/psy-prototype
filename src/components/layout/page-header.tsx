"use client";

import type { ElementType, ReactNode } from "react";
import { BackNavigationButton } from "@/features/topic-creation/components/back-navigation-button";

type PageHeaderProps = {
  action?: ReactNode;
  backButtonClassName?: string;
  backLabel?: string;
  className?: string;
  onBack?: () => void;
  title?: ReactNode;
  titleAs?: ElementType;
  titleClassName?: string;
};

const defaultTitleClassName =
  "type-h4 min-w-0 font-semibold text-label-primary";

export function PageHeader({
  action,
  backButtonClassName,
  backLabel,
  className = "",
  onBack,
  title,
  titleAs: TitleTag = "h4",
  titleClassName = defaultTitleClassName,
}: PageHeaderProps) {
  return (
    <div
      className={`surface-primary border-separator relative z-30 px-0 pb-3 pt-4 min-[480px]:px-4 min-[480px]:pb-6 min-[480px]:pt-8 ${className}`.trim()}
    >
      <div className="relative z-40 flex items-center justify-between gap-4 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <BackNavigationButton
              className={backButtonClassName}
              label={backLabel}
              onClick={onBack}
            />
          ) : null}

          {title ? (
            <TitleTag className={titleClassName}>{title}</TitleTag>
          ) : null}
        </div>

        {action ? action : null}
      </div>
    </div>
  );
}
