"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommentAvatar } from "@/features/comments/components/comment-avatar";
import { CommentEditor } from "@/features/comments/components/comment-editor";
import type { CommentsViewer } from "@/features/comments/types";

type CommentsComposerProps = {
  viewer: CommentsViewer;
  placeholder: string;
  submitLabel: string;
  submitDisabled: boolean;
  editorDisabled?: boolean;
  disabledReason?: string | null;
  compact?: boolean;
  autoFocus?: boolean;
  submitting?: boolean;
  onCancel?: () => void;
  onSubmit: (body: string) => Promise<boolean>;
};

export function CommentsComposer({
  viewer,
  placeholder,
  submitLabel,
  submitDisabled,
  editorDisabled = false,
  disabledReason = null,
  compact = false,
  autoFocus = false,
  submitting = false,
  onCancel,
  onSubmit,
}: CommentsComposerProps) {
  const [draft, setDraft] = useState("");
  const [isActive, setIsActive] = useState(autoFocus);
  const showAvatar = viewer.isAuthenticated;

  const trimmedDraft = draft.trim();
  const canSubmit =
    !editorDisabled && !submitDisabled && trimmedDraft.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const isSuccessful = await onSubmit(trimmedDraft);

    if (!isSuccessful) {
      return;
    }

    setDraft("");
    setIsActive(false);
  }

  function handleCancel() {
    setDraft("");
    setIsActive(false);
    onCancel?.();
  }

  return (
    <div className={`flex w-full items-start ${showAvatar ? "gap-3" : ""}`.trim()}>
      {showAvatar ? (
        <CommentAvatar
          avatarUrl={viewer.avatarUrl}
          handle={viewer.handle}
          name={viewer.displayName}
          size={compact ? "sm" : "md"}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          className="w-full"
          onClick={() => {
            if (editorDisabled) {
              return;
            }

            setIsActive(true);
          }}
        >
          <CommentEditor
            value={draft}
            onChange={(nextValue) => {
              setDraft(nextValue);
              if (!isActive) {
                setIsActive(true);
              }
            }}
            placeholder={placeholder}
            disabled={submitting || editorDisabled}
            compact={compact}
            autoFocus={autoFocus && !editorDisabled}
          />
        </div>

        {submitDisabled && disabledReason ? (
          <p className="text-label-tertiary text-[12px] leading-4">
            {disabledReason}
          </p>
        ) : null}

        {isActive || trimmedDraft.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="tertiary"
              size="sm"
              className="!rounded-full !px-4 !py-2 text-[13px]"
              onClick={handleCancel}
              disabled={submitting}
            >
              Отмена
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="!rounded-full !px-4 !py-2 text-[13px] font-semibold"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? "Отправка..." : submitLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
