"use client";

import type { SortDescriptor } from "@heroui/react";
import {
  Chip,
  Drawer,
  Dropdown,
  EmptyState,
  ListBox,
  Select,
  Spinner,
  Table,
} from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button-styles";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import {
  TextareaField,
  TextInputField,
  fieldControlSelectItemClassName,
  fieldControlSelectItemIndicatorClassName,
  fieldControlSelectTriggerClassName,
} from "@/components/ui/field-control";
import {
  CheckIndicatorIcon,
  ChevronDownIcon,
  CloseIcon,
  MoreHorizontalIcon,
} from "@/components/ui/icons";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import { getPostBodyText } from "@/features/feed/lib/post-detail";
import { normalizePostDates } from "@/features/feed/lib/post-normalization";
import type {
  AdminPostStatus,
  AdminPostTimelineItem,
  Post,
  PostMutationResponse,
} from "@/features/feed/types";
import {
  DEFAULT_POST_SUBTOPIC,
  POST_INTENT_META,
  POST_TOPIC_META,
  POST_TOPIC_OPTIONS,
  POST_TOPIC_SUBTOPICS,
} from "@/constants/post-taxonomy";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeStyle: "short",
});

const statusChipLabelStyle = {
  fontSize: 12,
  lineHeight: "16px",
};

type PostColumnKey =
  | "actions"
  | "author"
  | "createdAt"
  | "post"
  | "reports"
  | "stats"
  | "status"
  | "topic";

const POST_COLUMNS = [
  { key: "createdAt", label: "Дата", allowsSorting: true },
  { key: "status", label: "Статус", allowsSorting: true },
  { key: "author", label: "Автор", allowsSorting: true },
  { key: "topic", label: "Тема", allowsSorting: true },
  { key: "post", label: "Пост", allowsSorting: true },
  { key: "stats", label: "Активность", allowsSorting: true },
  { key: "reports", label: "Репорты", allowsSorting: true },
  { key: "actions", label: "Действия", allowsSorting: false },
] as const;

type PostColumn = (typeof POST_COLUMNS)[number];

const POST_STATUS_LABELS: Record<AdminPostStatus, string> = {
  deleted: "Удален",
  hidden: "Скрыт",
  published: "Опубликован",
};

type EditFormState = {
  content: string;
  intent: PostIntent;
  subtopic: string | null;
  title: string;
  topic: PostTopic | null;
};

