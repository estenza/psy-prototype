"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon } from "@/components/ui/icons";
import { AdminUserEditorModal } from "@/features/admin/components/admin-user-editor-modal";
import type { AdminListedUser } from "@/features/admin/types";

type AdminUserRowActionsProps = {
  user: AdminListedUser;
};

function ConfirmDialog({
  actionLabel,
  children,
  danger = false,
  isLoading,
  onClose,
  onConfirm,
  title,
}: {
  actionLabel: string;
  children: React.ReactNode;
  danger?: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,23,42,0.46)] backdrop-blur-[3px]"
        aria-label="Закрыть диалог"
        onClick={onClose}
      />

      <div className="surface-primary border-separator relative z-10 w-full max-w-[420px] rounded-[28px] border p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <h3 className="font-helvetica text-[24px] font-bold leading-none">{title}</h3>
        <div className="mt-3 text-[14px] leading-6 text-[var(--label-secondary)]">{children}</div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="!rounded-full !px-5"
            disabled={isLoading}
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant={danger ? "primary" : "secondary"}
            className="!rounded-full !px-5"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Подождите..." : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminUserRowActions({ user }: AdminUserRowActionsProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState(user.banReason ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  async function handleBan() {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: banReason,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось заблокировать аккаунт.");
      }

      setIsBanDialogOpen(false);
      router.refresh();
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Не удалось заблокировать аккаунт.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить аккаунт.");
      }

      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Не удалось удалить аккаунт.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          className="interactive-control inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
          aria-label="Открыть меню действий"
          onClick={() => setIsMenuOpen((currentState) => !currentState)}
        >
          <MoreHorizontalIcon />
        </button>

        {isMenuOpen ? (
          <div className="surface-elevated border-separator absolute right-0 top-[calc(100%+4px)] z-30 min-w-[220px] rounded-[18px] border p-1 shadow-[0_14px_32px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              className="comment-menu-item w-full justify-start rounded-[14px] px-3 py-2.5 text-left text-[13px] leading-4"
              onClick={() => {
                setIsMenuOpen(false);
                setIsEditorOpen(true);
              }}
            >
              Редактировать
            </button>

            <button
              type="button"
              className="comment-menu-item w-full justify-start rounded-[14px] px-3 py-2.5 text-left text-[13px] leading-4"
              onClick={() => {
                setIsMenuOpen(false);
                setIsBanDialogOpen(true);
              }}
            >
              {user.isBanned ? "Обновить бан" : "Забанить"}
            </button>

            <button
              type="button"
              className="comment-menu-item w-full justify-start rounded-[14px] px-3 py-2.5 text-left text-[13px] leading-4 text-[var(--accent-critical)]"
              onClick={() => {
                setIsMenuOpen(false);
                setIsDeleteDialogOpen(true);
              }}
            >
              Удалить аккаунт
            </button>
          </div>
        ) : null}
      </div>

      <AdminUserEditorModal
        initialUser={user}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />

      {isBanDialogOpen ? (
        <ConfirmDialog
          title={user.isBanned ? "Обновить причину бана" : "Забанить аккаунт"}
          actionLabel={user.isBanned ? "Сохранить причину" : "Забанить"}
          danger
          isLoading={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setIsBanDialogOpen(false);
              setFeedbackMessage(null);
            }
          }}
          onConfirm={() => {
            void handleBan();
          }}
        >
          <div className="grid gap-3">
            <p>
              Бан можно сохранить и без причины. Если причина есть, она будет видна в админке как
              secondary-информация.
            </p>
            <textarea
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              placeholder="Причина бана (необязательно)"
              className="field-shell min-h-[120px] rounded-[24px] px-5 py-4 text-[15px] outline-none placeholder:text-[var(--label-tertiary)]"
            />
            {feedbackMessage ? (
              <p className="text-sm text-[var(--accent-critical)]">{feedbackMessage}</p>
            ) : null}
          </div>
        </ConfirmDialog>
      ) : null}

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Удалить аккаунт"
          actionLabel="Удалить"
          danger
          isLoading={isSubmitting}
          onClose={() => {
            if (!isSubmitting) {
              setIsDeleteDialogOpen(false);
              setFeedbackMessage(null);
            }
          }}
          onConfirm={() => {
            void handleDelete();
          }}
        >
          <div className="grid gap-3">
            <p>
              Аккаунт, его сессии и связанные записи в локальном auth-storage будут удалены. Это
              действие нельзя откатить.
            </p>
            {feedbackMessage ? (
              <p className="text-sm text-[var(--accent-critical)]">{feedbackMessage}</p>
            ) : null}
          </div>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
