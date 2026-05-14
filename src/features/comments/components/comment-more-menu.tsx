"use client";

import { Modal, Radio, RadioGroup } from "@heroui/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DeleteOutlineIcon,
  EditOutlineIcon,
  FlagIcon,
  IgnoreAuthorIcon,
} from "@/components/ui/icons";
import { MoreMenuButton } from "@/components/ui/more-menu-button";
import { ResponsiveActionMenu } from "@/components/ui/responsive-action-menu";
import { REPORT_REASONS } from "@/features/reports/lib/report-copy";
import type { ContentReportReason } from "@/features/reports/types";

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
  onReport: (reason: ContentReportReason) => Promise<void> | void;
};

type CommentMenuItem = {
  disabled: boolean;
  icon: ReactNode;
  id: string;
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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ContentReportReason>("spam");

  const items: CommentMenuItem[] =
    isViewerAuthenticated && viewerOwnsComment
      ? [
          {
            id: "edit",
            label: "Редактировать",
            icon: <EditOutlineIcon />,
            disabled: !canEdit,
            onSelect: onEdit,
          },
          {
            id: "delete",
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
            id: "report",
            label: "Пожаловаться",
            icon: <FlagIcon />,
            disabled: !canReport,
            onSelect: () => {
              setReportErrorMessage(null);
              setIsReportDialogOpen(true);
            },
          },
          {
            id: "block",
            label: "Заблокировать",
            icon: <IgnoreAuthorIcon />,
            disabled: false,
            onSelect: onBlock,
          },
        ];

  return (
    <>
      <ResponsiveActionMenu
        ariaLabel="Меню комментария"
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        items={items.map((item) => ({
          id: item.id,
          icon: item.icon,
          isDisabled: item.disabled,
          label: item.label,
          onSelect: item.onSelect,
        }))}
        popoverClassName="min-w-[188px]"
        renderTrigger={({ isOpen, isMobile, open }) => (
          <MoreMenuButton
            ariaLabel="Открыть меню действий"
            aria-expanded={isOpen}
            isTooltipDisabled={isOpen}
            onPress={isMobile ? open : undefined}
          />
        )}
      />

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Удалить комментарий?"
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
                    : "Не удалось удалить комментарий.",
                );
              })
              .finally(() => {
                setIsDeleteSubmitting(false);
              });
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
              aria-label="Пожаловаться на комментарий"
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
                      setIsReportSubmitting(true);
                      setReportErrorMessage(null);

                      Promise.resolve(onReport(reportReason))
                        .then(() => {
                          setIsReportDialogOpen(false);
                        })
                        .catch((error: unknown) => {
                          setReportErrorMessage(
                            error instanceof Error
                              ? error.message
                              : "Не удалось отправить жалобу.",
                          );
                        })
                        .finally(() => {
                          setIsReportSubmitting(false);
                        });
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
