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
    <div className="flex items-center justify-between gap-4 pt-4">
      <h2 className="type-section-title text-label-primary">
        {formatCommentCount(totalCount)}
      </h2>

      <CommentsSortControl value={sort} onChange={onSortChange} />
    </div>
  );
}
