"use client";

import { CommentItem, shouldRenderCommentNode } from "@/features/comments/components/comment-item";
import type { CommentNode, CommentsViewer } from "@/features/comments/types";

type CommentListProps = {
  comments: CommentNode[];
  viewer: CommentsViewer;
  canPostReply: boolean;
  isViewerAuthenticated: boolean;
  onRequireAuth: () => void;
  postDisabledReason?: string | null;
  submittingTarget: string | "root" | null;
  onDeleteComment: (commentId: string) => Promise<void>;
  onEditComment: (commentId: string, body: string) => Promise<boolean>;
  onSubmitReply: (body: string, parentId: string) => Promise<boolean>;
  onVote: (commentId: string, type: "up" | "down" | null) => void;
  onBlock: (commentId: string) => void;
  onReport: (commentId: string) => void;
  highlightedCommentIds?: string[];
};

export function CommentList({
  comments,
  viewer,
  canPostReply,
  isViewerAuthenticated,
  onRequireAuth,
  postDisabledReason = null,
  submittingTarget,
  onDeleteComment,
  onEditComment,
  onSubmitReply,
  onVote,
  onBlock,
  onReport,
  highlightedCommentIds = [],
}: CommentListProps) {
  const renderableComments = comments.filter(shouldRenderCommentNode);

  return (
    <div className="flex w-full flex-col gap-5">
      {renderableComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          viewer={viewer}
          canPostReply={canPostReply}
          isViewerAuthenticated={isViewerAuthenticated}
          onRequireAuth={onRequireAuth}
          postDisabledReason={postDisabledReason}
          submittingTarget={submittingTarget}
          onDeleteComment={onDeleteComment}
          onEditComment={onEditComment}
          onSubmitReply={onSubmitReply}
          onVote={onVote}
          onBlock={onBlock}
          onReport={onReport}
          highlightedCommentIds={highlightedCommentIds}
        />
      ))}
    </div>
  );
}
