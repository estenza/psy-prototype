"use client";

import Link from "next/link";
import type { KeyboardEvent, MouseEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";
import { CommentActions } from "@/features/comments/components/comment-actions";
import { CommentsComposer } from "@/features/comments/components/comments-composer";
import { CommentMoreMenu } from "@/features/comments/components/comment-more-menu";
import { CommentReplies } from "@/features/comments/components/comment-replies";
import { CommentRichContent } from "@/features/comments/components/comment-rich-content";
import {
  COMMENT_AVATAR_SIZE,
  COMMENT_BRANCH_ACCENT,
  COMMENT_BRANCH_ELBOW_RADIUS,
  COMMENT_BRANCH_REPLY_CENTER,
  COMMENT_BRANCH_X,
  CommentThreadElbow,
} from "@/features/comments/components/comment-thread-primitives";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import { formatReplyCount } from "@/features/comments/lib/comment-format";
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
  contextLink?: {
    href: string;
    label: string;
  } | null;
  flat?: boolean;
  showMenu?: boolean;
  showActions?: boolean;
  showAvatar?: boolean;
  bodySurface?: boolean;
  readOnlyLike?: boolean;
  showReplyAction?: boolean;
  highlightedCommentIds?: string[];
  onOpen?: () => void;
};

type CommentBranchGeometry = {
  targetCenters: number[];
  endOffset: number;
};

function CommentBranchLayer({
  targetCenters,
  endOffset,
  onToggle,
  expanded,
  branchHighlighted = false,
  onBranchHoverChange,
}: {
  targetCenters: number[];
  endOffset: number;
  onToggle: () => void;
  expanded: boolean;
  branchHighlighted?: boolean;
  onBranchHoverChange?: (hovered: boolean) => void;
}) {
  const lineTop = COMMENT_AVATAR_SIZE;
  const height = Math.max(lineTop, Math.round(endOffset));

  return (
    <div className="absolute left-0 top-0 z-10 w-12" style={{ height: `${height}px` }}>
      <button
        type="button"
        className="absolute inset-0 cursor-pointer rounded-none border-0 bg-transparent p-0"
        onClick={onToggle}
        onMouseEnter={() => onBranchHoverChange?.(true)}
        onMouseLeave={() => onBranchHoverChange?.(false)}
        onFocus={() => onBranchHoverChange?.(true)}
        onBlur={() => onBranchHoverChange?.(false)}
        aria-label={expanded ? "Свернуть ответы" : "Развернуть ответы"}
      >
        <span
          className="absolute w-px transition-colors"
          style={{
            left: `${COMMENT_BRANCH_X}px`,
            top: `${lineTop}px`,
            bottom: 0,
            backgroundColor: branchHighlighted ? COMMENT_BRANCH_ACCENT : "var(--separator-primary)",
          }}
        />
        {targetCenters.map((replyCenter) => (
          <CommentThreadElbow
            key={replyCenter}
            className="right-0"
            highlighted={branchHighlighted}
            style={{
              left: `${COMMENT_BRANCH_X}px`,
              top: `${replyCenter - COMMENT_BRANCH_ELBOW_RADIUS}px`,
              height: `${COMMENT_BRANCH_ELBOW_RADIUS}px`,
            }}
          />
        ))}
      </button>
    </div>
  );
}

function commentTreeContainsId(comment: CommentNode, targetCommentId: string): boolean {
  if (comment.id === targetCommentId) {
    return true;
  }

  return comment.replies.some((reply) => commentTreeContainsId(reply, targetCommentId));
}

