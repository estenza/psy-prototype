"use client";

import { ToggleButton, cn } from "@heroui/react";
import { ChevronDownSmallIcon, ChevronUpSmallIcon, CommentHeartIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

type CommentActionsProps = {
  isReply?: boolean;
  liked: boolean;
  likeCount: number;
  canLike: boolean;
  canReply: boolean;
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
  onLike,
  onReply,
  repliesToggleLabel = null,
  repliesToggleOpen = false,
  onRepliesToggle,
  className,
}: CommentActionsProps) {
  const likedActionClassName =
    "bg-[var(--color-danger-soft)] text-[var(--danger)] hover:bg-[var(--color-danger-soft-hover)] data-[hovered=true]:bg-[var(--color-danger-soft-hover)] active:bg-[var(--color-danger-soft-hover)] data-[pressed=true]:bg-[var(--color-danger-soft-hover)]";
  const actionClassName =
    "interactive-action-soft type-body-md inline-flex h-7 items-center justify-center rounded-full px-3 font-normal transition-colors";
  const tertiaryActionClassName =
    "interactive-tertiary type-body-md inline-flex h-7 items-center justify-center rounded-full px-3 font-normal transition-colors";
  const shouldShowLikeCount = !isReply && likeCount > 0;

  return (
    <div className={cn("flex min-h-7 w-full items-center gap-1 pt-3", className)}>
      <div className="flex items-center gap-2">
        <HoverTooltip label={liked ? "Больше не нравится" : "Нравится"}>
          <ToggleButton
            aria-label={liked ? "Больше не нравится" : "Нравится"}
            isSelected={liked}
            onChange={onLike}
            className={cn(
              actionClassName,
              shouldShowLikeCount ? "gap-1 align-middle" : "button--icon-only w-9 px-0",
              liked ? "pl-2 pr-3" : "",
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

        <button
          type="button"
          className={actionClassName}
          onClick={onReply}
          disabled={!canReply}
          aria-label="Ответить"
        >
          <span className="type-body-md-medium flex items-center">Ответить</span>
        </button>
      </div>

      {repliesToggleLabel && onRepliesToggle ? (
        <button
          type="button"
          className={cn(tertiaryActionClassName, "gap-1")}
          onClick={onRepliesToggle}
          aria-label={repliesToggleOpen ? "Скрыть ответы" : "Показать ответы"}
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
