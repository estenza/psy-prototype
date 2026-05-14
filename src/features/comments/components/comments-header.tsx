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
    <div className="flex items-center justify-between gap-4 px-1 pt-5">
      <h4 className="type-h4 font-bold text-label-primary">
        {formatCommentCount(totalCount)}
      </h4>

      <CommentsSortControl value={sort} onChange={onSortChange} />
    </div>
  );
}
