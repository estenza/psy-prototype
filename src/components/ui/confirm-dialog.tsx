"use client";

import { Modal } from "@heroui/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  actionLabel: string;
  description?: ReactNode;
  errorMessage?: string | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmDialog({
  actionLabel,
  description,
  errorMessage,
  isLoading,
  onClose,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal.Backdrop
      isOpen
      variant="opaque"
      isDismissable={!isLoading}
      onClick={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('[data-slot="modal-dialog"]')) return;
        if (!isLoading) onClose();
      }}
      className="fixed inset-0 z-[320]"
    >
      <Modal.Container scroll="outside" className="!p-4">
        <Modal.Dialog
          aria-label={title}
          className="modal-surface w-full max-w-[420px] p-5"
        >
          <Modal.Body className="p-0">
            <h3 className="type-h3 font-bold text-[var(--label-primary)]">
              {title}
            </h3>
            {description ? (
              <p className="mt-2 text-[14px] leading-5 font-normal text-[var(--label-primary)]">
                {description}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-3 text-sm text-[var(--danger)]">{errorMessage}</p>
            ) : null}

            <div className="mt-6 flex w-full gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!w-full !justify-center !text-[var(--label-primary)]"
                disabled={isLoading}
                onClick={onClose}
              >
                Отменить
              </Button>
              <Button
                type="button"
                variant="primary"
                className="!w-full !justify-center"
                disabled={isLoading}
                isLoading={isLoading}
                onClick={onConfirm}
              >
                {actionLabel}
              </Button>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
