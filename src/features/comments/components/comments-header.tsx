"use client";

import { formatCommentCount } from "@/features/comments/lib/comment-format";
import { CommentsSortControl } from "@/features/comments/components/comments-sort-control";
import type { CommentsSortValue } from "@/features/comments/types";

type CommentsHeaderProps = {
  totalCount: number;
  sort: CommentsSortValue;
  onSortChange: (value: CommentsSortValue) => void;
};

export function CommentsHeader({
  totalCount,
  sort,
  onSortChange,
}: CommentsHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pt-6">
      <h2 className="font-helvetica text-label-primary text-[16px] font-bold leading-5 tracking-[0.16px]">
        {formatCommentCount(totalCount)}
      </h2>

      <CommentsSortControl value={sort} onChange={onSortChange} />
    </div>
  );
}
