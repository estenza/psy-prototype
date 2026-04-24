"use client";

import { Dropdown } from "@heroui/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

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
            onSelect: () => {
              setDeleteErrorMessage(null);
              setIsDeleteDialogOpen(true);
            },
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
    <>
      <Dropdown.Root>
        <MoreMenuButton
          ariaLabel="Открыть меню действий"
          className={
            actionRow
              ? "interactive-tertiary button--blur-no-focus button--icon-only !inline-flex h-9 w-9 min-w-9 !rounded-[10px] !bg-transparent px-0 text-[var(--label-secondary)] hover:!bg-transparent hover:!text-[var(--accent-primary)] data-[hovered=true]:!bg-transparent data-[hovered=true]:!text-[var(--accent-primary)] active:!bg-transparent active:!text-[var(--accent-primary)] data-[pressed=true]:!bg-transparent data-[pressed=true]:!text-[var(--accent-primary)]"
              : "button--blur-no-focus button--icon-only !inline-flex h-9 w-9 min-w-9 !rounded-[10px] !bg-transparent px-0 text-[var(--label-secondary)] hover:!bg-transparent hover:!text-[var(--accent-primary)] data-[hovered=true]:!bg-transparent data-[hovered=true]:!text-[var(--accent-primary)] active:!bg-transparent active:!text-[var(--accent-primary)] data-[pressed=true]:!bg-transparent data-[pressed=true]:!text-[var(--accent-primary)]"
          }
        />

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
