"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  CommentActionResult,
  CommentsResponsePayload,
  CommentsSectionData,
  CommentsSortValue,
  CreateCommentPayload,
  CreateCommentResult,
} from "@/features/comments/types";

type FeedbackState = {
  kind: "error" | "info" | "success";
  message: string;
};

async function readJsonResponse<T>(response: Response) {
  const payload = (await response.json()) as T & {
    error?: string;
  };

  return payload;
}

export function useComments(pageId: string) {
  const [sort, setSortValue] = useState<CommentsSortValue>("top");
  const [data, setData] = useState<CommentsSectionData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [submittingTarget, setSubmittingTarget] = useState<string | "root" | null>(
    null,
  );

  const loadComments = useCallback(
    async (nextSort: CommentsSortValue) => {
      setStatus((currentStatus) =>
        currentStatus === "ready" ? "ready" : "loading",
      );
      setError(null);

      const response = await fetch(
        `/api/comments?pageId=${encodeURIComponent(pageId)}&sort=${encodeURIComponent(nextSort)}`,
        {
          cache: "no-store",
        },
      );

      const payload = await readJsonResponse<CommentsResponsePayload>(response);

      if ("data" in payload && payload.data) {
        setData(payload.data);
      }

      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить комментарии.");
        setStatus("error");
        return;
      }

      setStatus("ready");
    },
    [pageId],
  );

  useEffect(() => {
    void loadComments(sort);
  }, [loadComments, pageId, sort]);

  async function submitComment({
    body,
    parentId = null,
  }: CreateCommentPayload) {
    setSubmittingTarget(parentId ?? "root");
    setFeedback(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId,
          body,
          parentId,
        }),
      });

      const payload = await readJsonResponse<CreateCommentResult>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось отправить комментарий.");
      }

      if (payload.moderationState === "pending") {
        setFeedback({
          kind: "info",
          message: "Комментарий отправлен на модерацию.",
        });
      } else {
        setFeedback(null);
      }

      await loadComments(sort);
      return true;
    } catch (submitError) {
      setFeedback({
        kind: "error",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Не удалось отправить комментарий.",
      });

      return false;
    } finally {
      setSubmittingTarget(null);
    }
  }

  async function voteComment(commentId: string, type: "up" | "down" | null) {
    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
        }),
      });

      const payload = await readJsonResponse<CommentActionResult>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось оценить комментарий.");
      }

      await loadComments(sort);
    } catch (actionError) {
      setFeedback({
        kind: "error",
        message:
          actionError instanceof Error
            ? actionError.message
            : "Не удалось оценить комментарий.",
      });
    }
  }

  async function reportComment(commentId: string) {
    try {
      const response = await fetch(`/api/comments/${commentId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: null,
        }),
      });

      const payload = await readJsonResponse<CommentActionResult>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось пожаловаться на комментарий.");
      }

      setFeedback({
        kind: "success",
        message: "Жалоба отправлена.",
      });
      await loadComments(sort);
    } catch (actionError) {
      setFeedback({
        kind: "error",
        message:
          actionError instanceof Error
            ? actionError.message
            : "Не удалось пожаловаться на комментарий.",
      });
    }
  }

  async function editComment(commentId: string, body: string) {
    setSubmittingTarget(commentId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
        }),
      });

      const payload = await readJsonResponse<CommentActionResult>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось обновить комментарий.");
      }

      await loadComments(sort);
      return true;
    } catch (actionError) {
      setFeedback({
        kind: "error",
        message:
          actionError instanceof Error
            ? actionError.message
            : "Не удалось обновить комментарий.",
      });

      return false;
    } finally {
      setSubmittingTarget(null);
    }
  }

  async function deleteComment(commentId: string) {
    setFeedback(null);

    if (!window.confirm("Удалить этот комментарий?")) {
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const payload = await readJsonResponse<CommentActionResult>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить комментарий.");
      }

      setFeedback({
        kind: "success",
        message: "Комментарий удалён.",
      });
      await loadComments(sort);
    } catch (actionError) {
      setFeedback({
        kind: "error",
        message:
          actionError instanceof Error
            ? actionError.message
            : "Не удалось удалить комментарий.",
      });
    }
  }

  function blockCommentAuthor(commentId: string) {
    void commentId;
    setFeedback({
      kind: "info",
      message:
        "Блокировка автора комментария пока не подключена в кастомном UI. Оставил действие видимым, но без backend-интеграции.",
    });
  }

  function setSort(nextSort: CommentsSortValue) {
    startTransition(() => {
      setSortValue(nextSort);
    });
  }

  function dismissFeedback() {
    setFeedback(null);
  }

  async function refresh() {
    await loadComments(sort);
  }

  return {
    blockCommentAuthor,
    data,
    deleteComment,
    dismissFeedback,
    editComment,
    error,
    feedback,
    refresh,
    reportComment,
    setSort,
    sort,
    status,
    submitComment,
    submittingTarget,
    voteComment,
  };
}
