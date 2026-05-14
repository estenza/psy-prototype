"use client";

import { Modal, Radio, RadioGroup } from "@heroui/react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreMenuButton } from "@/components/ui/more-menu-button";
import { ResponsiveActionMenu } from "@/components/ui/responsive-action-menu";
import {
  ArrowTurnRightIcon,
  BellIcon,
  DeleteOutlineIcon,
  EditOutlineIcon,
  EyeOffIcon,
  FlagIcon,
  IgnoreAuthorIcon,
  PersonPlusIcon,
} from "@/components/ui/icons";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import {
  COMMUNITY_POST_MENU_ACTIONS,
  OWN_POST_MENU_ACTIONS,
  type PostMenuActionPayload,
  type PostMenuActionId,
} from "@/features/feed/constants/post-menu";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import type { Post } from "@/features/feed/types";
import { REPORT_REASONS } from "@/features/reports/lib/report-copy";
import type { ContentReportReason } from "@/features/reports/types";

type PostMoreMenuProps = {
  onAction: (
    actionId: PostMenuActionId,
    postId: Post["id"],
    payload?: PostMenuActionPayload,
  ) => Promise<void> | void;
  post: Post;
};

type PostMenuRenderItem = {
  icon: ReactNode;
  id: PostMenuActionId;
  label: string;
  labelClassName?: string;
  onSelect: () => void;
};

const MIN_CONFIRM_LOADING_MS = 1000;

function resolveMenuIcon(actionId: PostMenuActionId) {
  if (actionId === "edit") {
    return <EditOutlineIcon />;
  }

  if (actionId === "delete") {
    return <DeleteOutlineIcon />;
  }

  if (actionId === "follow-author") return <PersonPlusIcon />;
  if (actionId === "follow") return <BellIcon />;
  if (actionId === "profile-favorite") return <ArrowTurnRightIcon />;
  if (actionId === "hide") return <IgnoreAuthorIcon />;
  if (actionId === "report") return <FlagIcon />;
  return <EyeOffIcon />;
}

export function PostMoreMenu({ onAction, post }: PostMoreMenuProps) {
  const { user } = useAuthClient();
  const isOwnedByCurrentUser = isPostOwnedByUser(post, user);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ContentReportReason>("spam");

  const actions = useMemo<PostMenuRenderItem[]>(() => {
    const menuActions = isOwnedByCurrentUser
      ? OWN_POST_MENU_ACTIONS
      : COMMUNITY_POST_MENU_ACTIONS;

    const authorHandle = post.author.handle.startsWith("@")
      ? post.author.handle
      : `@${post.author.handle}`;

    return menuActions.map((action) => ({
      icon: resolveMenuIcon(action.id),
      id: action.id,
      labelClassName:
        action.id === "profile-favorite" && post.viewer.profileFavorite
          ? "text-[var(--label-primary)]"
          : undefined,
      label:
        action.id === "follow-author"
          ? `Начать читать ${authorHandle}`
          : action.id === "profile-favorite" && post.viewer.profileFavorite
            ? "Убрать из Избранного"
          : action.id === "hide"
            ? `Игнорировать ${authorHandle}`
            : action.label,
      onSelect: () => {
        if (action.id === "delete") {
          setDeleteErrorMessage(null);
          setIsDeleteDialogOpen(true);
          return;
        }

        if (action.id === "report") {
          setReportErrorMessage(null);
          setIsReportDialogOpen(true);
          return;
        }

        void onAction(action.id, post.id);
      },
    }));
  }, [isOwnedByCurrentUser, onAction, post]);

  async function handleDeleteConfirm() {
    setIsDeleteSubmitting(true);
    setDeleteErrorMessage(null);

    try {
      await Promise.all([
        onAction("delete", post.id),
        new Promise((resolve) => {
          window.setTimeout(resolve, MIN_CONFIRM_LOADING_MS);
        }),
      ]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось удалить пост.",
      );
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  async function handleReportSubmit() {
    setIsReportSubmitting(true);
    setReportErrorMessage(null);

    try {
      await onAction("report", post.id, {
        reason: reportReason,
      });
      setIsReportDialogOpen(false);
    } catch (error) {
      setReportErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось отправить жалобу.",
      );
    } finally {
      setIsReportSubmitting(false);
    }
  }

  return (
    <>
      <div className="pointer-events-auto relative z-30 shrink-0">
        <ResponsiveActionMenu
          ariaLabel="Меню публикации"
          isOpen={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          items={actions}
          popoverClassName="w-[260px]"
          renderTrigger={({ isOpen, isMobile, open }) => (
            <MoreMenuButton
              ariaLabel="Еще"
              aria-expanded={isOpen}
              isTooltipDisabled={isOpen}
              onPress={isMobile ? open : undefined}
            />
          )}
        />
      </div>

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Удалить пост?"
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
            void handleDeleteConfirm();
          }}
        />
      ) : null}

      {isReportDialogOpen ? (
        <Modal.Backdrop
          isOpen
          variant="opaque"
          isDismissable={!isReportSubmitting}
          onClick={(event) => {
            const target = event.target instanceof HTMLElement ? event.target : null;
            if (target?.closest('[data-slot="modal-dialog"]')) return;
            if (!isReportSubmitting) setIsReportDialogOpen(false);
          }}
          className="fixed inset-0 z-[320]"
        >
          <Modal.Container scroll="outside" className="!p-4">
            <Modal.Dialog
              aria-label="Пожаловаться на пост"
              className="modal-surface w-full max-w-[460px] p-5"
            >
              <Modal.Body className="flex flex-col gap-5 p-0">
                <div className="flex flex-col gap-2">
                  <h3 className="type-h3 font-bold text-[var(--label-primary)]">
                    О чем хотите сообщить?
                  </h3>
                  <p className="text-[14px] font-normal leading-5 text-[var(--label-secondary)]">
                    Выберите категорию, которая лучше всего описывает ваш вопрос
                  </p>
                </div>

                <RadioGroup
                  aria-label="Причина жалобы"
                  value={reportReason}
                  onChange={(value) => setReportReason(value as ContentReportReason)}
                  isDisabled={isReportSubmitting}
                  orientation="horizontal"
                  className="report-reason-radio-listbox"
                >
                  {REPORT_REASONS.map((reason) => (
                    <Radio
                      key={reason.value}
                      value={reason.value}
                      className="report-reason-radio-item interactive-list-item"
                    >
                      <Radio.Control className="report-reason-radio-control">
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content className="text-[16px] leading-6 text-[var(--label-primary)]">
                        {reason.label}
                      </Radio.Content>
                    </Radio>
                  ))}
                </RadioGroup>

                {reportErrorMessage ? (
                  <p className="text-sm text-[var(--danger)]">
                    {reportErrorMessage}
                  </p>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    className="min-w-[132px] !justify-center"
                    disabled={isReportSubmitting}
                    isLoading={isReportSubmitting}
                    onClick={() => {
                      void handleReportSubmit();
                    }}
                  >
                    Отправить
                  </Button>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}
    </>
  );
}
