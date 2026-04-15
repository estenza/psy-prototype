"use client";

import { ThumbUpOutlineIcon } from "@/components/ui/icons";

type CommentActionsProps = {
  likeCount: number;
  canLike: boolean;
  canReply: boolean;
  onLike: () => void;
  onReply: () => void;
};

export function CommentActions({
  likeCount,
  canLike,
  canReply,
  onLike,
  onReply,
}: CommentActionsProps) {
  return (
    <div className="flex min-h-9 w-full items-center gap-0 pt-1">
      <button
        type="button"
        className="interactive-tertiary text-label-secondary inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
        onClick={onLike}
        disabled={!canLike}
        aria-label="Поставить лайк"
      >
        <ThumbUpOutlineIcon />
      </button>

      <span className="text-label-tertiary min-w-[28px] pr-2 text-[12px] leading-[18px]">
        {likeCount > 0 ? likeCount : ""}
      </span>

      <button
        type="button"
        className="interactive-tertiary text-label-primary inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-[12px] font-medium leading-8"
        onClick={onReply}
        disabled={!canReply}
      >
        Ответить
      </button>
    </div>
  );
}