export function shouldRenderCommentNode(comment: CommentNode): boolean {
  if (comment.status !== "deleted") {
    return true;
  }

  return comment.hasReplyContext || comment.replies.some(shouldRenderCommentNode);
}

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
  contextLink = null,
  flat = false,
  showMenu = true,
  showActions = true,
  showAvatar = true,
  bodySurface = false,
  readOnlyLike = false,
  showReplyAction = true,
  highlightedCommentIds = [],
  onOpen,
}: CommentItemProps) {
  const renderableReplies = comment.replies.filter(shouldRenderCommentNode);
  const highlightedReplyIndex = highlightedCommentIds.length > 0
    ? renderableReplies.findIndex((reply) =>
        highlightedCommentIds.some((commentId) => commentTreeContainsId(reply, commentId)),
      )
    : -1;
  const [isEditing, setIsEditing] = useState(false);
  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [areRepliesCollapsed, setAreRepliesCollapsed] = useState(false);
  const [areExtraRepliesVisible, setAreExtraRepliesVisible] = useState(highlightedReplyIndex >= 3);
  const [isRepliesBranchHovered, setIsRepliesBranchHovered] = useState(false);
  const [branchGeometry, setBranchGeometry] = useState<CommentBranchGeometry>({
    targetCenters: [],
    endOffset: COMMENT_AVATAR_SIZE,
  });
  const articleRef = useRef<HTMLElement | null>(null);
  const replyAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hiddenRepliesButtonRef = useRef<HTMLButtonElement | null>(null);
  const collapsedRepliesButtonRef = useRef<HTMLButtonElement | null>(null);
  const canLike = isViewerAuthenticated
    ? comment.capabilities.canVote
    : true;
  const isDeleted = comment.status === "deleted";
  const canReplyToComment = canPostReply && comment.capabilities.canReply;
  const canStartReply = isViewerAuthenticated ? canReplyToComment : true;
  const profileHref = buildPublicProfilePathFromHandle(comment.author.handle);
  const hasReplies = !flat && renderableReplies.length > 0;
  const visibleReplies = areExtraRepliesVisible ? renderableReplies : renderableReplies.slice(0, 3);
  const hiddenRepliesCount = Math.max(renderableReplies.length - visibleReplies.length, 0);
  const hasHiddenReplies = hiddenRepliesCount > 0;
  const isHighlighted = highlightedCommentIds.includes(comment.id);
  const bodySurfaceClassName = showAvatar
    ? "surface-card feed-card-surface relative w-fit max-w-[calc(100%-3rem)] flex-none rounded-[28px] pl-4 pr-6 py-4 group-hover:bg-[color-mix(in_oklab,var(--background-elevated)_96%,var(--default))]"
    : "surface-card feed-card-surface relative w-full rounded-[28px] px-4 py-4 group-hover:bg-[color-mix(in_oklab,var(--background-elevated)_96%,var(--default))] min-[481px]:px-5 min-[481px]:px-6";

  function shouldIgnoreOpenEvent(target: EventTarget | null) {
    return target instanceof Element
      && Boolean(target.closest("a, button, input, textarea, [role='button']"));
  }

  function handleOpen(event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
    if (!onOpen || shouldIgnoreOpenEvent(event.target)) {
      return;
    }

    onOpen();
  }

  const collapseReplies = () => {
    setIsRepliesBranchHovered(false);
    setAreRepliesCollapsed(true);
  };

  const expandReplies = () => {
    setAreRepliesCollapsed(false);
  };

  useLayoutEffect(() => {
    if (!hasReplies || !articleRef.current) {
      return;
    }

    const updateBranchGeometry = () => {
      if (!articleRef.current) {
        return;
      }

      const articleRect = articleRef.current.getBoundingClientRect();

      const nextReplyCenters = areRepliesCollapsed
        ? (() => {
            if (!collapsedRepliesButtonRef.current) {
              return [];
            }

            const buttonRect = collapsedRepliesButtonRef.current.getBoundingClientRect();
            return [Math.round(buttonRect.top - articleRect.top + buttonRect.height / 2)];
          })()
        : replyAnchorRefs.current
            .slice(0, visibleReplies.length)
            .map((anchor) => {
              if (!anchor) {
                return null;
              }

              const anchorRect = anchor.getBoundingClientRect();
              return Math.round(anchorRect.top - articleRect.top + COMMENT_BRANCH_REPLY_CENTER);
            })
            .filter((center): center is number => center !== null);

      if (!areRepliesCollapsed && hasHiddenReplies && hiddenRepliesButtonRef.current) {
        const buttonRect = hiddenRepliesButtonRef.current.getBoundingClientRect();
        nextReplyCenters.push(
          Math.round(buttonRect.top - articleRect.top + buttonRect.height / 2),
        );
      }

      const nextEndOffset =
        (nextReplyCenters.at(-1) ?? COMMENT_AVATAR_SIZE) - COMMENT_BRANCH_ELBOW_RADIUS;

      setBranchGeometry((currentGeometry) => {
        const hasSameCenters =
          currentGeometry.targetCenters.length === nextReplyCenters.length
          && currentGeometry.targetCenters.every(
            (currentCenter, index) => currentCenter === nextReplyCenters[index],
          );

        if (currentGeometry.endOffset === nextEndOffset && hasSameCenters) {
          return currentGeometry;
        }

        return {
          targetCenters: nextReplyCenters,
          endOffset: nextEndOffset,
        };
      });
    };

    updateBranchGeometry();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateBranchGeometry())
      : null;

    if (resizeObserver) {
      resizeObserver.observe(articleRef.current);
      if (areRepliesCollapsed && collapsedRepliesButtonRef.current) {
        resizeObserver.observe(collapsedRepliesButtonRef.current);
      }
      replyAnchorRefs.current.forEach((anchor) => {
        if (anchor) {
          resizeObserver.observe(anchor);
        }
      });
      if (hasHiddenReplies && hiddenRepliesButtonRef.current) {
        resizeObserver.observe(hiddenRepliesButtonRef.current);
      }
    } else {
      window.addEventListener("resize", updateBranchGeometry);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", updateBranchGeometry);
      }
    };
  }, [hasReplies, areRepliesCollapsed, visibleReplies.length, hasHiddenReplies]);

  if (!shouldRenderCommentNode(comment)) {
    return null;
  }

  return (
    <article
      ref={articleRef}
      data-comment-id={comment.id}
      className={`relative flex min-w-0 ${
        bodySurface
          ? (showAvatar ? "inline-flex max-w-full w-auto items-end gap-3" : "w-full")
          : ""
      } ${
        onOpen ? "group cursor-pointer" : ""
      }`.trim()}
    >
      {hasReplies ? (
        <CommentBranchLayer
          targetCenters={branchGeometry.targetCenters}
          endOffset={branchGeometry.endOffset}
          onToggle={areRepliesCollapsed ? expandReplies : collapseReplies}
          expanded={!areRepliesCollapsed}
          branchHighlighted={isRepliesBranchHovered}
          onBranchHoverChange={setIsRepliesBranchHovered}
        />
      ) : null}

      {showAvatar ? (
        <div
          className={`flex w-9 shrink-0 flex-col items-center ${
            bodySurface ? "self-end" : "self-stretch"
          }`.trim()}
          style={bodySurface ? { justifyContent: "flex-end" } : undefined}
        >
          <UserAvatarAction
            avatarUrl={comment.author.avatarUrl}
            fallbackText={comment.author.initials}
            name={comment.author.name}
            showStatusDot={comment.author.role === "specialist"}
            size="comment-md"
            href={profileHref ?? null}
            ariaLabel={`Открыть профиль ${comment.author.name}`}
          />
        </div>
      ) : null}

      <div
        className={`flex min-w-0 flex-1 flex-col ${
          bodySurface ? bodySurfaceClassName : (showAvatar ? "pl-3" : "")
        }`.trim()}
        onClick={onOpen ? handleOpen : undefined}
        onKeyDown={onOpen
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();
              handleOpen(event);
            }
          : undefined}
        role={onOpen ? "link" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? "Открыть пост с этим ответом" : undefined}
        style={isHighlighted
          ? {
              backgroundColor: "rgba(59, 130, 246, 0.14)",
              borderRadius: "16px",
            }
          : undefined}
      >
        {contextLink ? (
          <div className="min-w-0 pb-1 pl-1">
            <Link
              href={contextLink.href}
              className="block max-w-full truncate rounded-none p-0 text-[14px] leading-5 font-normal text-[var(--accent-primary)] no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--accent-primary)] decoration-[1.5px] underline-offset-4"
            >
              {contextLink.label}
            </Link>
          </div>
        ) : null}

        <div className="flex min-w-0 items-center gap-2 pl-1">
          <div className="flex min-w-0 flex-1 items-center">
            {isDeleted ? (
              <div className="flex min-h-10 min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[14px] leading-5 font-normal text-[var(--label-tertiary)]">
                  Ответ удален автором
                </span>
                <span aria-hidden="true" className="text-[14px] leading-5 text-[var(--label-tertiary)]">•</span>
                <span className="flex items-center text-[14px] leading-5 text-[var(--label-tertiary)]">
                  <span className="min-[480px]:hidden">
                    {comment.deletedCompactRelativeDate ?? comment.compactRelativeDate}
                  </span>
                  <span className="hidden min-[480px]:inline">
                    {comment.deletedRelativeDate ?? comment.relativeDate}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="rounded-none p-0 text-[14px] leading-5 font-medium text-[var(--label-primary)] no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[1.5px] underline-offset-4"
                  >
                    {comment.author.name}
                  </Link>
                ) : (
                  <span className="text-[14px] leading-5 font-medium text-[var(--label-primary)]">
                    {comment.author.name}
                  </span>
                )}
                <span className="min-w-0 truncate text-[14px] leading-5 text-[var(--label-tertiary)]">
                  {comment.author.handle}
                </span>
                <span aria-hidden="true" className="text-[14px] leading-5 text-[var(--label-tertiary)]">•</span>
                <span className="flex items-center text-[14px] leading-5 text-[var(--label-tertiary)]">
                  <span className="min-[480px]:hidden">{comment.compactRelativeDate}</span>
                  <span className="hidden min-[480px]:inline">{comment.relativeDate}</span>
                </span>
              </div>
            )}
          </div>

          {!isEditing && showMenu && !isDeleted ? (
            <div className="shrink-0">
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

        <div className={`min-w-0 pl-1 ${isDeleted ? "py-0" : "pt-1 pb-3"}`.trim()}>
          {isEditing ? (
            <CommentsComposer
              viewer={viewer}
              placeholder="Обновить комментарий..."
              submitLabel="Сохранить"
              initialValue={comment.bodyHtml}
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
          ) : (
            !isDeleted ? (
              <div className="min-w-0">
                <CommentRichContent html={comment.bodyHtml} />
              </div>
            ) : null
          )}
        </div>

        {!isEditing && showActions && !isDeleted ? (
          <CommentActions
            isReply={isReply}
            liked={comment.userVote === "up"}
            likeCount={comment.upvotes}
            canLike={canLike}
            canReply={flat ? false : canStartReply}
            readOnlyLike={readOnlyLike}
            showReplyAction={showReplyAction}
            onLike={() => {
              if (!isViewerAuthenticated) {
                onRequireAuth();
                return;
              }

              onVote(comment.id, comment.userVote === "up" ? null : "up");
            }}
            onReply={() => {
              if (flat) {
                return;
              }

              if (!isViewerAuthenticated) {
                onRequireAuth();
                return;
              }

              setIsReplyComposerOpen((currentState) => !currentState);
            }}
          />
        ) : null}

        {isReplyComposerOpen ? (
          <div className="min-w-0 pt-5">
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

        {hasReplies && areRepliesCollapsed ? (
          <div className="min-w-0 pt-5">
            <button
              ref={collapsedRepliesButtonRef}
              type="button"
              className="w-fit rounded-full pl-1 text-[14px] leading-5 font-medium text-[var(--accent-primary)] transition-colors hover:text-[var(--accent-primary)]"
              onClick={expandReplies}
            >
              {formatReplyCount(renderableReplies.length)}
            </button>
          </div>
        ) : null}

        {hasReplies && !areRepliesCollapsed ? (
          <div className="min-w-0 pt-5">
            <CommentReplies isOpen>
              {visibleReplies.map((reply, index) => (
                <div
                  key={reply.id}
                  ref={(node) => {
                    replyAnchorRefs.current[index] = node;
                  }}
                  className="min-w-0"
                >
                  <CommentItem
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
                    highlightedCommentIds={highlightedCommentIds}
                  />
                </div>
              ))}
              {hasHiddenReplies ? (
                <button
                  ref={hiddenRepliesButtonRef}
                  type="button"
                  className="w-fit rounded-full pl-1 text-[14px] leading-5 font-medium text-[var(--accent-primary)] transition-colors hover:text-[var(--accent-primary)]"
                  onClick={() => setAreExtraRepliesVisible(true)}
                >
                  {`Еще ${formatReplyCount(hiddenRepliesCount)}`}
                </button>
              ) : null}
            </CommentReplies>
          </div>
        ) : null}
      </div>
    </article>
  );
}