type EditPostFormProps = {
  cancelLabel?: string;
  formState: EditFormState;
  isSaving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onChange: (nextState: EditFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
        d="M5 6.75C5 5.784 5.784 5 6.75 5h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 17.25 19H6.75A1.75 1.75 0 0 1 5 17.25V6.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 9h8M8 12h5M8 15h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SortColumnLabel({
  column,
  sortDescriptor,
}: {
  column: PostColumn;
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

function StatusPill({ status }: { status: AdminPostStatus }) {
  const color = {
    deleted: "default",
    hidden: "warning",
    published: "success",
  }[status] as "default" | "success" | "warning";

  return (
    <Chip
      color={color}
      variant="soft"
      className={`admin-status-chip admin-post-status-chip--${status}`}
    >
      <Chip.Label style={statusChipLabelStyle}>
        {POST_STATUS_LABELS[status]}
      </Chip.Label>
    </Chip>
  );
}

function UserCell({ user }: { user: AdminPostTimelineItem["author"] }) {
  const profileHref = buildPublicProfilePathFromHandle(user.handle);

  return (
    <div className="min-w-0">
      {profileHref ? (
        <Link
          href={profileHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[var(--label-primary)] transition-colors hover:text-[var(--accent-primary)]"
          onClick={(event) => event.stopPropagation()}
        >
          {user.name}
        </Link>
      ) : (
        <div className="truncate text-[var(--label-primary)]">{user.name}</div>
      )}
      <div className="truncate text-[var(--label-tertiary)]">{user.handle}</div>
    </div>
  );
}

function getTopicLabel(post: AdminPostTimelineItem) {
  return post.topic ? POST_TOPIC_META[post.topic]?.label ?? "Без темы" : "Без темы";
}

function getSubtopicLabel(post: AdminPostTimelineItem) {
  return post.subtopic || (post.topic ? DEFAULT_POST_SUBTOPIC : "");
}

function getPostStatusDate(post: AdminPostTimelineItem) {
  return post.deletedAt ?? post.hiddenAt ?? post.updatedAt;
}

function getSortableValue(post: AdminPostTimelineItem, column: PostColumnKey) {
  switch (column) {
    case "author":
      return `${post.author.name} ${post.author.handle}`;
    case "createdAt":
      return new Date(post.createdAt).getTime();
    case "post":
      return `${post.title} ${post.bodyText}`;
    case "reports":
      return post.uncheckedReportsCount;
    case "stats":
      return post.commentsCount + post.likesCount + post.viewsCount;
    case "status":
      return POST_STATUS_LABELS[post.status];
    case "topic":
      return `${getTopicLabel(post)} ${getSubtopicLabel(post)}`;
    case "actions":
    default:
      return "";
  }
}

function shouldIgnorePostRowOpen(target: EventTarget | null) {
  return (
    target instanceof Element
    && Boolean(target.closest("a, button, input, textarea, select, [role='button'], [role='menuitem']"))
  );
}

function htmlToText(content: string) {
  if (typeof window !== "undefined") {
    return new window.DOMParser()
      .parseFromString(content, "text/html")
      .body.textContent
      ?.replace(/\s+/g, " ")
      .trim() ?? "";
  }

  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildInitialEditState(post: AdminPostTimelineItem): EditFormState {
  return {
    content: htmlToText(post.bodyHtml) || post.bodyText,
    intent: post.intent,
    subtopic: post.subtopic,
    title: post.title,
    topic: post.topic,
  };
}

function AdminPostMoreMenu({
  onEdit,
}: {
  onEdit: () => void;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        aria-label="Еще"
        className={buttonClassName({
          className: "cursor-pointer text-[var(--label-primary)]",
          isIconOnly: true,
          size: "sm",
          variant: "quaternary",
        })}
      >
        <MoreHorizontalIcon />
      </Dropdown.Trigger>

      <DropdownPopover placement="bottom end" className="min-w-[220px]">
        <Dropdown.Menu
          aria-label="Действия с постом"
          selectionMode="none"
          className="dropdown-menu-default"
          onAction={(key) => {
            if (String(key) === "edit") {
              onEdit();
            }
          }}
        >
          <Dropdown.Item
            key="edit"
            id="edit"
            textValue="Редактировать"
          >
            Редактировать
          </Dropdown.Item>
        </Dropdown.Menu>
      </DropdownPopover>
    </Dropdown.Root>
  );
}

function EditPostForm({
  cancelLabel = "Отмена",
  errorMessage,
  formState,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: EditPostFormProps) {
  const availableSubtopics = formState.topic
    ? POST_TOPIC_SUBTOPICS[formState.topic] ?? []
    : [];
  const selectedIntentLabel = POST_INTENT_META[formState.intent].label;
  const selectedTopicLabel = formState.topic
    ? POST_TOPIC_META[formState.topic]?.label ?? "Без темы"
    : "Без темы";
  const selectedSubtopicKey = formState.topic
    ? formState.subtopic ?? DEFAULT_POST_SUBTOPIC
    : "none";
  const selectedSubtopicLabel = formState.topic
    ? selectedSubtopicKey
    : "Без подтемы";

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <TextInputField
        label="Заголовок"
        onChange={(title) => onChange({ ...formState, title })}
        placeholder="Заголовок"
        value={formState.title}
      />

      <TextareaField
        label="Содержимое"
        minHeightClassName="min-h-[220px]"
        onChange={(content) => onChange({ ...formState, content })}
        placeholder="Содержимое"
        resize="vertical"
        rows={9}
        value={formState.content}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2 text-[14px] font-medium">
          <span className="font-medium text-[var(--label-primary)]">Формат</span>
          <Select
            aria-label="Формат поста"
            selectedKey={formState.intent}
            onSelectionChange={(nextKey) => {
              if (typeof nextKey !== "string") {
                return;
              }

              onChange({
                ...formState,
                intent: nextKey as PostIntent,
              });
            }}
            className="w-full"
          >
            <Select.Trigger className={fieldControlSelectTriggerClassName}>
              <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
                <span className="min-w-0 truncate">{selectedIntentLabel}</span>
              </Select.Value>
              <Select.Indicator className="right-4 text-[var(--field-placeholder)]" />
            </Select.Trigger>

            <Select.Popover placement="bottom start">
              <ListBox aria-label="Формат поста" className="text-[16px] leading-6">
                <ListBox.Section>
                  {Object.entries(POST_INTENT_META).map(([value, meta]) => (
                    <ListBox.Item
                      key={value}
                      id={value}
                      textValue={meta.label}
                      className={fieldControlSelectItemClassName}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1 truncate font-normal">
                          {meta.label}
                        </span>
                        <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                          {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                        </ListBox.ItemIndicator>
                      </span>
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <div className="grid gap-2 text-[14px] font-medium">
          <span className="font-medium text-[var(--label-primary)]">Тема</span>
          <Select
            aria-label="Тема поста"
            selectedKey={formState.topic ?? "none"}
            onSelectionChange={(nextKey) => {
              if (typeof nextKey !== "string") {
                return;
              }

              const nextTopic = nextKey === "none" ? null : nextKey as PostTopic;
              const nextSubtopics = nextTopic
                ? POST_TOPIC_SUBTOPICS[nextTopic] ?? []
                : [];

              onChange({
                ...formState,
                subtopic: nextTopic
                  ? nextSubtopics[0] ?? DEFAULT_POST_SUBTOPIC
                  : null,
                topic: nextTopic,
              });
            }}
            className="w-full"
          >
            <Select.Trigger className={fieldControlSelectTriggerClassName}>
              <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
                <span className="min-w-0 truncate">{selectedTopicLabel}</span>
              </Select.Value>
              <Select.Indicator className="right-4 text-[var(--field-placeholder)]" />
            </Select.Trigger>

            <Select.Popover placement="bottom start">
              <ListBox aria-label="Тема поста" className="text-[16px] leading-6">
                <ListBox.Section>
                  <ListBox.Item
                    key="none"
                    id="none"
                    textValue="Без темы"
                    className={fieldControlSelectItemClassName}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-normal">
                        Без темы
                      </span>
                      <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                        {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                      </ListBox.ItemIndicator>
                    </span>
                  </ListBox.Item>
                  {POST_TOPIC_OPTIONS.map((option) => (
                    <ListBox.Item
                      key={option.value}
                      id={option.value}
                      textValue={option.label}
                      className={fieldControlSelectItemClassName}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1 truncate font-normal">
                          {option.label}
                        </span>
                        <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                          {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                        </ListBox.ItemIndicator>
                      </span>
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 text-[14px] font-medium">
        <span className="font-medium text-[var(--label-primary)]">Подтема</span>
        <Select
          aria-label="Подтема поста"
          selectedKey={selectedSubtopicKey}
          isDisabled={!formState.topic}
          onSelectionChange={(nextKey) => {
            if (typeof nextKey !== "string" || nextKey === "none") {
              return;
            }

            onChange({
              ...formState,
              subtopic: nextKey || null,
            });
          }}
          className="w-full"
        >
          <Select.Trigger className={fieldControlSelectTriggerClassName}>
            <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
              <span className="min-w-0 truncate">{selectedSubtopicLabel}</span>
            </Select.Value>
            <Select.Indicator className="right-4 text-[var(--field-placeholder)]" />
          </Select.Trigger>

          <Select.Popover placement="bottom start">
            <ListBox aria-label="Подтема поста" className="text-[16px] leading-6">
              <ListBox.Section>
                {availableSubtopics.map((subtopic) => (
                  <ListBox.Item
                    key={subtopic}
                    id={subtopic}
                    textValue={subtopic}
                    className={fieldControlSelectItemClassName}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-normal">
                        {subtopic}
                      </span>
                      <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                        {({ isSelected }) => (isSelected ? <CheckIndicatorIcon /> : null)}
                      </ListBox.ItemIndicator>
                    </span>
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {errorMessage ? (
        <div className="feedback-critical-surface rounded-2xl px-4 py-3 text-[14px] leading-5">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          size="sm"
          variant="primary"
          isLoading={isSaving}
        >
          Сохранить
        </Button>
      </div>
    </form>
  );
}

function PreviewPostDrawer({
  post,
  onOpenChange,
}: {
  post: AdminPostTimelineItem | null;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const [loadedPreview, setLoadedPreview] = useState<{
    errorMessage: string | null;
    post: Post | null;
    postId: string;
    status: "ready" | "error";
  } | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [formState, setFormState] = useState<EditFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const isOpen = Boolean(post);
  const requestedPostId = post?.id ?? null;
  const status =
    !post
      ? "idle"
      : loadedPreview?.postId === requestedPostId
        ? loadedPreview.status
        : "loading";
  const loadedPost =
    status === "ready" && loadedPreview?.postId === requestedPostId
      ? loadedPreview.post
      : null;
  const errorMessage =
    loadedPreview?.postId === requestedPostId ? loadedPreview.errorMessage : null;

  useEffect(() => {
    setMode("preview");
    setFormState(null);
    setSaveErrorMessage(null);
  }, [requestedPostId]);

  useEffect(() => {
    if (!requestedPostId) {
      return;
    }

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

  const detailedPost = loadedPost
    ? {
        ...loadedPost,
        content: {
          ...loadedPost.content,
          excerpt: getPostBodyText(loadedPost),
        },
      }
    : null;
  const noopToggleBookmark = () => undefined;
  const noopToggleLike = () => undefined;
  const noopPostMenuAction = () => undefined;

  function buildEditStateFromPreview() {
    if (!post) {
      return null;
    }

    if (!loadedPost) {
      return buildInitialEditState(post);
    }

    return {
      content: htmlToText(loadedPost.editorState?.content ?? "") || getPostBodyText(loadedPost),
      intent: loadedPost.editorState?.intent ?? loadedPost.intent,
      subtopic: loadedPost.editorState?.subtopic ?? loadedPost.subtopic ?? post.subtopic,
      title: loadedPost.editorState?.title ?? loadedPost.content.title,
      topic: loadedPost.editorState?.topic ?? loadedPost.topic ?? null,
    };
  }

  function handleStartEdit() {
    const nextFormState = buildEditStateFromPreview();

    if (!nextFormState) {
      return;
    }

    setFormState(nextFormState);
    setSaveErrorMessage(null);
    setMode("edit");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!post || !formState) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/posts/${post.id}`, {
        body: JSON.stringify(formState),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as (
        PostMutationResponse & { error?: string }
      ) | null;

      if (!response.ok || !payload?.post) {
        throw new Error(payload?.error ?? "Не удалось сохранить пост.");
      }

      const nextPost = normalizePostDates(payload.post);

      setLoadedPreview({
        errorMessage: null,
        post: nextPost,
        postId: post.id,
        status: "ready",
      });
      setMode("preview");
      toast.success("Пост обновлен");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить пост.";
      setSaveErrorMessage(message);
      toast.danger(message);
    } finally {
      setIsSaving(false);
    }
  }

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
                <div className="min-w-0">
                  <Drawer.Heading className="type-h3 font-bold text-[var(--label-primary)]">
                    {mode === "edit" ? "Редактировать пост" : "Превью поста"}
                  </Drawer.Heading>
                  {post ? (
                    <p className="mt-1 truncate text-[14px] leading-5 text-[var(--label-secondary)]">
                      {post.title}
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
              {mode === "edit" && formState ? (
                <div className="p-5">
                  <EditPostForm
                    cancelLabel="Назад"
                    errorMessage={saveErrorMessage}
                    formState={formState}
                    isSaving={isSaving}
                    onCancel={() => {
                      setMode("preview");
                      setSaveErrorMessage(null);
                    }}
                    onChange={(nextState) => setFormState(nextState)}
                    onSubmit={handleSubmit}
                  />
                </div>
              ) : null}

              {mode === "preview" && status === "loading" ? (
                <div className="flex min-h-[280px] items-center justify-center text-[var(--label-secondary)]">
                  <Spinner size="sm" />
                </div>
              ) : null}

              {mode === "preview" && status === "error" ? (
                <div className="px-5 py-6">
                  <div className="feedback-critical-surface rounded-2xl px-4 py-3 text-[14px] leading-5">
                    {errorMessage ?? "Не удалось загрузить пост."}
                  </div>
                </div>
              ) : null}

              {mode === "preview" && detailedPost ? (
                <div className="flex flex-col gap-3 px-5 py-5">
                  <section className="surface-card rounded-[24px] px-4 py-4">
                    <CardPostItem
                      post={detailedPost}
                      blockPointerEvents={false}
                      showActions={false}
                      showReadOnlyLikeCounter
                      showMenu
                      menuSlot={<AdminPostMoreMenu onEdit={handleStartEdit} />}
                      onToggleBookmark={noopToggleBookmark}
                      onToggleLike={noopToggleLike}
                      onPostMenuAction={noopPostMenuAction}
                    />
                  </section>

                  <section className="surface-card rounded-[24px] px-4 py-4">
                    <CommentsSection
                      key={detailedPost.id}
                      pageId={`post:${detailedPost.id}`}
                      readOnly
                      showReadOnlyActions
                      showReadOnlyMenu
                    />
                  </section>
                </div>
              ) : null}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

function EditPostDrawer({
  post,
  onOpenChange,
}: {
  post: AdminPostTimelineItem | null;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const [formState, setFormState] = useState<EditFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isOpen = Boolean(post);

  useEffect(() => {
    if (!post) {
      setFormState(null);
      setErrorMessage(null);
      return;
    }

    setFormState(buildInitialEditState(post));
    setErrorMessage(null);
  }, [post]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!post || !formState) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/posts/${post.id}`, {
        body: JSON.stringify(formState),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as (
        PostMutationResponse & { error?: string }
      ) | null;

      if (!response.ok || !payload?.post) {
        throw new Error(payload?.error ?? "Не удалось сохранить пост.");
      }

      toast.success("Пост обновлен");
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить пост.";
      setErrorMessage(message);
      toast.danger(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop variant="transparent" isDismissable>
        <Drawer.Content placement="right" className="z-[370]">
          <Drawer.Dialog
            aria-label="Редактировать пост"
            className="admin-report-preview-drawer !w-[min(620px,calc(100vw-32px))] !max-w-[calc(100vw-32px)] p-0"
          >
            <Drawer.Header className="border-separator border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <Drawer.Heading className="type-h3 font-bold text-[var(--label-primary)]">
                  Редактировать пост
                </Drawer.Heading>

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

            <Drawer.Body className="surface-elevated m-0 p-5 text-[var(--label-primary)]">
              {formState ? (
                <EditPostForm
                  errorMessage={errorMessage}
                  formState={formState}
                  isSaving={isSaving}
                  onCancel={() => onOpenChange(false)}
                  onChange={(nextState) => setFormState(nextState)}
                  onSubmit={handleSubmit}
                />
              ) : null}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

export function AdminPostsTable({
  posts,
}: {
  posts: AdminPostTimelineItem[];
}) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });
  const [previewPost, setPreviewPost] = useState<AdminPostTimelineItem | null>(null);
  const [editingPost, setEditingPost] = useState<AdminPostTimelineItem | null>(null);
  const sortedPosts = useMemo(() => {
    const column = sortDescriptor.column as PostColumnKey | undefined;

    if (!column || column === "actions") {
      return posts;
    }

    return [...posts].sort((leftPost, rightPost) => {
      const leftValue = getSortableValue(leftPost, column);
      const rightValue = getSortableValue(rightPost, column);
      const direction = sortDescriptor.direction === "ascending" ? 1 : -1;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue), "ru", {
        numeric: true,
        sensitivity: "base",
      }) * direction;
    });
  }, [posts, sortDescriptor]);

  return (
    <>
      <Table className="admin-reports-table">
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Хронология постов"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              {POST_COLUMNS.map((column) => (
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
                    <div className="text-[16px] leading-7">Постов пока нет</div>
                  </div>
                </EmptyState>
              )}
            >
              {sortedPosts.map((post) => {
                const createdAt = new Date(post.createdAt);
                const statusDate = new Date(getPostStatusDate(post));

                return (
                  <Table.Row
                    key={post.id}
                    id={post.id}
                    className="cursor-pointer"
                    onAction={() => setPreviewPost(post)}
                    onPointerUp={(event) => {
                      if (event.button !== 0 || shouldIgnorePostRowOpen(event.target)) {
                        return;
                      }

                      setPreviewPost(post);
                    }}
                  >
                    <Table.Cell>
                      <span className="whitespace-nowrap leading-5">
                        {timeFormatter.format(createdAt)}, {dateFormatter.format(createdAt)}
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <StatusPill status={post.status} />
                      {post.status !== "published" ? (
                        <div className="mt-1 whitespace-nowrap text-[14px] leading-5 text-[var(--label-tertiary)]">
                          {timeFormatter.format(statusDate)}, {dateFormatter.format(statusDate)}
                        </div>
                      ) : null}
                    </Table.Cell>

                    <Table.Cell>
                      <UserCell user={post.author} />
                    </Table.Cell>

                    <Table.Cell>
                      <div className="max-w-[220px] truncate text-[var(--label-primary)]">
                        {getTopicLabel(post)}
                      </div>
                      {getSubtopicLabel(post) ? (
                        <div className="max-w-[220px] truncate text-[14px] leading-5 text-[var(--label-tertiary)]">
                          {getSubtopicLabel(post)}
                        </div>
                      ) : null}
                    </Table.Cell>

                    <Table.Cell>
                      <div className="max-w-[430px]">
                        <div className="truncate font-medium text-[var(--label-primary)]">
                          {post.title}
                        </div>
                        <div
                          className="mt-1 text-[14px] leading-5 text-[var(--label-secondary)]"
                          style={{
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                            display: "-webkit-box",
                            overflow: "hidden",
                          }}
                        >
                          {post.bodyText || post.excerpt || "Без текста"}
                        </div>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="whitespace-nowrap text-[var(--label-primary)]">
                        {post.commentsCount} коммент.
                      </div>
                      <div className="whitespace-nowrap text-[14px] leading-5 text-[var(--label-tertiary)]">
                        {post.likesCount} лайков · {post.viewsCount} просмотров
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      {post.uncheckedReportsCount > 0 ? (
                        <Link
                          href={`/admin/reports?objectType=post&status=open&search=${encodeURIComponent(post.author.handle)}`}
                          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] px-2 text-[12px] font-semibold leading-none text-white no-underline"
                          aria-label={`${post.uncheckedReportsCount} непроверенных репортов`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {post.uncheckedReportsCount > 99 ? "99+" : post.uncheckedReportsCount}
                        </Link>
                      ) : (
                        <span className="text-[var(--label-tertiary)]">0</span>
                      )}
                    </Table.Cell>

                    <Table.Cell>
                      <div
                        className="flex items-center justify-end"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Dropdown.Root>
                          <Dropdown.Trigger
                            aria-label="Открыть меню действий"
                            className={buttonClassName({
                              className: "cursor-pointer text-[var(--label-primary)]",
                              isIconOnly: true,
                              size: "sm",
                              variant: "quaternary",
                            })}
                          >
                            <MoreHorizontalIcon />
                          </Dropdown.Trigger>

                          <DropdownPopover placement="bottom end" className="min-w-[220px]">
                            <Dropdown.Menu
                              aria-label="Действия с постом"
                              selectionMode="none"
                              className="dropdown-menu-default"
                              onAction={(key) => {
                                if (String(key) === "edit") {
                                  setEditingPost(post);
                                }
                              }}
                            >
                              <Dropdown.Item
                                key="edit"
                                id="edit"
                                textValue="Редактировать"
                              >
                                Редактировать
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </DropdownPopover>
                        </Dropdown.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <PreviewPostDrawer
        post={previewPost}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) {
            setPreviewPost(null);
          }
        }}
      />
      <EditPostDrawer
        post={editingPost}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) {
            setEditingPost(null);
          }
        }}
      />
    </>
  );
}
