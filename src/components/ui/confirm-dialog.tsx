"use client";

import { Modal, Spinner } from "@heroui/react";
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
            <h3 className="font-helvetica text-[24px] font-bold leading-8 text-[var(--label-primary)]">
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
                className="interactive-secondary !w-full !justify-center !rounded-full !px-5 !text-[var(--label-primary)]"
                disabled={isLoading}
                onClick={onClose}
              >
                Отменить
              </Button>
              <Button
                type="button"
                variant="primary"
                className="relative !w-full !justify-center !rounded-full !px-5"
                disabled={isLoading}
                onClick={onConfirm}
              >
                <span className={isLoading ? "opacity-0" : ""}>{actionLabel}</span>
                {isLoading ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
                    <Spinner size="sm" color="current" />
                  </span>
                ) : null}
              </Button>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
