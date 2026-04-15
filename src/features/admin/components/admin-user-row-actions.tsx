"use client";

import { Dropdown, Modal, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon } from "@/components/ui/icons";
import { AdminUserEditorModal } from "@/features/admin/components/admin-user-editor-modal";
import type { AdminListedUser } from "@/features/admin/types";

type AdminUserRowActionsProps = {
  user: AdminListedUser;
};

function ConfirmDialog({
  actionLabel,
  errorMessage,
  isLoading,
  onClose,
  onConfirm,
  title,
}: {
  actionLabel: string;
  errorMessage?: string | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <Modal.Backdrop
      isOpen
      isDismissable={!isLoading}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
      className="fixed inset-0 z-[320] bg-[rgba(15,23,42,0.56)]"
    >
      <Modal.Container scroll="outside" className="!p-4">
        <Modal.Dialog
          aria-label={title}
          className="modal-surface w-full max-w-[420px] p-5"
        >
          <Modal.Body className="p-0">
            <h3 className="font-helvetica text-[24px] font-bold leading-8 text-[var(--label-primary)]">
              {title}
            </h3>
            {errorMessage ? (
              <p className="mt-3 text-sm text-[var(--accent-critical)]">{errorMessage}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="tertiary"
                className="!min-w-[120px] !justify-center !rounded-full !px-5"
                disabled={isLoading}
                onClick={onClose}
              >
                Отменить
              </Button>
              <Button
                type="button"
                variant="primary"
                className="!min-w-[120px] !justify-center !rounded-full !px-5"
                disabled={isLoading}
                onClick={onConfirm}
              >
                {isLoading ? "Подождите..." : actionLabel}
              </Button>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function AdminUserRowActions({ user }: AdminUserRowActionsProps) {
  const router = useRouter();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const pendingActionTimeoutsRef = useRef<Map<string, number>>(new Map());
  const accountName = user.nickname
    ? `@${user.nickname}`
    : [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.displayName || user.email;

  useEffect(() => {
    const pendingActionTimeouts = pendingActionTimeoutsRef.current;

    return () => {
      pendingActionTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      pendingActionTimeouts.clear();
    };
  }, []);

  async function banUser() {
    const response = await fetch(`/api/admin/users/${user.id}/ban`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: null,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Не удалось заблокировать аккаунт.");
    }
  }

  async function deleteUser() {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Не удалось удалить аккаунт.");
    }
  }

  function scheduleUndoableAction({
    actionKey,
    commit,
    description,
    errorMessage,
    pendingMessage,
    successMessage,
    toastVariant,
    undoMessage,
  }: {
    actionKey: string;
    commit: () => Promise<void>;
    description: string;
    errorMessage: string;
    pendingMessage: string;
    successMessage: string;
    toastVariant: "danger" | "warning";
    undoMessage: string;
  }) {
    const existingTimeoutId = pendingActionTimeoutsRef.current.get(actionKey);

    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
      pendingActionTimeoutsRef.current.delete(actionKey);
    }

    const toastId = toast(pendingMessage, {
      variant: toastVariant,
      description,
      timeout: 5000,
      actionProps: {
        children: "Отменить",
        onPress: () => {
          const timeoutId = pendingActionTimeoutsRef.current.get(actionKey);

          if (timeoutId) {
            window.clearTimeout(timeoutId);
            pendingActionTimeoutsRef.current.delete(actionKey);
          }

          toast.close(toastId);
          toast.info(undoMessage);
        },
      },
    });

    const timeoutId = window.setTimeout(async () => {
      pendingActionTimeoutsRef.current.delete(actionKey);

      setIsSubmitting(true);
      setFeedbackMessage(null);

      try {
        await commit();
        router.refresh();
        toast.success(successMessage);
      } catch (error) {
        const resolvedErrorMessage =
          error instanceof Error ? error.message : errorMessage;

        setFeedbackMessage(resolvedErrorMessage);
        toast.danger(resolvedErrorMessage);
      } finally {
        setIsSubmitting(false);
      }
    }, 5000);

    pendingActionTimeoutsRef.current.set(actionKey, timeoutId);
  }

  function handleBan() {
    setIsBanDialogOpen(false);
    setFeedbackMessage(null);

    scheduleUndoableAction({
      actionKey: `ban:${user.id}`,
      commit: banUser,
      description: `Действие будет выполнено через 5 секунд для ${accountName}.`,
      errorMessage: "Не удалось заблокировать аккаунт.",
      pendingMessage: "Пользователь будет забанен",
      successMessage: "Пользователь забанен.",
      toastVariant: "warning",
      undoMessage: "Бан отменен.",
    });
  }

  function handleDelete() {
    setIsDeleteDialogOpen(false);
    setFeedbackMessage(null);

    scheduleUndoableAction({
      actionKey: `delete:${user.id}`,
      commit: deleteUser,
      description: `Действие будет выполнено через 5 секунд для ${accountName}.`,
      errorMessage: "Не удалось удалить аккаунт.",
      pendingMessage: "Аккаунт будет удален",
      successMessage: "Аккаунт удален.",
      toastVariant: "danger",
      undoMessage: "Удаление отменено.",
    });
  }

  return (
    <>
      <div
        data-admin-row-action="true"
        className="relative"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Dropdown.Root>
          <Dropdown.Trigger
            aria-label="Открыть меню действий"
            className="interactive-tertiary inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--label-primary)]"
          >
            <MoreHorizontalIcon />
          </Dropdown.Trigger>

          <Dropdown.Popover placement="bottom end" className="min-w-[220px]">
            <Dropdown.Menu
              aria-label="Действия с аккаунтом"
              selectionMode="none"
              onAction={(key) => {
                const action = String(key);

                if (action === "edit") {
                  setIsEditorOpen(true);
                  return;
                }

                if (action === "ban") {
                  setIsBanDialogOpen(true);
                  setFeedbackMessage(null);
                  return;
                }

                if (action === "delete") {
                  setIsDeleteDialogOpen(true);
                  setFeedbackMessage(null);
                }
              }}
            >
              <Dropdown.Item key="edit" id="edit" textValue="Редактировать">
                Редактировать
              </Dropdown.Item>
              <Dropdown.Item key="ban" id="ban" textValue="Забанить">
                Забанить
              </Dropdown.Item>
              <Dropdown.Item
                key="delete"
                id="delete"
                textValue="Удалить аккаунт"
                className="text-[var(--accent-critical)]"
              >
                Удалить аккаунт
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>

      <AdminUserEditorModal
        initialUser={user}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />

      {isBanDialogOpen ? (
        <ConfirmDialog
          title={`Вы уверены, что хотите забанить пользователя ${accountName}?`}
          actionLabel="Забанить"
          errorMessage={feedbackMessage}
          isLoading={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setIsBanDialogOpen(false);
              setFeedbackMessage(null);
            }
          }}
          onConfirm={() => {
            handleBan();
          }}
        />
      ) : null}

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title={`Вы уверены, что хотите удалить пользователя ${accountName}?`}
          actionLabel="Удалить"
          errorMessage={feedbackMessage}
          isLoading={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setIsDeleteDialogOpen(false);
              setFeedbackMessage(null);
            }
          }}
          onConfirm={() => {
            handleDelete();
          }}
        />
      ) : null}
    </>
  );
}
