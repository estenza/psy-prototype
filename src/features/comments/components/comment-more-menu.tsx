"use client";

import { Dropdown, Label } from "@heroui/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import {
  DeleteOutlineIcon,
  EditOutlineIcon,
  FlagIcon,
  IgnoreAuthorIcon,
} from "@/components/ui/icons";
import { MoreMenuButton } from "@/components/ui/more-menu-button";

type CommentMoreMenuProps = {
  canReport: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isViewerAuthenticated: boolean;
  viewerOwnsComment: boolean;
  actionRow?: boolean;
  onDelete: () => Promise<void> | void;
  onEdit: () => void;
  onBlock: () => void;
  onReport: () => void;
};

type CommentMenuItem = {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
};

export function CommentMoreMenu({
  canReport,
  canEdit,
  canDelete,
  isViewerAuthenticated,
  viewerOwnsComment,
  onDelete,
  onEdit,
  onBlock,
  onReport,
}: CommentMoreMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const items: CommentMenuItem[] =
    isViewerAuthenticated && viewerOwnsComment
      ? [
          {
            label: "Редактировать",
            icon: <EditOutlineIcon />,
            disabled: !canEdit,
            onSelect: onEdit,
          },
          {
            label: "Удалить",
            icon: <DeleteOutlineIcon />,
            disabled: !canDelete,
            onSelect: () => {
              setDeleteErrorMessage(null);
              setIsDeleteDialogOpen(true);
            },
          },
        ]
      : [
          {
            label: "Пожаловаться",
            icon: <FlagIcon />,
            disabled: !canReport,
            onSelect: onReport,
          },
          {
            label: "Заблокировать",
            icon: <IgnoreAuthorIcon />,
            disabled: false,
            onSelect: onBlock,
          },
        ];

  return (
    <>
      <Dropdown.Root isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <MoreMenuButton
          ariaLabel="Открыть меню действий"
          isTooltipDisabled={isMenuOpen}
        />

        <DropdownPopover placement="bottom end" className="min-w-[188px]">
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
                <div className="flex w-full items-center gap-3">
                  <span className="inline-flex h-5 w-5 flex-none items-center justify-center text-[var(--label-secondary)]">
                    {item.icon}
                  </span>
                  <Label className="min-w-0 flex-1 truncate">
                    {item.label}
                  </Label>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </DropdownPopover>
      </Dropdown.Root>

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Удалить ответ?"
          description="Восстановить уже не получится"
          actionLabel="Удалить"
          errorMessage={deleteErrorMessage}
          isLoading={isDeleteSubmitting}
          onClose={() => {
            if (!isDeleteSubmitting) {
              setIsDeleteDialogOpen(false);
              setDeleteErrorMessage(null);
            }
          }}
          onConfirm={() => {
            setIsDeleteSubmitting(true);
            setDeleteErrorMessage(null);

            Promise.resolve(onDelete())
              .then(() => {
                setIsDeleteDialogOpen(false);
              })
              .catch((error: unknown) => {
                setDeleteErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Не удалось удалить ответ.",
                );
              })
              .finally(() => {
                setIsDeleteSubmitting(false);
              });
          }}
        />
      ) : null}
    </>
  );
}
