"use client";

import { useState } from "react";
import { COMMENT_PREVIEW_CHARACTER_LIMIT } from "@/features/comments/constants";
import { CommentActions } from "@/features/comments/components/comment-actions";
import { CommentAvatar } from "@/features/comments/components/comment-avatar";
import { CommentsComposer } from "@/features/comments/components/comments-composer";
import { CommentMoreMenu } from "@/features/comments/components/comment-more-menu";
import { CommentReplies } from "@/features/comments/components/comment-replies";
import { CommentRichContent } from "@/features/comments/components/comment-rich-content";
import type { CommentNode, CommentsViewer } from "@/features/comments/types";

type CommentItemProps = {
  comment: CommentNode;
  viewer: CommentsViewer;
  canPostReply: boolean;
  isViewerAuthenticated: boolean;
  onRequireAuth: () => void;
  postDisabledReason?: string | null;
  submittingTarget: number | "root" | null;
  isReply?: boolean;
  onSubmitReply: (body: string, parentId: number) => Promise<boolean>;
  onVote: (commentId: number, type: "up" | "down" | null) => void;
  onBlock: (commentId: number) => void;
  onReport: (commentId: number) => void;
};

export function CommentItem({
  comment,
  viewer,
  canPostReply,
  isViewerAuthenticated,
  onRequireAuth,
  postDisabledReason = null,
  submittingTarget,
  isReply = false,
  onSubmitReply,
  onVote,
  onBlock,
  onReport,
}: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [areRepliesVisible, setAreRepliesVisible] = useState(true);
  const canLike = isViewerAuthenticated
    ? comment.capabilities.canVote
    : true;
  const canStartReply = isViewerAuthenticated ? canPostReply : true;

  const shouldClamp = comment.bodyText.length > COMMENT_PREVIEW_CHARACTER_LIMIT;

  return (
    <article className="flex w-full items-start gap-3">
      <div
        className={`relative shrink-0 ${isReply ? "w-6" : "w-9"}`.trim()}
      >
        <CommentAvatar
          avatarUrl={comment.author.avatarUrl}
          handle={comment.author.handle}
          name={comment.author.name}
          size={isReply ? "sm" : "md"}
        />

        {!isReply && comment.replyCount > 0 && areRepliesVisible ? (
          <div className="comment-root-thread-rail absolute bottom-0 right-0 top-9 w-[18px]" />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex w-full items-start">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 pb-0.5">
              <span className="text-label-primary text-[13px] font-medium leading-[18px]">
                {comment.author.handle}
              </span>
              <span className="text-label-tertiary text-[12px] leading-[18px]">
                {comment.relativeDate}
              </span>
            </div>

            <CommentRichContent
              html={comment.bodyHtml}
              clamped={shouldClamp && !isExpanded}
            />

            {shouldClamp ? (
              <button
                type="button"
                className="interactive-tertiary text-label-secondary mt-[3px] inline-flex rounded-[3px] text-[14px] font-medium leading-5"
                onClick={() => setIsExpanded((currentState) => !currentState)}
              >
                {isExpanded ? "Свернуть" : "Читать дальше"}
              </button>
            ) : null}

            <CommentActions
              likeCount={comment.upvotes}
              canLike={canLike}
              canReply={canStartReply}
              onLike={() => {
                if (!isViewerAuthenticated) {
                  onRequireAuth();
                  return;
                }

                onVote(comment.id, comment.userVote === "up" ? null : "up");
              }}
              onReply={() => {
                if (!isViewerAuthenticated) {
                  setIsReplyComposerOpen(true);
                  onRequireAuth();
                  return;
                }

                setIsReplyComposerOpen((currentState) => !currentState);
              }}
            />

            {isReplyComposerOpen ? (
              <div className="pt-1">
                <CommentsComposer
                  viewer={viewer}
                  placeholder="Ответить..."
                  submitLabel="Ответить"
                  submitDisabled={!canPostReply}
                  editorDisabled={!isViewerAuthenticated}
                  disabledReason={canPostReply ? null : postDisabledReason}
                  compact
                  autoFocus
                  submitting={submittingTarget === comment.id}
                  onCancel={() => setIsReplyComposerOpen(false)}
                  onSubmit={(body) => onSubmitReply(body, comment.id)}
                />
              </div>
            ) : null}
          </div>

          <div className="-mt-3 -mr-2 shrink-0">
            <CommentMoreMenu
              canReport={comment.capabilities.canReport}
              canEdit={comment.capabilities.canEdit}
              canDelete={comment.capabilities.canDelete}
              isViewerAuthenticated={isViewerAuthenticated}
              viewerOwnsComment={comment.viewerOwnsComment}
              onBlock={() => onBlock(comment.id)}
              onReport={() => onReport(comment.id)}
            />
          </div>
        </div>

        {!isReply && comment.replyCount > 0 ? (
          <CommentReplies
            replyCount={comment.replyCount}
            isOpen={areRepliesVisible}
            onToggle={() => setAreRepliesVisible((currentState) => !currentState)}
          >
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                viewer={viewer}
                canPostReply={canPostReply}
                isViewerAuthenticated={isViewerAuthenticated}
                onRequireAuth={onRequireAuth}
                postDisabledReason={postDisabledReason}
                submittingTarget={submittingTarget}
                isReply
                onSubmitReply={onSubmitReply}
                onVote={onVote}
                onBlock={onBlock}
                onReport={onReport}
              />
            ))}
          </CommentReplies>
        ) : null}
      </div>
    </article>
  );
}
