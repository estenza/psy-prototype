"use client";

import { Button, Dropdown } from "@heroui/react";
import { MoreHorizontalIcon } from "@/components/ui/icons";

type CommentMoreMenuProps = {
  canReport: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isViewerAuthenticated: boolean;
  viewerOwnsComment: boolean;
  actionRow?: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onBlock: () => void;
  onReport: () => void;
};

export function CommentMoreMenu({
  canReport,
  canEdit,
  canDelete,
  isViewerAuthenticated,
  viewerOwnsComment,
  actionRow = false,
  onDelete,
  onEdit,
  onBlock,
  onReport,
}: CommentMoreMenuProps) {
  const items =
    isViewerAuthenticated && viewerOwnsComment
      ? [
          {
            label: "Редактировать",
            disabled: !canEdit,
            onSelect: onEdit,
          },
          {
            label: "Удалить",
            disabled: !canDelete,
            onSelect: onDelete,
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
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label="Открыть меню действий"
        className={
          actionRow
            ? "interactive-tertiary button--blur-no-focus button--icon-only !inline-flex h-9 w-9 min-w-9 rounded-full px-0 text-[var(--label-primary)]"
            : "button--blur-no-focus !inline-flex text-[var(--label-primary)]"
        }
      >
        <MoreHorizontalIcon aria-hidden />
      </Button>

      <Dropdown.Popover placement="bottom end" className="min-w-[188px]">
        <Dropdown.Menu
          aria-label="Меню комментария"
          selectionMode="none"
          className="dropdown-menu-default"
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
