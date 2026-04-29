"use client";

import { Dropdown, Label } from "@heroui/react";
import {
  CheckIndicatorIcon,
  ChevronDownSmallIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
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
    <Dropdown.Root>
      <Dropdown.Trigger
        className={buttonClassName({
          className:
            "inline-flex h-8 items-center justify-center rounded-full px-2 text-[14px] leading-5 font-normal text-[var(--label-primary)]",
          size: "sm",
          variant: "tertiary",
        })}
      >
        <span className="inline-flex items-center gap-2 leading-none">
          <span>{selectedOptionLabel}</span>
          <span className="flex h-3 w-3 flex-none items-center justify-center">
            <ChevronDownSmallIcon />
          </span>
        </span>
      </Dropdown.Trigger>

      <DropdownPopover placement="bottom end" className="min-w-[182px]">
        <Dropdown.Menu
          className="dropdown-menu-default"
          selectionMode="single"
          selectedKeys={new Set([value])}
          onAction={(key) => onChange(String(key) as CommentsSortValue)}
        >
          {COMMENTS_SORT_OPTIONS.map((option) => (
            <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
              <Label>{option.label}</Label>
              <Dropdown.ItemIndicator className="text-[var(--accent-primary)]">
                {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
              </Dropdown.ItemIndicator>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </DropdownPopover>
    </Dropdown.Root>
  );
}
