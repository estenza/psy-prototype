"use client";

import { FieldError, TextArea, TextField } from "@heroui/react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import { Button } from "@/components/ui/button";
import {
  markPublishedPostForHighlight,
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
import type {
  DiscussionMutationResponse,
  DiscussionRouteErrorResponse,
} from "@/features/feed/types";
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
              ? "var(--warning)"
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
              strokeWidth="4"
            />
            <circle
              cx="18"
              cy="18"
              r={TITLE_PROGRESS_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
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

function getInitialCreateTopicDraft() {
  const restoredDraft = consumeTopicDraftRestoreRequest()
    ? readStoredTopicDraft()
    : null;

  return restoredDraft ?? createEmptyTopicDraft();
}

export function CreateTopicScreen() {
  const router = useRouter();
  const titleFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const [initialDraft] = useState<TopicDraft>(getInitialCreateTopicDraft);

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

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!canPublish) {
      setPublishMessage("Заполните заголовок и текст темы, чтобы продолжить.");
      return;
    }

    const endpoint = editingPostId ? `/api/discussions/${editingPostId}` : "/api/discussions";
    const method = editingPostId ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          intent,
          title,
          topic,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as DiscussionRouteErrorResponse | null;

        setPublishMessage(
          payload?.fieldErrors?.title ??
            payload?.fieldErrors?.content ??
            payload?.error ??
            "Не удалось сохранить обсуждение.",
        );
        return;
      }

      const payload = (await response.json()) as DiscussionMutationResponse;

      markPublishedPostForHighlight(payload.post.id);
      clearTopicDraft();
      setEditingPostId(null);
      setLastSavedSnapshot(getInitialTopicSnapshot());
      setPublishMessage("");

      startTransition(() => {
        router.push("/");
      });
    } catch {
      setPublishMessage("Не удалось сохранить обсуждение.");
    }
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

  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[721px]:min-h-dvh">
      <AppHeader />

      <div className="min-[721px]:pt-[var(--app-header-height)]">
        <DesktopAppShell centerClassName="min-w-0">
          <section className="min-w-0">
            <div className="surface-primary border-separator relative z-30 px-4 py-3">
              <div className="relative z-40 flex items-center justify-between gap-4 text-sm">
                <div className="flex min-w-0 items-center gap-0">
                  <BackNavigationButton onClick={handleBack} />

                  <h1 className="min-w-0 text-[20px] font-bold leading-6 tracking-normal min-[481px]:text-[22px] min-[481px]:leading-7">
                    Новое обсуждение
                  </h1>
                </div>

                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={handleRestoreDraft}
                  className="h-11 px-4 py-2 text-[14px] leading-5 text-[var(--label-primary)]"
                >
                  Черновики
                </Button>
              </div>
            </div>

            <div className="px-2 pb-8 min-[481px]:px-4 min-[481px]:pb-12 md:px-6 min-[721px]:pb-24 lg:px-0">
              <form onSubmit={handlePublish}>
                <div className="surface-card feed-card-surface surface--default flex flex-col gap-6 px-3 py-4 min-[481px]:px-5 sm:px-6">
                  <TopicFormatSwitch
                    value={intent}
                    onChange={(nextIntent) => {
                      setIntent(nextIntent);
                      setPublishMessage("");
                    }}
                  />

                  <div>
                    <TextField className="relative w-full" isInvalid={titleError}>
                      <TextArea
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
                        className="min-h-[54px] w-full resize-none overflow-hidden rounded-[16px] py-4 pl-5 pr-12 text-[16px] leading-6"
                      />
                      <div className="pointer-events-none absolute top-0 right-5 flex items-start">
                        <TitleProgressIndicator
                          currentLength={titleLength}
                          maxLength={TOPIC_TITLE_MAX_LENGTH}
                        />
                      </div>
                      <FieldError>
                        Заголовок обязателен. Он поможет людям быстрее понять тему.
                      </FieldError>
                    </TextField>
                  </div>

                  <div>
                    <TopicEditor
                      content={content}
                      errorMessage="Добавьте текст темы, чтобы людям было на что откликнуться."
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

                  <div>
                    <TopicPicker
                      value={topic}
                      onChange={(nextTopic) => {
                        setTopic(nextTopic);
                        setPublishMessage("");
                      }}
                    />
                  </div>

                  {publishMessage ? (
                    <div>
                      <p className="text-label-secondary text-[14px] leading-6">
                        {publishMessage}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => saveCurrentDraft()}
                      className="cursor-pointer rounded-[24px] px-5 py-3 text-[14px] leading-5 text-[var(--label-primary)]"
                    >
                      Сохранить черновик
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={!canPublish}
                      className="rounded-[24px] px-5 py-3 text-[14px] leading-5"
                    >
                      Опубликовать
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </DesktopAppShell>
      </div>
    </div>
  );
}
