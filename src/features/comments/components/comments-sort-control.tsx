"use client";

import {
  ChevronDownSmallIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { ResponsiveSelectionMenu } from "@/components/ui/responsive-selection-menu";
import { COMMENTS_SORT_OPTIONS } from "@/features/comments/constants";
import type { CommentsSortValue } from "@/features/comments/types";

type CommentsSortControlProps = {
  value: CommentsSortValue;
  onChange: (value: CommentsSortValue) => void;
};

export function CommentsSortControl({
  value,
  onChange,
}: CommentsSortControlProps) {
  const selectedOptionLabel =
    COMMENTS_SORT_OPTIONS.find((option) => option.value === value)?.label
    ?? COMMENTS_SORT_OPTIONS[0]?.label
    ?? "Популярные";

  return (
    <ResponsiveSelectionMenu
      ariaLabel="Сортировка комментариев"
      value={value}
      onChange={onChange}
      options={COMMENTS_SORT_OPTIONS}
      popoverPlacement="bottom end"
      popoverClassName="min-w-[182px]"
      triggerClassName={buttonClassName({
        className:
          "inline-flex items-center justify-center !px-3 text-[var(--label-secondary)]",
        size: "s",
        variant: "quaternary",
      })}
      trigger={(
        <span className="inline-flex items-center gap-2 leading-none">
          <span>{selectedOptionLabel}</span>
          <span className="flex h-3 w-3 flex-none items-center justify-center">
            <ChevronDownSmallIcon />
          </span>
        </span>
      )}
    />
  );
}
