"use client";

import { ToggleButton, cn } from "@heroui/react";
import { buttonClassName } from "@/components/ui/button-styles";
import { ChevronDownSmallIcon, ChevronUpSmallIcon, CommentHeartIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

type CommentActionsProps = {
  isReply?: boolean;
  liked: boolean;
  likeCount: number;
  canLike: boolean;
  canReply: boolean;
  readOnlyLike?: boolean;
  showReplyAction?: boolean;
  onLike: () => void;
  onReply: () => void;
  repliesToggleLabel?: string | null;
  repliesToggleOpen?: boolean;
  onRepliesToggle?: () => void;
  className?: string;
};

export function CommentActions({
  isReply = false,
  liked,
  likeCount,
  canLike,
  canReply,
  readOnlyLike = false,
  showReplyAction = true,
  onLike,
  onReply,
  repliesToggleLabel = null,
  repliesToggleOpen = false,
  onRepliesToggle,
  className,
}: CommentActionsProps) {
  const likedActionClassName =
    "bg-[var(--color-danger-soft)] text-[var(--danger)] hover:bg-[var(--color-danger-soft-hover)] data-[hovered=true]:bg-[var(--color-danger-soft-hover)] active:bg-[var(--color-danger-soft-hover)] data-[pressed=true]:bg-[var(--color-danger-soft-hover)]";
  const actionClassName = buttonClassName({
    className: "type-body-md inline-flex font-medium",
    size: "xs",
    variant: "tertiary",
  });
  const iconOnlyActionClassName = buttonClassName({
    className: "type-body-md inline-flex font-medium",
    isIconOnly: true,
    size: "xs",
    variant: "tertiary",
  });
  const tertiaryAccentActionClassName = buttonClassName({
    className: "type-body-md inline-flex gap-1 font-medium",
    size: "xs",
    variant: "tertiary-accent",
  });
  const shouldShowLikeCount = !isReply && likeCount > 0;

  return (
    <div data-comment-actions-row className={cn("flex min-h-7 w-full items-center gap-1", className)}>
      <div className="flex items-center gap-2">
        {readOnlyLike ? (
          <div
            className="type-body-md inline-flex min-h-7 items-center gap-1 text-[var(--label-secondary)]"
            aria-label={`Нравится: ${likeCount}`}
          >
            <span className="flex h-5 w-5 flex-none items-center justify-center">
              <CommentHeartIcon filled={false} />
            </span>
            <span className="flex items-center leading-5">{likeCount}</span>
          </div>
        ) : (
          <HoverTooltip label={liked ? "Больше не нравится" : "Нравится"}>
            <ToggleButton
              aria-label={liked ? "Больше не нравится" : "Нравится"}
              isSelected={liked}
              onChange={onLike}
              className={cn(
                shouldShowLikeCount ? actionClassName : iconOnlyActionClassName,
                shouldShowLikeCount ? "gap-1 align-middle" : "",
                liked && shouldShowLikeCount ? "pl-2 pr-3" : "",
                liked ? likedActionClassName : "",
              )}
              isDisabled={!canLike}
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center">
                <CommentHeartIcon filled={liked} />
              </span>
              {shouldShowLikeCount ? (
                <span className="flex items-center leading-5">{likeCount}</span>
              ) : null}
            </ToggleButton>
          </HoverTooltip>
        )}

        {showReplyAction ? (
          <button
            type="button"
            className={actionClassName}
            onClick={onReply}
            disabled={!canReply}
            aria-label="Ответить"
          >
            <span className="type-body-md-medium flex items-center">Ответить</span>
          </button>
        ) : null}
      </div>

      {repliesToggleLabel && onRepliesToggle ? (
        <button
          type="button"
          className={tertiaryAccentActionClassName}
          onClick={onRepliesToggle}
          aria-label={repliesToggleOpen ? "Скрыть комментарии" : "Показать комментарии"}
        >
          <span className="type-body-md-medium flex items-center">{repliesToggleLabel}</span>
          <span className="flex h-4 w-4 items-center justify-center">
            {repliesToggleOpen ? <ChevronUpSmallIcon /> : <ChevronDownSmallIcon />}
          </span>
        </button>
      ) : null}
    </div>
  );
}
