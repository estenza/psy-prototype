"use client";

import { CommentItem } from "@/features/comments/components/comment-item";
import type { CommentNode, CommentsViewer } from "@/features/comments/types";

type CommentListProps = {
  comments: CommentNode[];
  viewer: CommentsViewer;
  canPostReply: boolean;
  isViewerAuthenticated: boolean;
  onRequireAuth: () => void;
  postDisabledReason?: string | null;
  submittingTarget: number | "root" | null;
  onSubmitReply: (body: string, parentId: number) => Promise<boolean>;
  onVote: (commentId: number, type: "up" | "down" | null) => void;
  onBlock: (commentId: number) => void;
  onReport: (commentId: number) => void;
};

export function CommentList({
  comments,
  viewer,
  canPostReply,
  isViewerAuthenticated,
  onRequireAuth,
  postDisabledReason = null,
  submittingTarget,
  onSubmitReply,
  onVote,
  onBlock,
  onReport,
}: CommentListProps) {
  return (
    <div className="flex w-full flex-col gap-5">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          viewer={viewer}
          canPostReply={canPostReply}
          isViewerAuthenticated={isViewerAuthenticated}
          onRequireAuth={onRequireAuth}
          postDisabledReason={postDisabledReason}
          submittingTarget={submittingTarget}
          onSubmitReply={onSubmitReply}
          onVote={onVote}
          onBlock={onBlock}
          onReport={onReport}
        />
      ))}
    </div>
  );
}
