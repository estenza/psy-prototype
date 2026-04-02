"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { getUserHandle } from "@/features/auth/lib/profile";
import {
  createPublishedPost,
  findPublishedPostById,
  markPublishedPostForHighlight,
  savePublishedPost,
} from "@/features/feed/lib/published-posts";
import {
  TOPIC_TITLE_MAX_LENGTH,
  TOPIC_TITLE_WARNING_THRESHOLD,
} from "@/features/topic-creation/constants";
import { TopicEditor } from "@/features/topic-creation/components/topic-editor";
import { TopicFormatSwitch } from "@/features/topic-creation/components/topic-format-switch";
import { TopicPicker } from "@/features/topic-creation/components/topic-picker";
import {
  BackNavigationButton,
} from "@/features/topic-creation/components/back-navigation-button";
import {
  clearTopicDraft,
  consumeTopicDraftRestoreRequest,
  createEmptyTopicDraft,
  getInitialTopicSnapshot,
  hasMeaningfulTopicDraft,
  hasTopicBodyContent,
  readStoredTopicDraft,
  saveTopicDraft,
  serializeTopicSnapshot,
} from "@/features/topic-creation/lib/draft-storage";
import type { TopicDraft } from "@/features/topic-creation/types";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

function getNextSavedDraftState(
  content: string,
  editingPostId: string | null,
  intent: PostIntent,
  topic: PostTopic | null,
  title: string,
): TopicDraft {
  return {
    content,
    editingPostId,
    intent,
    topic,
    title,
    updatedAt: new Date().toISOString(),
  };
}

const TITLE_PROGRESS_RADIUS = 14;
const TITLE_PROGRESS_CIRCUMFERENCE = 2 * Math.PI * TITLE_PROGRESS_RADIUS;

type TitleProgressIndicatorProps = {
  currentLength: number;
  maxLength: number;
};

