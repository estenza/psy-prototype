"use client";

import {
  ErrorMessage,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "@heroui/react";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DEFAULT_POST_SUBTOPIC } from "@/constants/post-taxonomy";
import {
  SUBTOPIC_FIELD_HINTS,
  TOPIC_FORMAT_META,
} from "@/features/topic-creation/constants";
import { useAuthRequiredModal } from "@/features/auth/components/auth-required-provider";
import { TopicPicker } from "@/features/topic-creation/components/topic-picker";
import { TopicSubtopicPicker } from "@/features/topic-creation/components/topic-subtopic-picker";
import {
  clearTopicDraft,
  consumeTopicDraftRestoreRequest,
  createEmptyTopicDraft,
  hasMeaningfulTopicDraft,
  readStoredTopicDraft,
  requestTopicDraftRestore,
  saveTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";
import {
  getCurrentPathWithSearchAndHash,
  normalizeCreateTopicReturnTo,
} from "@/features/topic-creation/lib/create-topic-navigation";
import { buildPostHref } from "@/features/feed/lib/post-navigation";
import type { TopicDraftFields, TopicFieldKey, TopicFormat } from "@/features/topic-creation/types";
import type { TopicFormatFieldConfig } from "@/features/topic-creation/constants";
import type { PostMutationResponse, PostRouteErrorResponse } from "@/features/feed/types";
import type { PostTopic } from "@/types/post-taxonomy";

const MIN_SUBMIT_LOADING_MS = 1000;

type FieldErrors = Partial<Record<TopicFieldKey | "guestEmail" | "topic", string>>;

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getActiveFieldConfig(
  _topic: PostTopic | null,
  format: TopicFormat,
  subtopic: string,
): TopicFormatFieldConfig[] {
  if (subtopic === DEFAULT_POST_SUBTOPIC) {
    return [
      {
        key: "primary",
        label: "Заголовок",
        placeholder: "Коротко обозначьте, что хотите обсудить",
        rows: 2,
      },
      {
        key: "secondary",
        label: "Текст",
        optional: true,
        placeholder: "Расскажите, что происходит и какой отклик вам сейчас нужен",
        rows: 6,
      },
    ];
  }

  const hints = subtopic ? SUBTOPIC_FIELD_HINTS[subtopic] : undefined;

  return TOPIC_FORMAT_META[format].fields.map((field) => ({
    ...field,
    optional: field.key !== "primary",
    ...(hints?.[field.key] ?? {}),
    ...(field.key === "primary" ? { label: "Заголовок" } : {}),
  }));
}

function buildPostBodyHtml(
  topic: PostTopic | null,
  format: TopicFormat,
  fields: TopicDraftFields,
  subtopic: string,
) {
  const activeFields = getActiveFieldConfig(topic, format, subtopic);

  if (subtopic === DEFAULT_POST_SUBTOPIC) {
    const value = fields.secondary.trim();

    if (!value) {
      return "";
    }

    return `<p>${escapeHtml(value).replace(/\n/g, "<br />")}</p>`;
  }

  const sections = activeFields
    .filter((field) => field.key !== "primary")
    .map((field) => {
      const value = fields[field.key].trim();

      if (!value) {
        return "";
      }

      const normalizedValue = escapeHtml(value).replace(/\n/g, "<br />");

      return `
        <section>
          <p><strong>${escapeHtml(field.label)}</strong></p>
          <p>${normalizedValue}</p>
        </section>
      `.trim();
    })
    .filter(Boolean);

  return sections.join("");
}

function buildDraftPayload(params: {
  editingPostId: string | null;
  fields: TopicDraftFields;
  format: TopicFormat;
  guestEmail: string;
  subtopic: string;
  topic: PostTopic | null;
}) {
  const title = params.fields.primary.trim();
  const content = buildPostBodyHtml(
    params.topic,
    params.format,
    params.fields,
    params.subtopic,
  );

  return {
    content,
    editingPostId: params.editingPostId,
    fields: params.fields,
    format: params.format,
    guestEmail: params.guestEmail,
    intent: TOPIC_FORMAT_META[params.format].legacyIntent,
    subtopics: [params.subtopic],
    title,
    topic: params.topic,
    updatedAt: new Date().toISOString(),
  };
}

function GuidedTextField({
  error,
  label,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextField isInvalid={Boolean(error)} className="grid gap-2 text-sm">
      <Label className="pl-1 text-[14px] leading-5 font-medium text-[var(--label-primary)]">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[48px] w-full rounded-[16px] px-4 py-[11px] text-[16px] leading-6 shadow-none"
      />
      {error ? (
        <ErrorMessage className="mt-0.5 text-[14px] leading-5 text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}

function GuidedTextareaField({
  error,
  label,
  onChange,
  placeholder,
  rows = 3,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const MIN_TEXTAREA_HEIGHT = 156;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.minHeight = `${MIN_TEXTAREA_HEIGHT}px`;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  return (
    <TextField isInvalid={Boolean(error)} className="grid gap-2 text-sm">
      <Label className="pl-1 text-[14px] leading-5 font-medium text-[var(--label-primary)]">
        {label}
      </Label>
      <TextArea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          event.currentTarget.style.minHeight = `${MIN_TEXTAREA_HEIGHT}px`;
          event.currentTarget.style.height = "0px";
          event.currentTarget.style.height = `${Math.max(event.currentTarget.scrollHeight, MIN_TEXTAREA_HEIGHT)}px`;
        }}
        placeholder={placeholder}
        className="w-full resize-none overflow-hidden rounded-[16px] px-4 py-4 text-[16px] leading-6 shadow-none"
      />
      {error ? (
        <ErrorMessage className="mt-0.5 text-[14px] leading-5 text-[var(--danger)]">
          {error}
        </ErrorMessage>
      ) : null}
    </TextField>
  );
}

function wasLoadedByPageReload() {
  if (typeof window === "undefined") {
    return false;
  }

  const [navigationEntry] = window.performance.getEntriesByType("navigation");

  return Boolean(navigationEntry)
    && "type" in navigationEntry
    && navigationEntry.type === "reload";
}

function hasRestorableTopicFormState({
  fields,
  format,
  guestEmail,
  subtopic,
  topic,
}: {
  fields: TopicDraftFields;
  format: TopicFormat;
  guestEmail: string;
  subtopic: string;
  topic: PostTopic | null;
}) {
  const emptyDraft = createEmptyTopicDraft();

  return (
    hasMeaningfulTopicDraft({ fields })
    || topic !== emptyDraft.topic
    || format !== emptyDraft.format
    || subtopic !== (emptyDraft.subtopics[0] ?? DEFAULT_POST_SUBTOPIC)
    || guestEmail.trim().length > 0
  );
}

export function CreateTopicScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openAuthModal, user } = useAuthRequiredModal();
  const initialDraft = createEmptyTopicDraft();
  const [fields, setFields] = useState<TopicDraftFields>(initialDraft.fields);
  const [format, setFormat] = useState<TopicFormat>(initialDraft.format);
  const [topic, setTopic] = useState<PostTopic | null>(initialDraft.topic);
  const [subtopic, setSubtopic] = useState<string>(
    initialDraft.subtopics[0] ?? DEFAULT_POST_SUBTOPIC,
  );
  const [editingPostId, setEditingPostId] = useState<string | null>(initialDraft.editingPostId);
  const [guestEmail, setGuestEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const returnTo = normalizeCreateTopicReturnTo(searchParams.get("returnTo"));
  const activeFields = getActiveFieldConfig(topic, format, subtopic);
  const isEditing = Boolean(editingPostId);
  const submitLabel = user
    ? (isEditing ? "Сохранить" : "Опубликовать")
    : "Войти и опубликовать";

  useEffect(() => {
    const shouldRestoreDraft = typeof window !== "undefined"
      && (consumeTopicDraftRestoreRequest() || wasLoadedByPageReload());
    const storedDraft = shouldRestoreDraft
      ? readStoredTopicDraft()
      : null;

    if (storedDraft) {
      setFields(storedDraft.fields);
      setFormat(storedDraft.format);
      setTopic(storedDraft.topic);
      setSubtopic(storedDraft.subtopics[0] ?? DEFAULT_POST_SUBTOPIC);
      setEditingPostId(storedDraft.editingPostId);
      setGuestEmail(storedDraft.guestEmail);
    }

    setHasInitializedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasInitializedDraft) {
      return;
    }

    const nextDraft = buildDraftPayload({
      editingPostId,
      fields,
      format,
      guestEmail,
      subtopic,
      topic,
    });

    if (hasRestorableTopicFormState({
      fields,
      format,
      guestEmail,
      subtopic,
      topic,
    })) {
      saveTopicDraft(nextDraft);
      return;
    }

    clearTopicDraft();
  }, [editingPostId, fields, format, guestEmail, hasInitializedDraft, subtopic, topic]);

  function updateField(key: TopicFieldKey, value: string) {
    setFields((currentFields) => ({
      ...currentFields,
      [key]: value,
    }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[key]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [key]: undefined,
      };
    });
  }

  function updateTopic(nextTopic: PostTopic | null) {
    setTopic(nextTopic);
    setSubtopic(DEFAULT_POST_SUBTOPIC);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      topic: undefined,
    }));
  }

  function handleBack() {
    startTransition(() => {
      if (returnTo) {
        router.push(returnTo);
        return;
      }

      if (window.history.length > 1) {
        router.back();
        return;
      }

      router.push("/");
    });
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    activeFields.forEach((field) => {
      if (!field.optional && !fields[field.key].trim()) {
        nextErrors[field.key] = "Напишите хотя бы немного";
      }
    });

    if (!user) {
      const normalizedEmail = guestEmail.trim();

      if (!normalizedEmail) {
        nextErrors.guestEmail = "Введите email, чтобы войти и опубликовать";
      } else if (!isValidEmail(normalizedEmail)) {
        nextErrors.guestEmail = "Похоже, email введён с ошибкой";
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const nextDraft = buildDraftPayload({
      editingPostId,
      fields,
      format,
      guestEmail,
      subtopic,
      topic,
    });

    if (!user) {
      saveTopicDraft(nextDraft);
      requestTopicDraftRestore();
      openAuthModal({
        initialEmail: guestEmail.trim(),
        nextHref: getCurrentPathWithSearchAndHash(),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const loadingDelay = new Promise((resolve) => {
        window.setTimeout(resolve, MIN_SUBMIT_LOADING_MS);
      });
      const responsePromise = fetch(
        editingPostId ? `/api/posts/${editingPostId}` : "/api/posts",
        {
          method: editingPostId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: nextDraft.content,
            intent: nextDraft.intent,
            title: nextDraft.title,
            topic: nextDraft.topic,
          }),
        },
      );
      const [response] = await Promise.all([responsePromise, loadingDelay]);
      const payload =
        (await response.json()) as PostMutationResponse | PostRouteErrorResponse;

      if (!response.ok) {
        const errorPayload = payload as PostRouteErrorResponse;
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          ...(errorPayload.fieldErrors ?? {}),
        }));
        throw new Error(errorPayload.error ?? "Не удалось сохранить пост.");
      }

      const successPayload = payload as PostMutationResponse;
      const wasEditing = Boolean(editingPostId);
      const postHref = buildPostHref(successPayload.post.id, returnTo);

      clearTopicDraft();
      setEditingPostId(null);

      toast.success(wasEditing ? "Пост обновлён" : "Пост опубликован");
      startTransition(() => {
        if (wasEditing) {
          router.replace(postHref);
          return;
        }

        router.push(postHref);
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить пост.";
      toast.danger(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[481px]:min-h-dvh">
      <AppHeader />

      <div className="min-[481px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
        >
          <section className="min-w-0">
            <PageHeader
              onBack={handleBack}
              title={isEditing ? "Редактировать пост" : "Что хотите обсудить?"}
              titleAs="h2"
            />

            <div className="px-0 pb-8 min-[481px]:pb-24">
              <form
                onSubmit={handleSubmit}
                className="surface-card flex flex-col gap-6 rounded-[28px] p-3 min-[481px]:p-6"
              >
                <div className="grid gap-3">
                  <TopicPicker value={topic ?? "emotions"} onChange={updateTopic} />
                  {topic ? (
                    <TopicSubtopicPicker
                      topic={topic}
                      value={subtopic}
                      onChange={setSubtopic}
                    />
                  ) : null}
                </div>

                <div className="grid gap-5">
                  {activeFields.map((field, index) => {
                    const commonProps = {
                      error: fieldErrors[field.key],
                      label: field.label,
                      onChange: (value: string) => updateField(field.key, value),
                      placeholder: field.placeholder,
                      value: fields[field.key],
                    };
                    const isSingleLineField = index === 0;

                    return isSingleLineField ? (
                      <GuidedTextField
                        key={field.key}
                        {...commonProps}
                      />
                    ) : (
                      <GuidedTextareaField
                        key={field.key}
                        {...commonProps}
                        rows={field.rows ?? 3}
                      />
                    );
                  })}

                  {!user ? (
                    <GuidedTextField
                      error={fieldErrors.guestEmail}
                      label="Оставьте ваш Email"
                      onChange={(value) => {
                        setGuestEmail(value);
                        setFieldErrors((currentErrors) => ({
                          ...currentErrors,
                          guestEmail: undefined,
                        }));
                      }}
                      placeholder="example@mail.com"
                      value={guestEmail}
                    />
                  ) : null}
                </div>

                <div className="flex justify-start">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="relative !h-11 w-full min-w-[220px] !rounded-full min-[481px]:w-auto"
                  >
                    <span className={isSubmitting ? "opacity-0" : ""}>{submitLabel}</span>
                    {isSubmitting ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
                        <Spinner size="sm" color="current" />
                      </span>
                    ) : null}
                  </Button>
                </div>
              </form>
            </div>
          </section>
        </DesktopAppShell>
      </div>
    </div>
  );
}
