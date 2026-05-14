"use client";

import { Dropdown } from "@heroui/react";
import { toast } from "@/components/feedback/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { MoreHorizontalIcon } from "@/components/ui/icons";
import { AdminUserEditorModal } from "@/features/admin/components/admin-user-editor-modal";
import type { AdminListedUser } from "@/features/admin/types";
import type { SpecialistStatus } from "@/features/auth/types";

type AdminUserRowActionsProps = {
  user: AdminListedUser;
};

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

  async function updateSpecialistStatus(specialistStatus: SpecialistStatus) {
    const response = await fetch(`/api/admin/users/${user.id}/specialist-status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        specialistStatus,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Не удалось обновить статус специалиста.");
    }
  }

  async function handleSpecialistStatusChange(specialistStatus: SpecialistStatus) {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      await updateSpecialistStatus(specialistStatus);
      router.refresh();
      toast.success(
        specialistStatus === "verified"
          ? "Заявка подтверждена."
          : "Заявка отклонена.",
      );
    } catch (error) {
      const resolvedErrorMessage =
        error instanceof Error ? error.message : "Не удалось обновить статус специалиста.";

      setFeedbackMessage(resolvedErrorMessage);
      toast.danger(resolvedErrorMessage);
    } finally {
      setIsSubmitting(false);
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
      timeout: 2000,
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
    }, 2000);

    pendingActionTimeoutsRef.current.set(actionKey, timeoutId);
  }

  function handleBan() {
    setIsBanDialogOpen(false);
    setFeedbackMessage(null);

    scheduleUndoableAction({
      actionKey: `ban:${user.id}`,
      commit: banUser,
      description: `Действие будет выполнено через 2 секунды для ${accountName}.`,
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
      description: `Действие будет выполнено через 2 секунды для ${accountName}.`,
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
            className={buttonClassName({
              className: "cursor-pointer text-[var(--label-primary)]",
              isIconOnly: true,
              size: "sm",
              variant: "quaternary",
            })}
          >
            <MoreHorizontalIcon />
          </Dropdown.Trigger>

          <DropdownPopover placement="bottom end" className="min-w-[220px]">
            <Dropdown.Menu
              aria-label="Действия с аккаунтом"
              selectionMode="none"
              className="dropdown-menu-default"
              onAction={(key) => {
                const action = String(key);

                if (action === "edit") {
                  setIsEditorOpen(true);
                  return;
                }

                if (action === "approve-specialist") {
                  void handleSpecialistStatusChange("verified");
                  return;
                }

                if (action === "reject-specialist") {
                  void handleSpecialistStatusChange("rejected");
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
              {user.role === "specialist" && user.specialistStatus !== "verified" ? (
                <Dropdown.Item
                  key="approve-specialist"
                  id="approve-specialist"
                  textValue="Подтвердить заявку"
                  isDisabled={isSubmitting}
                >
                  Подтвердить заявку
                </Dropdown.Item>
              ) : null}
              {user.role === "specialist" && user.specialistStatus !== "rejected" ? (
                <Dropdown.Item
                  key="reject-specialist"
                  id="reject-specialist"
                  textValue="Отклонить заявку"
                  isDisabled={isSubmitting}
                >
                  Отклонить заявку
                </Dropdown.Item>
              ) : null}
              <Dropdown.Item key="ban" id="ban" textValue="Забанить">
                Забанить
              </Dropdown.Item>
              <Dropdown.Item
                key="delete"
                id="delete"
                textValue="Удалить аккаунт"
              >
                Удалить аккаунт
              </Dropdown.Item>
            </Dropdown.Menu>
          </DropdownPopover>
        </Dropdown.Root>
      </div>

      <AdminUserEditorModal
        initialUser={user}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />

      {isBanDialogOpen ? (
        <ConfirmDialog
          title={`Забанить пользователя ${accountName}?`}
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
          title={`Удалить пользователя ${accountName}?`}
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