function TitleProgressIndicator({
  currentLength,
  maxLength,
}: TitleProgressIndicatorProps) {
  const remainingCharacters = maxLength - currentLength;
  const showIndicator = currentLength > 0;
  const isWarning = remainingCharacters <= TOPIC_TITLE_WARNING_THRESHOLD;
  const progress = Math.min(currentLength / maxLength, 1);
  const strokeDashoffset =
    TITLE_PROGRESS_CIRCUMFERENCE * (1 - progress);

  return (
    <span className="flex h-[54px] w-11 flex-none self-start items-center justify-end">
      {showIndicator ? (
        <span
          className={`relative inline-flex items-center justify-center rounded-full transition-[width,height,transform] duration-150 ease-out ${
            isWarning ? "h-9 w-9" : "h-6 w-6"
          }`}
          style={{
            color: isWarning
              ? "var(--accent-bookmark)"
              : "var(--accent-primary)",
          }}
        >
          <svg
            viewBox="0 0 36 36"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="18"
              cy="18"
              r={TITLE_PROGRESS_RADIUS}
              fill="none"
              stroke="var(--fill-secondary)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r={TITLE_PROGRESS_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={TITLE_PROGRESS_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          {isWarning ? (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold leading-none tracking-normal">
              {remainingCharacters}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function CreateTopicScreen() {
  const router = useRouter();
  const { user } = useAuthClient();
  const titleFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const [initialDraft] = useState<TopicDraft>(createEmptyTopicDraft);

  const [content, setContent] = useState(initialDraft.content);
  const [editingPostId, setEditingPostId] = useState<string | null>(
    initialDraft.editingPostId,
  );
  const [intent, setIntent] = useState<PostIntent>(initialDraft.intent);
  const [topic, setTopic] = useState<PostTopic | null>(initialDraft.topic);
  const [, setLastSavedSnapshot] = useState(
    getInitialTopicSnapshot(),
  );
  const [publishMessage, setPublishMessage] = useState("");
  const [title, setTitle] = useState(initialDraft.title);
  const [titleHadValue, setTitleHadValue] = useState(
    initialDraft.title.trim().length > 0,
  );
  const [contentHadValue, setContentHadValue] = useState(
    hasTopicBodyContent(initialDraft.content),
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const currentSnapshot = serializeTopicSnapshot({
    content,
    intent,
    title,
    topic,
  });
  const hasTitle = title.trim().length > 0;
  const hasBody = hasTopicBodyContent(content);
  const canPublish = hasTitle && hasBody;
  const titleLength = title.length;
  const titleError = (titleHadValue || submitAttempted) && !hasTitle;
  const contentError = (contentHadValue || submitAttempted) && !hasBody;
  const hasMeaningfulContent = hasMeaningfulTopicDraft({ content, title });

  const syncTitleFieldHeight = useCallback(() => {
    const titleField = titleFieldRef.current;

    if (!titleField) {
      return;
    }

    titleField.style.height = "0px";
    titleField.style.height = `${titleField.scrollHeight}px`;
  }, []);

  const applyDraft = useCallback((draft: TopicDraft) => {
    setContent(draft.content);
    setEditingPostId(draft.editingPostId);
    setIntent(draft.intent);
    setTopic(draft.topic);
    setTitle(draft.title);
    setTitleHadValue(draft.title.trim().length > 0);
    setContentHadValue(hasTopicBodyContent(draft.content));
    setPublishMessage("");
  }, []);

  const saveCurrentDraft = useCallback(() => {
    if (!hasMeaningfulContent) {
      clearTopicDraft();
      setLastSavedSnapshot(getInitialTopicSnapshot());
      return false;
    }

    const draft = getNextSavedDraftState(
      content,
      editingPostId,
      intent,
      topic,
      title,
    );

    saveTopicDraft(draft);
    setLastSavedSnapshot(serializeTopicSnapshot(draft));

    return true;
  }, [content, editingPostId, hasMeaningfulContent, intent, title, topic]);

  const resetSavedDraftState = useCallback(() => {
    clearTopicDraft();
    setLastSavedSnapshot(getInitialTopicSnapshot());
  }, []);

  function leaveCreateMode() {
    startTransition(() => {
      router.push("/");
    });
  }

  function handleBack() {
    if (hasMeaningfulContent) {
      saveCurrentDraft();
      window.location.assign("/");
      return;
    }

    leaveCreateMode();
  }

  function handleRestoreDraft() {
    const storedDraft = readStoredTopicDraft();

    if (!storedDraft) {
      return;
    }

    const storedSnapshot = serializeTopicSnapshot(storedDraft);

    if (hasMeaningfulContent && currentSnapshot !== storedSnapshot) {
      const shouldReplaceCurrentText = window.confirm(
        "Заменить текущий текст сохранённым черновиком?",
      );

      if (!shouldReplaceCurrentText) {
        return;
      }
    }

    applyDraft(storedDraft);
    setLastSavedSnapshot(storedSnapshot);
    setPublishMessage("Черновик восстановлен");
  }

  function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!canPublish) {
      setPublishMessage("Заполните заголовок и текст темы, чтобы продолжить.");
      return;
    }

    const existingPost = editingPostId
      ? findPublishedPostById(editingPostId)
      : null;
    const postAuthor = existingPost?.author ?? {
      id: user?.id,
      name: user?.displayName ?? "Автор",
      handle: user ? getUserHandle(user) : "@author",
    };
    const publishedPost = createPublishedPost({
      author: postAuthor,
      content,
      existingPost,
      intent,
      title,
      topic,
    });

    savePublishedPost(publishedPost);
    markPublishedPostForHighlight(publishedPost.id);
    clearTopicDraft();
    setEditingPostId(null);
    setLastSavedSnapshot(getInitialTopicSnapshot());
    setPublishMessage("");

    startTransition(() => {
      router.push("/");
    });
  }

  useEffect(() => {
    if (!hasMeaningfulContent) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasMeaningfulContent]);

  useEffect(() => {
    syncTitleFieldHeight();
  }, [syncTitleFieldHeight, title]);

  useLayoutEffect(() => {
    if (!consumeTopicDraftRestoreRequest()) {
      return;
    }

    const storedDraft = readStoredTopicDraft();
    let cancelled = false;

    if (!storedDraft) {
      return;
    }

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      applyDraft(storedDraft);
      setLastSavedSnapshot(serializeTopicSnapshot(storedDraft));
    });

    return () => {
      cancelled = true;
    };
  }, [applyDraft]);

  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader />

      <div className="pt-[var(--app-header-height)]">
        <main className="mx-auto w-full px-4 sm:px-6 xl:max-w-[var(--app-shell-max-width)] xl:px-5">
          <section className="mx-auto min-h-[calc(100dvh-var(--app-header-height))] w-full xl:max-w-[672px]">
            <form onSubmit={handlePublish} className="pb-20">
              <div className="flex items-start justify-between gap-6 pt-12">
                <div className="flex min-w-0 items-center gap-4">
                  <BackNavigationButton onClick={handleBack} />

                  <h1 className="min-w-0 text-[22px] font-bold leading-7 tracking-normal">
                    Новое обсуждение
                  </h1>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestoreDraft}
                  className="h-11 cursor-pointer rounded-full px-4 py-2 text-[14px] font-bold leading-5 text-[var(--label-primary)] transition-none hover:bg-[var(--fill-control-hover)] active:bg-[var(--fill-secondary)]"
                >
                  Черновики
                </Button>
              </div>

              <div className="pt-10">
                <TopicFormatSwitch
                  value={intent}
                  onChange={(nextIntent) => {
                    setIntent(nextIntent);
                    setPublishMessage("");
                  }}
                />
              </div>

              <div className="pt-8">
                <label
                  className="field-shell grid min-h-[54px] grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-[16px] px-5"
                >
                  <textarea
                    ref={titleFieldRef}
                    id="topic-title"
                    rows={1}
                    maxLength={TOPIC_TITLE_MAX_LENGTH}
                    placeholder="Что хотите обсудить?"
                    value={title}
                    onChange={(event) => {
                      const nextTitle = event.target.value;

                      setTitle(nextTitle);
                      setPublishMessage("");

                      if (nextTitle.trim().length > 0) {
                        setTitleHadValue(true);
                      }

                      if (
                        !hasMeaningfulTopicDraft({
                          content,
                          title: nextTitle,
                        })
                      ) {
                        resetSavedDraftState();
                      }

                      event.currentTarget.style.height = "0px";
                      event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                    }}
                    className="text-label-primary min-h-[54px] w-full min-w-0 resize-none overflow-hidden bg-transparent py-4 text-[16px] leading-6 outline-none placeholder:text-[var(--label-quaternary)]"
                  />
                  <TitleProgressIndicator
                    currentLength={titleLength}
                    maxLength={TOPIC_TITLE_MAX_LENGTH}
                  />
                </label>

                {titleError ? (
                  <p className="mt-3 text-[14px] leading-5 text-[var(--accent-like)]">
                    Заголовок обязателен. Он поможет людям быстрее понять тему.
                  </p>
                ) : null}
              </div>

              <div className="pt-6">
                <TopicEditor
                  content={content}
                  invalid={contentError}
                  placeholder="Опишите подробнее"
                  onChange={(nextContent) => {
                    const nextHasBody = hasTopicBodyContent(nextContent);

                    setContent(nextContent);
                    setPublishMessage("");

                    if (nextHasBody) {
                      setContentHadValue(true);
                    }

                    if (
                      !hasMeaningfulTopicDraft({
                        content: nextContent,
                        title,
                      })
                    ) {
                      resetSavedDraftState();
                    }
                  }}
                />
              </div>

              <div className="pt-6">
                <TopicPicker
                  value={topic}
                  onChange={(nextTopic) => {
                    setTopic(nextTopic);
                    setPublishMessage("");
                  }}
                />
              </div>

              {publishMessage ? (
                <div className="pt-4">
                  <p className="text-label-secondary text-[14px] leading-6">
                    {publishMessage}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pb-20 pt-10 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => saveCurrentDraft()}
                  className="cursor-pointer rounded-[24px] px-5 py-3 text-[14px] font-bold leading-5 text-[var(--label-primary)] hover:bg-[var(--fill-control-hover)]"
                >
                  Сохранить черновик
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!canPublish}
                  className="rounded-[24px] px-5 py-3 text-[14px] font-bold leading-5"
                >
                  Опубликовать
                </Button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
