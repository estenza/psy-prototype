"use client";

import type { SortDescriptor } from "@heroui/react";
import { Drawer, EmptyState, Spinner, Table } from "@heroui/react";
import Link from "next/link";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { DrawerNavigationProvider } from "@/components/ui/drawer-navigation-context";
import { ArrowLeftIcon, ChevronDownIcon, CloseIcon } from "@/components/ui/icons";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import { CommentsSection } from "@/features/comments/components/comments-section";
import type {
  AdminCommentStatus,
  AdminCommentTimelineItem,
} from "@/features/comments/types";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import { getPostBodyText } from "@/features/feed/lib/post-detail";
import { normalizePostDates } from "@/features/feed/lib/post-normalization";
import type { Post, PostMutationResponse } from "@/features/feed/types";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeStyle: "short",
});

const COMMENT_STATUS_LABELS: Record<AdminCommentStatus, string> = {
  deleted: "Удален",
  hidden: "Скрыт",
  pending: "Ожидает",
  published: "Опубликован",
};

type CommentColumnKey =
  | "activity"
  | "author"
  | "body"
  | "createdAt"
  | "post"
  | "reports"
  | "status";

const COMMENT_COLUMNS = [
  { key: "createdAt", label: "Дата", allowsSorting: true },
  { key: "author", label: "Автор", allowsSorting: true },
  { key: "post", label: "Пост", allowsSorting: true },
  { key: "body", label: "Комментарий", allowsSorting: false },
  { key: "activity", label: "Событие", allowsSorting: true },
  { key: "reports", label: "Репорты", allowsSorting: true },
] as const;

type CommentColumn = (typeof COMMENT_COLUMNS)[number];

type CommentPostPreviewTarget = {
  highlightedCommentId?: string | null;
  postId: string;
  title: string;
};

function EmptyTableStateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 text-[var(--label-tertiary)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v5A2.5 2.5 0 0 1 16.5 15H12l-4 3v-3h-.5A2.5 2.5 0 0 1 5 12.5v-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortColumnLabel({
  column,
  sortDescriptor,
}: {
  column: CommentColumn;
  sortDescriptor: SortDescriptor;
}) {
  const isActive = sortDescriptor.column === column.key;

  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="min-w-0 truncate">{column.label}</span>
      {column.allowsSorting ? (
        <span
          className={`flex h-3 w-3 flex-none items-center justify-center text-[var(--label-tertiary)] transition-opacity ${
            isActive ? "opacity-100" : "opacity-0"
          } ${
            isActive && sortDescriptor.direction === "ascending" ? "rotate-180" : ""
          }`.trim()}
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      ) : null}
    </span>
  );
}

function UserCell({
  onOpenProfile,
  user,
}: {
  onOpenProfile: (user: AdminCommentTimelineItem["author"]) => void;
  user: AdminCommentTimelineItem["author"];
}) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="block max-w-full truncate rounded-none p-0 text-left text-[var(--label-primary)] transition-colors hover:text-[var(--accent-primary)]"
        onClick={(event) => {
          event.stopPropagation();
          onOpenProfile(user);
        }}
      >
        {user.name}
      </button>
      <div className="truncate text-[var(--label-tertiary)]">{user.handle}</div>
    </div>
  );
}

function getCommentBody(comment: AdminCommentTimelineItem) {
  const bodyText = comment.bodyText.replace(/\s+/g, " ").trim();

  if (bodyText) {
    return bodyText;
  }

  return comment.status === "deleted" ? "Текст не сохранен" : "Без текста";
}

function getActivityLabel(comment: AdminCommentTimelineItem) {
  if (comment.deletedAt) {
    return comment.deletedByModerator ? "Удален модератором" : "Удален пользователем";
  }

  if (comment.hiddenAt) {
    return "Скрыт модератором";
  }

  if (comment.editedAt) {
    return "Изменен";
  }

  return "Создан";
}

