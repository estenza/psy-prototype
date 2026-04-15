"use client";

import { Dropdown } from "@heroui/react";
import { MoreHorizontalIcon } from "@/components/ui/icons";

type CommentMoreMenuProps = {
  canReport: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isViewerAuthenticated: boolean;
  viewerOwnsComment: boolean;
  onBlock: () => void;
  onReport: () => void;
};

export function CommentMoreMenu({
  canReport,
  canEdit,
  canDelete,
  isViewerAuthenticated,
  viewerOwnsComment,
  onBlock,
  onReport,
}: CommentMoreMenuProps) {
  const items =
    isViewerAuthenticated && viewerOwnsComment
      ? [
          {
            label: "Редактировать",
            disabled: !canEdit,
            onSelect: () => undefined,
          },
          {
            label: "Удалить",
            disabled: !canDelete,
            onSelect: () => undefined,
          },
        ]
      : [
          {
            label: "Пожаловаться",
            disabled: !canReport,
            onSelect: onReport,
          },
          {
            label: "Заблокировать",
            disabled: false,
            onSelect: onBlock,
          },
        ];

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        className="interactive-tertiary text-label-secondary inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
        aria-label="Открыть меню действий"
      >
        <MoreHorizontalIcon />
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className="min-w-[188px]">
        <Dropdown.Menu
          aria-label="Меню комментария"
          selectionMode="none"
          onAction={(key) => {
            const item = items.find((entry) => entry.label === String(key));
            item?.onSelect();
          }}
        >
          {items.map((item) => (
            <Dropdown.Item
              key={item.label}
              id={item.label}
              textValue={item.label}
              isDisabled={item.disabled}
            >
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
