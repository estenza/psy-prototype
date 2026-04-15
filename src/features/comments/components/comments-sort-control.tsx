"use client";

import { Dropdown, Label } from "@heroui/react";
import { ChevronDownSmallIcon, SortCommentsIcon } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
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
  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        className={buttonClassName({
          className: "h-8 gap-2 rounded-full px-2 text-[13.6px] leading-5 text-[var(--label-primary)]",
          size: "sm",
          variant: "tertiary",
        })}
      >
        <SortCommentsIcon />
        <span>Упорядочить</span>
        <ChevronDownSmallIcon />
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className="min-w-[182px]">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={new Set([value])}
          onAction={(key) => onChange(String(key) as CommentsSortValue)}
        >
          {COMMENTS_SORT_OPTIONS.map((option) => (
            <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
              <Label>{option.label}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
