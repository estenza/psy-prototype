"use client";

import { useState } from "react";
import { AuthorInline } from "@/components/ui/author-inline";
import { COMMENT_PREVIEW_CHARACTER_LIMIT } from "@/features/comments/constants";
import { CommentActions } from "@/features/comments/components/comment-actions";
import { CommentsComposer } from "@/features/comments/components/comments-composer";
import { CommentMoreMenu } from "@/features/comments/components/comment-more-menu";
import { CommentReplies } from "@/features/comments/components/comment-replies";
import { CommentRichContent } from "@/features/comments/components/comment-rich-content";
import { formatReplyCount } from "@/features/comments/lib/comment-format";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import type { CommentNode, CommentsViewer } from "@/features/comments/types";

type CommentItemProps = {
  comment: CommentNode;
  viewer: CommentsViewer;
  canPostReply: boolean;
  isViewerAuthenticated: boolean;
  onRequireAuth: () => void;
  postDisabledReason?: string | null;
  submittingTarget: string | "root" | null;
  isReply?: boolean;
  onDeleteComment: (commentId: string) => Promise<void>;
  onEditComment: (commentId: string, body: string) => Promise<boolean>;
  onSubmitReply: (body: string, parentId: string) => Promise<boolean>;
  onVote: (commentId: string, type: "up" | "down" | null) => void;
  onBlock: (commentId: string) => void;
  onReport: (commentId: string) => void;
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
  onDeleteComment,
  onEditComment,
  onSubmitReply,
  onVote,
  onBlock,
  onReport,
}: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [areRepliesVisible, setAreRepliesVisible] = useState(true);
  const canLike = isViewerAuthenticated
    ? comment.capabilities.canVote
    : true;
  const canReplyToComment = canPostReply && comment.capabilities.canReply;
  const canStartReply = isViewerAuthenticated ? canReplyToComment : true;

  const shouldClamp = comment.bodyText.length > COMMENT_PREVIEW_CHARACTER_LIMIT;
  const commentContent = (
    <article className="flex w-full min-w-0 flex-col pl-1 pt-2 pb-1">
      <div className="flex w-full min-w-0 items-center pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AuthorInline
            avatarUrl={comment.author.avatarUrl}
            handle={comment.author.handle}
            name={comment.author.name}
            meta={comment.relativeDate}
            profileHref={buildPublicProfilePathFromHandle(comment.author.handle)}
            avatarSize="comment-md"
            showStatusDot
            className="min-w-0 flex-1"
          />

          {!isEditing ? (
            <div className="ml-auto shrink-0">
              <CommentMoreMenu
                actionRow
                canReport={comment.capabilities.canReport}
                canEdit={comment.capabilities.canEdit}
                canDelete={comment.capabilities.canDelete}
                isViewerAuthenticated={isViewerAuthenticated}
                viewerOwnsComment={comment.viewerOwnsComment}
                onDelete={() => {
                  void onDeleteComment(comment.id);
                }}
                onEdit={() => {
                  setIsReplyComposerOpen(false);
                  setIsEditing(true);
                }}
                onBlock={() => onBlock(comment.id)}
                onReport={() => onReport(comment.id)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        {isEditing ? (
          <div className="pt-1">
            <CommentsComposer
              viewer={viewer}
              placeholder="Обновить комментарий..."
              submitLabel="Сохранить"
              initialValue={comment.bodyText}
              showInlineCancel
              submitDisabled={false}
              compact
              autoFocus
              submitting={submittingTarget === comment.id}
              onCancel={() => setIsEditing(false)}
              onSubmit={(body) =>
                onEditComment(comment.id, body).then((result) => {
                  if (result) {
                    setIsEditing(false);
                  }

                  return result;
                })
              }
            />
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <CommentRichContent
                html={comment.bodyHtml}
                clamped={shouldClamp && !isExpanded}
              />
            </div>

            {shouldClamp ? (
              <button
                type="button"
                className="interactive-tertiary type-body-md-medium text-label-secondary mt-[3px] inline-flex rounded-[3px]"
                onClick={() => setIsExpanded((currentState) => !currentState)}
              >
                {isExpanded ? "Свернуть" : "Читать дальше"}
              </button>
            ) : null}
          </>
        )}

      </div>

      {!isEditing ? (
        <div className="min-w-0">
          <CommentActions
            isReply={isReply}
            liked={comment.userVote === "up"}
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
                onRequireAuth();
                return;
              }

              setIsReplyComposerOpen((currentState) => !currentState);
            }}
            repliesToggleLabel={!isReply && comment.replyCount > 0
              ? (areRepliesVisible ? "Скрыть ответы" : formatReplyCount(comment.replyCount))
              : null}
            repliesToggleOpen={!isReply && areRepliesVisible}
            onRepliesToggle={!isReply && comment.replyCount > 0
              ? () => setAreRepliesVisible((currentState) => !currentState)
              : undefined}
          />
        </div>
      ) : null}

      {isReplyComposerOpen ? (
        <div className="min-w-0 pt-4">
          <CommentsComposer
            viewer={viewer}
            placeholder="Ответить..."
            submitLabel="Отправить"
            showInlineCancel
            submitDisabled={!canReplyToComment}
            editorDisabled={!isViewerAuthenticated}
            disabledReason={canReplyToComment ? null : postDisabledReason}
            compact
            autoFocus
            submitting={submittingTarget === comment.id}
            onCancel={() => setIsReplyComposerOpen(false)}
            onSubmit={(body) =>
              onSubmitReply(body, comment.id).then((result) => {
                if (result) {
                  setIsReplyComposerOpen(false);
                }

                return result;
              })
            }
          />
        </div>
      ) : null}
    </article>
  );

  if (isReply) {
    return commentContent;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {commentContent}

      {comment.replyCount > 0 ? (
        <CommentReplies
          isOpen={areRepliesVisible}
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
              onDeleteComment={onDeleteComment}
              onEditComment={onEditComment}
              onSubmitReply={onSubmitReply}
              onVote={onVote}
              onBlock={onBlock}
              onReport={onReport}
            />
          ))}
        </CommentReplies>
      ) : null}
    </div>
  );
}