function getActivityDate(comment: AdminCommentTimelineItem) {
  return comment.deletedAt ?? comment.hiddenAt ?? comment.editedAt ?? comment.createdAt;
}

function getActivityLabelClassName(comment: AdminCommentTimelineItem) {
  if (comment.deletedAt && comment.deletedByModerator) {
    return "text-[#f59e0b]";
  }

  if (comment.deletedAt) {
    return "text-[var(--danger)]";
  }

  if (!comment.hiddenAt && !comment.editedAt) {
    return "text-[#0f9f5f]";
  }

  return "text-[var(--label-primary)]";
}

function ActivityIcon({ comment }: { comment: AdminCommentTimelineItem }) {
  if (comment.deletedAt && comment.deletedByModerator) {
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4 flex-none"
        fill="none"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 1.25A6.75 6.75 0 1 1 8 14.75 6.75 6.75 0 0 1 8 1.25Zm-3.145 10.954A5.224 5.224 0 0 0 8 13.25 5.25 5.25 0 0 0 13.25 8a5.224 5.224 0 0 0-1.046-3.145l-7.349 7.349ZM8 2.75A5.25 5.25 0 0 0 2.75 8c0 1.179.389 2.267 1.045 3.144l7.349-7.349A5.224 5.224 0 0 0 8 2.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (comment.deletedAt) {
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4 flex-none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6.25 6.5c.414 0 .75.336.75.75v3a.75.75 0 0 1-1.5 0v-3c0-.414.336-.75.75-.75ZM9.75 6.5c.414 0 .75.336.75.75v3a.75.75 0 0 1-1.5 0v-3c0-.414.336-.75.75-.75Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 1.25c.967 0 1.75.784 1.75 1.75v.25H14a.75.75 0 0 1 0 1.5h-.25v7.1a2.9 2.9 0 0 1-2.9 2.9h-5.7a2.9 2.9 0 0 1-2.9-2.9v-7.1H2a.75.75 0 0 1 0-1.5h3.25V3c0-.966.784-1.75 1.75-1.75h2Zm-5.25 10.6c0 .773.627 1.4 1.4 1.4h5.7c.773 0 1.4-.627 1.4-1.4v-7.1h-8.5v7.1Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (!comment.hiddenAt && !comment.editedAt) {
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4 flex-none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12.803 3.47a.75.75 0 0 1 1.06 1.06l-7.333 7.334a.75.75 0 0 1-1.061 0L2.136 8.53a.75.75 0 0 1 1.06-1.06L6 10.273l6.803-6.803Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return null;
}

function getSortableValue(comment: AdminCommentTimelineItem, column: CommentColumnKey) {
  switch (column) {
    case "activity":
      return new Date(getActivityDate(comment)).getTime();
    case "author":
      return `${comment.author.name} ${comment.author.handle}`;
    case "createdAt":
      return new Date(comment.createdAt).getTime();
    case "post":
      return comment.postTitle;
    case "reports":
      return comment.uncheckedReportsCount;
    case "status":
      return COMMENT_STATUS_LABELS[comment.status];
    case "body":
    default:
      return "";
  }
}

function shouldIgnoreCommentRowOpen(target: EventTarget | null) {
  return (
    target instanceof Element
    && Boolean(target.closest("a, button, input, textarea, select, [role='button'], [role='menuitem']"))
  );
}

function ProfilePreviewDrawer({
  onOpenChange,
  user,
}: {
  onOpenChange: (isOpen: boolean) => void;
  user: AdminCommentTimelineItem["author"] | null;
}) {
  const isOpen = Boolean(user);
  const profileHref = user ? buildPublicProfilePathFromHandle(user.handle) : null;

  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop variant="transparent" isDismissable>
        <Drawer.Content placement="right" className="z-[360]">
          <Drawer.Dialog
            aria-label="Превью профиля"
            className="admin-report-preview-drawer !w-[min(720px,calc(100vw-32px))] !max-w-[calc(100vw-32px)] p-0"
          >
            <Drawer.Header className="border-separator border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Drawer.Heading className="type-h3 font-bold text-[var(--label-primary)]">
                    Превью профиля
                  </Drawer.Heading>
                  {user ? (
                    <p className="mt-1 truncate text-[14px] leading-5 text-[var(--label-secondary)]">
                      {user.name} · {user.handle}
                    </p>
                  ) : null}
                </div>

                <Drawer.CloseTrigger
                  aria-label="Закрыть"
                  className={buttonClassName({
                    className: "flex-none text-[var(--label-primary)]",
                    isIconOnly: true,
                    size: "sm",
                    variant: "quaternary",
                  })}
                >
                  <CloseIcon />
                </Drawer.CloseTrigger>
              </div>
            </Drawer.Header>

            <Drawer.Body className="surface-elevated m-0 p-0 text-[var(--label-primary)]">
              {profileHref ? (
                <iframe
                  src={profileHref}
                  title={`Профиль ${user?.name ?? ""}`}
                  className="h-[calc(100dvh-80px)] min-h-[560px] w-full border-0"
                />
              ) : (
                <div className="px-5 py-6">
                  <div className="feedback-critical-surface rounded-2xl px-4 py-3 text-[14px] leading-5">
                    Не удалось открыть профиль пользователя.
                  </div>
                </div>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

type CommentDrawerNestedView =
  | {
      href: string;
      title: string;
      type: "profile";
    }
  | {
      highlightedCommentId?: string | null;
      postId: string;
      title: string;
      type: "post";
    };

const ADMIN_DRAWER_NON_PROFILE_SEGMENTS = new Set([
  "access",
  "admin",
  "api",
  "auth",
  "bookmarks",
  "complete-profile",
  "create-topic",
  "drafts",
  "favicon.ico",
  "forgot-password",
  "posts",
  "reset-password",
  "robots.txt",
  "search",
  "settings",
  "sign-in",
  "sign-up",
  "sitemap.xml",
]);

function resolveCommentDrawerHref(
  href: string,
  label?: string | null,
): CommentDrawerNestedView | null {
  let url: URL;

  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) {
    return null;
  }

  const postMatch = url.pathname.match(/^\/posts\/([^/]+)\/?$/);

  if (postMatch?.[1]) {
    return {
      postId: decodeURIComponent(postMatch[1]),
      title: label?.trim() || "Превью поста",
      type: "post",
    };
  }

  if (url.pathname === "/profile") {
    return {
      href: `${url.pathname}${url.search}${url.hash}`,
      title: label?.trim() || "Профиль",
      type: "profile",
    };
  }

  const pathSegments = url.pathname.split("/").filter(Boolean);

  if (
    pathSegments.length === 1
    && !ADMIN_DRAWER_NON_PROFILE_SEGMENTS.has(pathSegments[0])
  ) {
    return {
      href: `${url.pathname}${url.search}${url.hash}`,
      title: label?.trim() || "Профиль",
      type: "profile",
    };
  }

  return null;
}

function getClickedAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLAnchorElement>("a[href]");
}

function PostPreviewPanel({
  onNavigateHref,
  target,
}: {
  onNavigateHref: (href: string, label?: string | null) => boolean;
  target: CommentPostPreviewTarget;
}) {
  const [loadedPreview, setLoadedPreview] = useState<{
    errorMessage: string | null;
    post: Post | null;
    postId: string;
    status: "ready" | "error";
  } | null>(null);
  const requestedPostId = target.postId;
  const status =
    loadedPreview?.postId === requestedPostId
      ? loadedPreview.status
      : "loading";
  const post =
    status === "ready" && loadedPreview?.postId === requestedPostId
      ? loadedPreview.post
      : null;
  const errorMessage =
    loadedPreview?.postId === requestedPostId ? loadedPreview.errorMessage : null;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/posts/${requestedPostId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as (
          PostMutationResponse & { error?: string }
        ) | null;

        if (!response.ok || !payload?.post) {
          throw new Error(payload?.error ?? "Не удалось загрузить пост.");
        }

        setLoadedPreview({
          errorMessage: null,
          post: normalizePostDates(payload.post),
          postId: requestedPostId,
          status: "ready",
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoadedPreview({
          errorMessage:
            error instanceof Error ? error.message : "Не удалось загрузить пост.",
          post: null,
          postId: requestedPostId,
          status: "error",
        });
      });

    return () => {
      controller.abort();
    };
  }, [requestedPostId]);

  const detailedPost = post
    ? {
        ...post,
        content: {
          ...post.content,
          excerpt: getPostBodyText(post),
        },
      }
    : null;
  const highlightedCommentIds = target?.highlightedCommentId
    ? [target.highlightedCommentId]
    : [];
  const previewKey = `${target.postId}:${target.highlightedCommentId ?? "post"}`;
  const noopToggleBookmark = () => undefined;
  const noopToggleLike = () => undefined;
  const noopPostMenuAction = () => undefined;

  function handleLinkClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented) {
      return;
    }

    const anchor = getClickedAnchor(event.target);

    if (!anchor) {
      return;
    }

    if (!onNavigateHref(anchor.href, anchor.textContent)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div onClickCapture={handleLinkClickCapture}>
      {status === "loading" ? (
        <div className="flex min-h-[280px] items-center justify-center text-[var(--label-secondary)]">
          <Spinner size="sm" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="px-5 py-6">
          <div className="feedback-critical-surface rounded-2xl px-4 py-3 text-[14px] leading-5">
            {errorMessage ?? "Не удалось загрузить пост."}
          </div>
        </div>
      ) : null}

      {detailedPost ? (
        <div key={previewKey} className="flex flex-col gap-3 px-5 py-5">
          <section className="surface-card rounded-[24px] px-4 py-4">
            <CardPostItem
              post={detailedPost}
              blockPointerEvents={false}
              showActions={false}
              showReadOnlyLikeCounter
              showMenu
              onToggleBookmark={noopToggleBookmark}
              onToggleLike={noopToggleLike}
              onPostMenuAction={noopPostMenuAction}
            />
          </section>

          <div className="border-separator border-t" aria-hidden="true" />

          <section className="surface-card rounded-[24px] px-4 py-4">
            <CommentsSection
              key={previewKey}
              pageId={`post:${detailedPost.id}`}
              highlightedCommentIds={highlightedCommentIds}
              readOnly
              showReadOnlyActions
              showReadOnlyMenu
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function NestedProfilePreview({
  view,
}: {
  view: Extract<CommentDrawerNestedView, { type: "profile" }>;
}) {
  const profilePreviewHref = useMemo(() => {
    try {
      const url = new URL(view.href, window.location.origin);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      const nickname = pathSegments.length === 1 ? pathSegments[0] : null;

      if (!nickname) {
        return view.href;
      }

      return `/admin/profile-preview/${encodeURIComponent(nickname)}${url.search}${url.hash}`;
    } catch {
      return view.href;
    }
  }, [view.href]);

  return (
    <iframe
      src={profilePreviewHref}
      title={view.title}
      className="h-[calc(100dvh-80px)] min-h-[560px] w-full border-0"
    />
  );
}

function CommentPostPreviewDrawer({
  onOpenChange,
  target,
}: {
  onOpenChange: (isOpen: boolean) => void;
  target: CommentPostPreviewTarget | null;
}) {
  const [nestedViews, setNestedViews] = useState<CommentDrawerNestedView[]>([]);
  const isOpen = Boolean(target);
  const nestedView = nestedViews.at(-1) ?? null;
  const activePostTarget =
    nestedView?.type === "post"
      ? {
          highlightedCommentId: nestedView.highlightedCommentId,
          postId: nestedView.postId,
          title: nestedView.title,
        }
      : target;
  const headerTitle =
    nestedView?.type === "profile" ? "Превью профиля" : "Превью поста";
  const headerSubtitle = nestedView?.title ?? target?.title ?? null;

  function openDrawerHref(href: string, label?: string | null) {
    const nextView = resolveCommentDrawerHref(href, label);

    if (!nextView) {
      return false;
    }

    setNestedViews((currentViews) => [...currentViews, nextView]);
    return true;
  }

  const drawerNavigationValue = useMemo(
    () => ({
      openHref: openDrawerHref,
    }),
    [],
  );

  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop variant="transparent" isDismissable>
        <Drawer.Content placement="right" className="z-[360]">
          <Drawer.Dialog
            aria-label="Превью поста"
            className="admin-report-preview-drawer !w-[min(720px,calc(100vw-32px))] !max-w-[calc(100vw-32px)] p-0"
          >
            <Drawer.Header className="border-separator border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {nestedView ? (
                    <button
                      type="button"
                      className="interactive-quaternary mt-0.5 inline-flex h-9 flex-none items-center gap-1 rounded-full px-3 text-[14px] font-medium text-[var(--label-primary)]"
                      onClick={() => {
                        setNestedViews((currentViews) => currentViews.slice(0, -1));
                      }}
                    >
                      <ArrowLeftIcon />
                      Назад
                    </button>
                  ) : null}

                  <div className="min-w-0">
                    <Drawer.Heading className="type-h3 font-bold text-[var(--label-primary)]">
                      {headerTitle}
                    </Drawer.Heading>
                    {headerSubtitle ? (
                      <p className="mt-1 truncate text-[14px] leading-5 text-[var(--label-secondary)]">
                        {headerSubtitle}
                      </p>
                    ) : null}
                  </div>
                </div>

                <Drawer.CloseTrigger
                  aria-label="Закрыть"
                  className={buttonClassName({
                    className: "flex-none text-[var(--label-primary)]",
                    isIconOnly: true,
                    size: "sm",
                    variant: "quaternary",
                  })}
                >
                  <CloseIcon />
                </Drawer.CloseTrigger>
              </div>
            </Drawer.Header>

            <Drawer.Body className="surface-elevated m-0 p-0 text-[var(--label-primary)]">
              <DrawerNavigationProvider value={drawerNavigationValue}>
                {nestedView?.type === "profile" ? (
                  <NestedProfilePreview view={nestedView} />
                ) : activePostTarget ? (
                  <PostPreviewPanel
                    target={activePostTarget}
                    onNavigateHref={openDrawerHref}
                  />
                ) : null}
              </DrawerNavigationProvider>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

export function AdminCommentsTable({
  comments,
}: {
  comments: AdminCommentTimelineItem[];
}) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });
  const [profilePreviewUser, setProfilePreviewUser] = useState<
    AdminCommentTimelineItem["author"] | null
  >(null);
  const [postPreviewTarget, setPostPreviewTarget] =
    useState<CommentPostPreviewTarget | null>(null);
  const sortedComments = useMemo(() => {
    const column = sortDescriptor.column as CommentColumnKey | undefined;

    if (!column) {
      return comments;
    }

    return [...comments].sort((leftComment, rightComment) => {
      const leftValue = getSortableValue(leftComment, column);
      const rightValue = getSortableValue(rightComment, column);
      const direction = sortDescriptor.direction === "ascending" ? 1 : -1;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue), "ru") * direction;
    });
  }, [comments, sortDescriptor]);

  function openPostPreview(comment: AdminCommentTimelineItem, highlighted = false) {
    setPostPreviewTarget({
      highlightedCommentId: highlighted ? comment.id : null,
      postId: comment.postId,
      title: comment.postTitle,
    });
  }

  return (
    <>
      <Table className="admin-reports-table">
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Хронология комментариев"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              {COMMENT_COLUMNS.map((column) => (
                <Table.Column
                  key={column.key}
                  id={column.key}
                  allowsSorting={column.allowsSorting}
                  isRowHeader={column.key === "createdAt"}
                >
                  <SortColumnLabel column={column} sortDescriptor={sortDescriptor} />
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="py-16">
                  <div className="flex flex-col items-center justify-center gap-4 text-center text-[var(--label-secondary)]">
                    <EmptyTableStateIcon />
                    <div className="text-[16px] leading-7">Комментариев пока нет</div>
                  </div>
                </EmptyState>
              )}
            >
              {sortedComments.map((comment) => {
                const createdAt = new Date(comment.createdAt);
                const activityDate = new Date(getActivityDate(comment));

                return (
                  <Table.Row
                    key={comment.id}
                    id={comment.id}
                    className="cursor-pointer"
                    onAction={() => openPostPreview(comment, true)}
                    onPointerUp={(event) => {
                      if (event.button !== 0 || shouldIgnoreCommentRowOpen(event.target)) {
                        return;
                      }

                      openPostPreview(comment, true);
                    }}
                  >
                  <Table.Cell>
                    <span className="whitespace-nowrap leading-5">
                      {timeFormatter.format(createdAt)}, {dateFormatter.format(createdAt)}
                    </span>
                  </Table.Cell>

                  <Table.Cell>
                    <UserCell
                      user={comment.author}
                      onOpenProfile={setProfilePreviewUser}
                    />
                  </Table.Cell>

                  <Table.Cell>
                    <button
                      type="button"
                      className="block max-w-[260px] truncate rounded-none p-0 text-left text-[var(--label-primary)] transition-colors hover:text-[var(--accent-primary)]"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPostPreview(comment);
                      }}
                    >
                      {comment.postTitle}
                    </button>
                    <div className="text-[14px] leading-5 text-[var(--label-tertiary)]">
                      {comment.depth > 0 ? "Ветка комментариев" : "Комментарий"}
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="max-w-[420px] truncate text-[var(--label-primary)]">
                      {getCommentBody(comment)}
                    </div>
                    {comment.hiddenReason ? (
                      <div className="max-w-[420px] truncate text-[14px] leading-5 text-[var(--label-tertiary)]">
                        {comment.hiddenReason}
                      </div>
                    ) : null}
                  </Table.Cell>

                  <Table.Cell>
                    <div className={`flex items-center gap-2 whitespace-nowrap ${getActivityLabelClassName(comment)}`}>
                      <ActivityIcon comment={comment} />
                      {getActivityLabel(comment)}
                    </div>
                    <div className="whitespace-nowrap text-[14px] leading-5 text-[var(--label-tertiary)]">
                      {timeFormatter.format(activityDate)}, {dateFormatter.format(activityDate)}
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      {comment.uncheckedReportsCount > 0 ? (
                        <Link
                          href={`/admin/reports?objectType=comment&status=open&search=${encodeURIComponent(comment.author.handle)}`}
                          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] px-2 text-[12px] font-semibold leading-none text-white no-underline"
                          aria-label={`${comment.uncheckedReportsCount} непроверенных репортов`}
                        >
                          {comment.uncheckedReportsCount > 99 ? "99+" : comment.uncheckedReportsCount}
                        </Link>
                      ) : (
                        <span className="text-[var(--label-tertiary)]">0</span>
                      )}
                    </div>
                  </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <ProfilePreviewDrawer
        user={profilePreviewUser}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) {
            setProfilePreviewUser(null);
          }
        }}
      />
      <CommentPostPreviewDrawer
        key={`${postPreviewTarget?.postId ?? "empty"}:${postPreviewTarget?.highlightedCommentId ?? "post"}`}
        target={postPreviewTarget}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) {
            setPostPreviewTarget(null);
          }
        }}
      />
    </>
  );
}
