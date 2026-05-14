"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommentEditor } from "@/features/comments/components/comment-editor";
import { hasCommentBodyContent } from "@/features/comments/lib/comment-format";
import type { CommentsViewer } from "@/features/comments/types";

type CommentsComposerProps = {
  viewer: CommentsViewer;
  placeholder: string;
  submitLabel: string;
  initialValue?: string;
  showInlineCancel?: boolean;
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
  initialValue = "",
  showInlineCancel = false,
  submitDisabled,
  editorDisabled = false,
  disabledReason = null,
  compact = false,
  autoFocus = false,
  submitting = false,
  onCancel,
  onSubmit,
}: CommentsComposerProps) {
  const [draft, setDraft] = useState(initialValue);
  const [isActive, setIsActive] = useState(
    autoFocus || hasCommentBodyContent(initialValue),
  );
  void viewer;

  const hasDraft = hasCommentBodyContent(draft);
  const showEditorTools = isActive || hasDraft || showInlineCancel;
  const canSubmit =
    !editorDisabled && !submitDisabled && hasDraft && !submitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const isSuccessful = await onSubmit(draft);

    if (!isSuccessful) {
      return;
    }

    setDraft("");
    setIsActive(false);
    onCancel?.();
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        className="relative w-full"
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
          showToolbar={showEditorTools}
          actions={
            showInlineCancel || hasDraft ? (
              <>
                {showInlineCancel ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onCancel}
                    disabled={submitting}
                  >
                    Отменить
                  </Button>
                ) : null}

                {hasDraft ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    isLoading={submitting}
                  >
                    {submitLabel}
                  </Button>
                ) : null}
              </>
            ) : null
          }
        />
      </div>

      {submitDisabled && disabledReason ? (
        <p className="type-caption-tight text-label-tertiary">
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
