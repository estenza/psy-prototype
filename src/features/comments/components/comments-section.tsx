"use client";

import { useEffect, useState } from "react";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentsComposer } from "@/features/comments/components/comments-composer";
import { CommentsHeader } from "@/features/comments/components/comments-header";
import { CommentList } from "@/features/comments/components/comment-list";
import { useComments } from "@/features/comments/hooks/use-comments";

type CommentsSectionProps = {
  pageId: string;
  highlightedCommentId?: string | null;
};

function CommentsComposerSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3" aria-hidden="true">
      <div className="comment-editor-shell relative w-full overflow-hidden rounded-[16px]">
        <div className="flex min-h-[72px] flex-col gap-3 px-4 pb-2 pt-3">
          <div className="comment-skeleton h-6 w-40 rounded-full" />
          <div className="comment-skeleton h-5 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function CommentItemSkeleton() {
  return (
    <article className="flex gap-3" aria-hidden="true">
      <div className="comment-skeleton h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center gap-2">
          <div className="comment-skeleton h-5 w-28 rounded-full" />
          <div className="comment-skeleton h-4 w-20 rounded-full" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="comment-skeleton h-5 w-full rounded-full" />
          <div className="comment-skeleton h-5 w-[82%] rounded-full" />
          <div className="comment-skeleton h-5 w-[56%] rounded-full" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="comment-skeleton h-9 w-9 rounded-full" />
          <div className="comment-skeleton h-9 w-9 rounded-full" />
          <div className="comment-skeleton h-9 w-9 rounded-full" />
        </div>
      </div>
    </article>
  );
}

function CommentsListSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-1" aria-hidden="true">
      <CommentItemSkeleton />
      <CommentItemSkeleton />
      <CommentItemSkeleton />
    </div>
  );
}

export function CommentsSection({
  pageId,
  highlightedCommentId = null,
}: CommentsSectionProps) {
  const { isAuthenticated, openAuthModal, runIfAuthorized } = useAuthRequiredAction();
  const [activeHighlightedCommentId, setActiveHighlightedCommentId] = useState<string | null>(
    highlightedCommentId,
  );
  const {
    blockCommentAuthor,
    data,
    dismissFeedback,
    deleteComment,
    editComment,
    error,
    feedback,
    reportComment,
    setSort,
    sort,
    status,
    submitComment,
    submittingTarget,
    voteComment,
  } = useComments(pageId);
  const isInitialLoading = status === "loading" && !data;

  const canPost = data?.capabilities.canPost ?? false;
  const postDisabledReason = data?.capabilities.postDisabledReason ?? null;
  const viewerIsAuthenticated = data?.viewer.isAuthenticated ?? isAuthenticated;
  const submitDisabled = viewerIsAuthenticated ? !canPost : false;
  const composerDisabledReason = viewerIsAuthenticated ? postDisabledReason : null;

  useEffect(() => {
    setActiveHighlightedCommentId(highlightedCommentId);
  }, [highlightedCommentId]);

  useEffect(() => {
    if (!activeHighlightedCommentId || !data) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 8;
    let highlightTimeoutId: number | null = null;

    const scrollToHighlightedComment = () => {
      const commentElement = document.querySelector<HTMLElement>(
        `[data-comment-id="${activeHighlightedCommentId}"]`,
      );

      if (!commentElement) {
        attempts += 1;

        if (attempts < maxAttempts) {
          window.setTimeout(scrollToHighlightedComment, 150);
        }

        return;
      }

      commentElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      highlightTimeoutId = window.setTimeout(() => {
        setActiveHighlightedCommentId((currentValue) =>
          currentValue === activeHighlightedCommentId ? null : currentValue,
        );
      }, 2500);
    };

    scrollToHighlightedComment();

    return () => {
      if (highlightTimeoutId !== null) {
        window.clearTimeout(highlightTimeoutId);
      }
    };
  }, [activeHighlightedCommentId, data]);

  return (
    <section className="surface--default flex w-full flex-col gap-6">
      <div className="comments-top flex flex-col gap-4">
        <CommentsHeader
          totalCount={data?.totalCount ?? 0}
          sort={sort}
          onSortChange={setSort}
        />

        {isInitialLoading ? <CommentsComposerSkeleton /> : null}

        {data ? (
          <CommentsComposer
            viewer={data.viewer}
            placeholder="Введите комментарий..."
            submitLabel="Отправить"
            submitDisabled={submitDisabled}
            editorDisabled={submitDisabled}
            disabledReason={composerDisabledReason}
            submitting={submittingTarget === "root"}
            onSubmit={(body) =>
              runIfAuthorized(() => submitComment({ pageId, body })).then((result) =>
                typeof result === "boolean" ? result : false,
              )
            }
          />
        ) : null}

        {feedback ? (
          <button
            type="button"
            className={`type-caption-tight w-fit rounded-full px-3 py-1 ${
              feedback.kind === "error"
                ? "bg-[var(--color-danger-soft)] text-[var(--accent-like)]"
                : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
            }`.trim()}
            onClick={dismissFeedback}
          >
            {feedback.message}
          </button>
        ) : null}
      </div>

      <div className="comments flex flex-col gap-6">
        {isInitialLoading ? <CommentsListSkeleton /> : null}

        {data && data.comments.length > 0 ? (
          <CommentList
            comments={data.comments}
            viewer={data.viewer}
            canPostReply={data.capabilities.canReply}
            postDisabledReason={postDisabledReason}
            isViewerAuthenticated={viewerIsAuthenticated}
            onRequireAuth={openAuthModal}
            submittingTarget={submittingTarget}
            onSubmitReply={(body, parentId) =>
              runIfAuthorized(() =>
                submitComment({
                  pageId,
                  body,
                  parentId,
                }),
              ).then((result) => (typeof result === "boolean" ? result : false))
            }
            onDeleteComment={(commentId) =>
              runIfAuthorized(() => deleteComment(commentId)).then(() => undefined)
            }
            onEditComment={(commentId, body) =>
              runIfAuthorized(() => editComment(commentId, body)).then((result) =>
                typeof result === "boolean" ? result : false,
              )
            }
            onVote={(commentId, type) => {
              void runIfAuthorized(() => voteComment(commentId, type));
            }}
            onBlock={blockCommentAuthor}
            onReport={reportComment}
            highlightedCommentId={activeHighlightedCommentId}
          />
        ) : null}

        {data && data.comments.length === 0 && status === "ready" ? (
          <div className="border-separator rounded-[20px] border border-dashed px-4 py-5">
            <p className="type-body-md-medium text-label-primary">
              Пока нет комментариев
            </p>
            <p className="type-caption text-label-secondary mt-1">
              Станьте первым, кто откликнется на это обсуждение.
            </p>
          </div>
        ) : null}

        {error && status === "error" ? (
          <div className="border-separator rounded-[20px] border px-4 py-4">
            <p className="type-body-md-medium text-label-primary">
              Не удалось загрузить комментарии.
            </p>
            <p className="type-caption text-label-secondary mt-1">
              Комментарии временно недоступны. Попробуйте обновить страницу позже.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
