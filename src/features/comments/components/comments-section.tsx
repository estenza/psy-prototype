"use client";

import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentsComposer } from "@/features/comments/components/comments-composer";
import { CommentsHeader } from "@/features/comments/components/comments-header";
import { CommentList } from "@/features/comments/components/comment-list";
import { useComments } from "@/features/comments/hooks/use-comments";

type CommentsSectionProps = {
  pageId: string;
};

export function CommentsSection({ pageId }: CommentsSectionProps) {
  const { isAuthenticated, openAuthModal, runIfAuthorized } = useAuthRequiredAction();
  const {
    blockCommentAuthor,
    data,
    dismissFeedback,
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

  const canPost = data?.capabilities.canPost ?? false;
  const postDisabledReason = data?.capabilities.postDisabledReason ?? null;
  const viewerIsAuthenticated = data?.viewer.isAuthenticated ?? isAuthenticated;
  const submitDisabled = viewerIsAuthenticated ? !canPost : false;
  const composerDisabledReason = viewerIsAuthenticated ? postDisabledReason : null;

  return (
    <section className="flex w-full flex-col gap-5">
      <CommentsHeader
        totalCount={data?.totalCount ?? 0}
        sort={sort}
        onSortChange={setSort}
      />

      {data ? (
        <CommentsComposer
          viewer={data.viewer}
          placeholder="Введите комментарий..."
          submitLabel="Комментировать"
          submitDisabled={submitDisabled}
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
          className={`w-fit rounded-full px-3 py-1 text-[12px] leading-4 ${
            feedback.kind === "error"
              ? "bg-[color-mix(in_srgb,var(--accent-like)_12%,transparent)] text-[var(--accent-like)]"
              : "bg-[var(--fill-quaternary)] text-[var(--label-secondary)]"
          }`.trim()}
          onClick={dismissFeedback}
        >
          {feedback.message}
        </button>
      ) : null}

      {status === "loading" ? (
        <div className="flex flex-col gap-4 py-3">
          <div className="comment-skeleton h-6 w-40 rounded-full" />
          <div className="comment-skeleton h-[88px] w-full rounded-[16px]" />
          <div className="comment-skeleton h-24 w-full rounded-[20px]" />
        </div>
      ) : null}

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
          onVote={(commentId, type) => {
            void runIfAuthorized(() => voteComment(commentId, type));
          }}
          onBlock={blockCommentAuthor}
          onReport={reportComment}
        />
      ) : null}

      {data && data.comments.length === 0 && status === "ready" ? (
        <div className="border-separator rounded-[20px] border border-dashed px-4 py-5">
          <p className="text-label-primary text-[14px] font-medium leading-5">
            Пока нет комментариев
          </p>
          <p className="text-label-secondary mt-1 text-[13px] leading-5">
            Станьте первым, кто откликнется на это обсуждение.
          </p>
        </div>
      ) : null}

      {error && status === "error" ? (
        <div className="border-separator rounded-[20px] border px-4 py-4">
          <p className="text-label-primary text-[14px] font-medium leading-5">
            Не удалось загрузить комментарии из Hyvor Talk.
          </p>
          <p className="text-label-secondary mt-1 text-[13px] leading-5">
            {error}
          </p>
        </div>
      ) : null}
    </section>
  );
}
