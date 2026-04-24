"use client";

import {
  ErrorMessage,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import Link from "next/link";
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
import { TOPIC_FORMAT_META } from "@/features/topic-creation/constants";
import { useAuthRequiredModal } from "@/features/auth/components/auth-required-provider";
import { TopicFormatSwitch } from "@/features/topic-creation/components/topic-format-switch";
import { TopicPicker } from "@/features/topic-creation/components/topic-picker";
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
import type { TopicDraftFields, TopicFieldKey, TopicFormat } from "@/features/topic-creation/types";
import type { TopicFormatFieldConfig } from "@/features/topic-creation/constants";
import type { DiscussionMutationResponse, DiscussionRouteErrorResponse } from "@/features/feed/types";
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

function getActiveFieldConfig(topic: PostTopic | null, format: TopicFormat): TopicFormatFieldConfig[] {
  if (topic === "free-topic") {
    return [
      {
        key: "primary",
        label: "Заголовок",
        placeholder: "Коротко обозначьте, о чём хотите написать",
        rows: 2,
      },
      {
        key: "secondary",
        label: "Ваш текст",
        placeholder: "Расскажите, что у вас происходит",
        rows: 6,
      },
    ] as const;
  }

  return TOPIC_FORMAT_META[format].fields;
}

function buildDiscussionBodyHtml(
  topic: PostTopic | null,
  format: TopicFormat,
  fields: TopicDraftFields,
) {
  const activeFields = getActiveFieldConfig(topic, format);

  if (topic === "free-topic") {
    const bodyField = activeFields.find((field) => field.key === "secondary");
    const value = bodyField ? fields[bodyField.key].trim() : "";

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
  topic: PostTopic | null;
}) {
  const title = params.fields.primary.trim();
  const content = buildDiscussionBodyHtml(params.topic, params.format, params.fields);

  return {
    content,
    editingPostId: params.editingPostId,
    fields: params.fields,
    format: params.format,
    guestEmail: params.guestEmail,
    intent: TOPIC_FORMAT_META[params.format].legacyIntent,
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
    <TextField isInvalid={Boolean(error)} className="field-surface-default grid gap-2 text-sm">
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
    <TextField isInvalid={Boolean(error)} className="field-surface-default grid gap-2 text-sm">
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
  topic,
}: {
  fields: TopicDraftFields;
  format: TopicFormat;
  guestEmail: string;
  topic: PostTopic | null;
}) {
  const emptyDraft = createEmptyTopicDraft();
  const hasVisibleFormatSelection = topic !== "free-topic";

  return (
    hasMeaningfulTopicDraft({ fields })
    || topic !== emptyDraft.topic
    || (hasVisibleFormatSelection && format !== emptyDraft.format)
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
  const [editingPostId, setEditingPostId] = useState<string | null>(initialDraft.editingPostId);
  const [guestEmail, setGuestEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const returnTo = normalizeCreateTopicReturnTo(searchParams.get("returnTo"));
  const activeFields = getActiveFieldConfig(topic, format);
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
      topic,
    });

    if (hasRestorableTopicFormState({
      fields,
      format,
      guestEmail,
      topic,
    })) {
      saveTopicDraft(nextDraft);
      return;
    }

    clearTopicDraft();
  }, [editingPostId, fields, format, guestEmail, hasInitializedDraft, topic]);

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
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      topic: undefined,
    }));
  }

  function updateFormat(nextFormat: TopicFormat) {
    setFormat(nextFormat);
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
        nextErrors[field.key] = "Это поле лучше заполнить, чтобы людям было проще откликнуться.";
      }
    });

    if (!user) {
      const normalizedEmail = guestEmail.trim();

      if (!normalizedEmail) {
        nextErrors.guestEmail = "Введите email, чтобы войти и опубликовать.";
      } else if (!isValidEmail(normalizedEmail)) {
        nextErrors.guestEmail = "Похоже, email введён с ошибкой.";
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
        editingPostId ? `/api/discussions/${editingPostId}` : "/api/discussions",
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
        (await response.json()) as DiscussionMutationResponse | DiscussionRouteErrorResponse;

      if (!response.ok) {
        const errorPayload = payload as DiscussionRouteErrorResponse;
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          ...(errorPayload.fieldErrors ?? {}),
        }));
        throw new Error(errorPayload.error ?? "Не удалось сохранить обсуждение.");
      }

      const successPayload = payload as DiscussionMutationResponse;

      clearTopicDraft();
      setEditingPostId(null);

      toast.success(editingPostId ? "Обсуждение обновлено" : "Обсуждение опубликовано");
      startTransition(() => {
        router.push(`/discussions/${successPayload.post.id}`);
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить обсуждение.";
      toast.danger(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[721px]:min-h-dvh">
      <AppHeader />

      <div className="min-[721px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
        >
          <section className="min-w-0">
            <PageHeader
              onBack={handleBack}
              title={isEditing ? "Редактировать обсуждение" : "Новое обсуждение"}
              titleAs="h2"
              action={(
                <Link
                  href="/drafts"
                  className="text-[14px] leading-5 font-medium text-[var(--label-primary)] underline decoration-[color:var(--underline-primary)] underline-offset-4 transition-colors hover:text-[var(--accent-primary)]"
                >
                  Черновики
                </Link>
              )}
            />

            <div className="px-2 pb-8 min-[481px]:px-3 min-[481px]:pb-12 min-[721px]:px-0 min-[721px]:pb-24">
              <form
                onSubmit={handleSubmit}
                className="surface--default surface-card flex flex-col gap-6 rounded-[28px] p-6"
              >
                <div className="grid gap-3">
                  <TopicPicker value={topic ?? "free-topic"} onChange={updateTopic} />
                  {topic !== "free-topic" ? (
                    <TopicFormatSwitch value={format} onChange={updateFormat} />
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
                      label="Email"
                      onChange={(value) => {
                        setGuestEmail(value);
                        setFieldErrors((currentErrors) => ({
                          ...currentErrors,
                          guestEmail: undefined,
                        }));
                      }}
                      placeholder="Куда отправить код для входа"
                      value={guestEmail}
                    />
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="relative !h-11 min-w-[220px] !rounded-full"
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
