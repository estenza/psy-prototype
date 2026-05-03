"use client";

import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { CommentEmojiPicker } from "@/features/comments/components/comment-emoji-picker";
import {
  TopicEditorBoldIcon,
  TopicEditorEmojiIcon,
  TopicEditorImageIcon,
  TopicEditorQuoteIcon,
  TopicEditorStrikethroughIcon,
  TopicEditorVideoIcon,
} from "@/features/topic-creation/components/topic-creation-icons";
import { EmbeddedMedia } from "@/features/topic-creation/extensions/embedded-media";
import {
  IMAGE_UPLOAD_MAX_SIZE_BYTES,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
  readImageFileAsDataUrl,
} from "@/features/media/lib/image-upload";
import { hasCommentBodyContent } from "@/features/comments/lib/comment-format";

type CommentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  showToolbar?: boolean;
  actions?: ReactNode;
};

type CommentEditorToolbarButtonProps = {
  active?: boolean;
  ariaLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

const COMMENT_IMAGE_UPLOAD_ACCEPT: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
};

const COMMENT_EDITOR_IMAGE_ACCEPT = Object.entries(COMMENT_IMAGE_UPLOAD_ACCEPT)
  .flatMap(([mimeType, extensions]) => [mimeType, ...extensions])
  .join(",");

function getCommentEditorToolbarItemClassName({
  active = false,
  disabled = false,
}: {
  active?: boolean;
  disabled?: boolean;
}) {
  return `flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-transparent text-[var(--label-secondary)] transition-colors ${
    active
      ? "text-[var(--accent-primary)]"
      : "hover:bg-transparent hover:text-[var(--accent-primary)] data-[hovered=true]:bg-transparent data-[hovered=true]:text-[var(--accent-primary)]"
  } ${disabled ? "cursor-default opacity-40" : ""}`.trim();
}

function CommentEditorToolbarButton({
  active = false,
  ariaLabel,
  children,
  disabled = false,
  onClick = () => {},
}: CommentEditorToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={getCommentEditorToolbarItemClassName({ active, disabled })}
    >
      <span className="inline-flex items-center justify-center">{children}</span>
    </button>
  );
}

export function CommentEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  compact = false,
  autoFocus = false,
  showToolbar = false,
  actions,
}: CommentEditorProps) {
  const inputId = useId();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isEmojiPickerMounted, setIsEmojiPickerMounted] = useState(false);
  const editorShellRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiTriggerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerOpenFrameRef = useRef<number | null>(null);
  const emojiPickerUnmountTimeoutRef = useRef<number | null>(null);
  const isEditorEmpty = !hasCommentBodyContent(value);

  const editor = useEditor(
    {
      autofocus: autoFocus && !disabled ? "end" : false,
      content: value,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: `comment-editor-prosemirror min-h-0 pl-4 pr-3 pt-3 pb-2 text-[16px] leading-6 outline-none ${
            compact ? "min-h-[64px]" : "min-h-[72px]"
          }`.trim(),
        },
      },
      extensions: [
        StarterKit.configure({
          bulletList: false,
          code: false,
          codeBlock: false,
          dropcursor: false,
          gapcursor: false,
          heading: false,
          horizontalRule: false,
          listItem: false,
          orderedList: false,
        }),
        Image,
        EmbeddedMedia,
      ],
      onUpdate({ editor: currentEditor }) {
        onChange(currentEditor.getHTML());
      },
    },
    [compact, disabled, autoFocus],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!autoFocus || disabled || !editor) {
      return;
    }

    editor.commands.focus("end");
  }, [autoFocus, disabled, editor]);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsEmojiPickerOpen(false);
      setIsEmojiPickerMounted(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (emojiPickerOpenFrameRef.current !== null) {
        cancelAnimationFrame(emojiPickerOpenFrameRef.current);
      }

      if (emojiPickerUnmountTimeoutRef.current !== null) {
        window.clearTimeout(emojiPickerUnmountTimeoutRef.current);
      }
    };
  }, []);

  function openEmojiPicker() {
    if (disabled) {
      return;
    }

    if (emojiPickerUnmountTimeoutRef.current !== null) {
      window.clearTimeout(emojiPickerUnmountTimeoutRef.current);
      emojiPickerUnmountTimeoutRef.current = null;
    }

    setIsEmojiPickerMounted(true);

    if (emojiPickerOpenFrameRef.current !== null) {
      cancelAnimationFrame(emojiPickerOpenFrameRef.current);
    }

    emojiPickerOpenFrameRef.current = requestAnimationFrame(() => {
      setIsEmojiPickerOpen(true);
      emojiPickerOpenFrameRef.current = null;
    });
  }

  function closeEmojiPicker() {
    setIsEmojiPickerOpen(false);

    if (emojiPickerUnmountTimeoutRef.current !== null) {
      window.clearTimeout(emojiPickerUnmountTimeoutRef.current);
    }

    emojiPickerUnmountTimeoutRef.current = window.setTimeout(() => {
      setIsEmojiPickerMounted(false);
      emojiPickerUnmountTimeoutRef.current = null;
    }, 180);
  }

  useEffect(() => {
    if (!isEmojiPickerOpen || disabled) {
      return;
    }

    let outerFrameId = 0;
    let innerFrameId = 0;

    function findScrollParent(element: HTMLElement | null) {
      let currentElement = element?.parentElement ?? null;

      while (currentElement) {
        const computedStyle = window.getComputedStyle(currentElement);
        const overflowY = computedStyle.overflowY;
        const isScrollable =
          (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
          currentElement.scrollHeight > currentElement.clientHeight;

        if (isScrollable) {
          return currentElement;
        }

        currentElement = currentElement.parentElement;
      }

      return window;
    }

    function ensureEmojiPickerIsVisible() {
      const pickerElement = emojiPickerRef.current;

      if (!pickerElement) {
        return;
      }

      const scrollParent = findScrollParent(editorShellRef.current);
      const pickerRect = pickerElement.getBoundingClientRect();
      const viewportPadding = 12;

      if (scrollParent === window) {
        const overflowBottom = pickerRect.bottom - (window.innerHeight - viewportPadding);

        if (overflowBottom > 0) {
          window.scrollBy({ top: overflowBottom, behavior: "smooth" });
        }

        return;
      }

      const scrollContainer = scrollParent as HTMLElement;
      const scrollParentRect = scrollContainer.getBoundingClientRect();
      const overflowBottom = pickerRect.bottom - (scrollParentRect.bottom - viewportPadding);

      if (overflowBottom > 0) {
        scrollContainer.scrollBy({ top: overflowBottom, behavior: "smooth" });
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target instanceof Node ? event.target : null;

      if (!target) {
        return;
      }

      if (emojiPickerRef.current?.contains(target) || emojiTriggerRef.current?.contains(target)) {
        return;
      }

      closeEmojiPicker();
    }

    outerFrameId = requestAnimationFrame(() => {
      innerFrameId = requestAnimationFrame(ensureEmojiPickerIsVisible);
    });
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      cancelAnimationFrame(outerFrameId);
      cancelAnimationFrame(innerFrameId);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [disabled, isEmojiPickerOpen]);

  function handleImageButtonClick() {
    if (disabled) {
      return;
    }

    imageInputRef.current?.click();
  }

  async function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file || !editor) {
      return;
    }

    if (!(file.type in COMMENT_IMAGE_UPLOAD_ACCEPT)) {
      window.alert("Поддерживаются только JPG, JPEG, PNG и GIF.");
      return;
    }

    if (file.size > IMAGE_UPLOAD_MAX_SIZE_BYTES) {
      window.alert(`Размер файла не должен превышать ${IMAGE_UPLOAD_MAX_SIZE_LABEL}.`);
      return;
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file);

      editor
        .chain()
        .focus()
        .setImage({
          alt: file.name,
          src: imageDataUrl,
        })
        .run();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Не удалось загрузить изображение.",
      );
    }
  }

  function handleVideoButtonClick() {
    if (disabled || !editor) {
      return;
    }

    const requestedUrl = window.prompt(
      "Вставьте embed-ссылку или iframe-код.",
      "https://",
    );

    if (!requestedUrl?.trim()) {
      return;
    }

    const wasInserted = editor
      .chain()
      .focus()
      .setEmbeddedMedia(requestedUrl.trim())
      .run();

    if (!wasInserted) {
      window.alert(
        "Не удалось встроить этот embed. Проверьте ссылку или iframe-код.",
      );
    }
  }

  function handleEmojiSelect(emoji: string) {
    if (!editor) {
      return;
    }

    editor.chain().focus().insertContent(emoji).run();
    closeEmojiPicker();
  }

  return (
    <div
      ref={editorShellRef}
      className="comment-editor-shell relative flex flex-col overflow-visible rounded-[16px]"
      data-disabled={disabled || undefined}
    >
      <input
        ref={imageInputRef}
        id={`${inputId}-image`}
        type="file"
        accept={COMMENT_EDITOR_IMAGE_ACCEPT}
        className="hidden"
        tabIndex={-1}
        onChange={handleImageInputChange}
      />

      {isEditorEmpty ? (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-3 select-none text-[16px] leading-6 text-[var(--field-placeholder)]"
        >
          {placeholder}
        </p>
      ) : null}

      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div
          aria-hidden="true"
          className={`comment-editor-prosemirror min-h-0 pl-4 pr-3 pt-3 pb-2 text-[16px] leading-6 ${
            compact ? "min-h-[64px]" : "min-h-[72px]"
          }`.trim()}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      )}

      {showToolbar || actions ? (
        <div className="flex items-center gap-3 px-2 pb-2">
          {showToolbar ? (
            <div className="min-w-0 flex-1">
              <div className="flex w-max max-w-full items-center gap-0">
                <HoverTooltip label="Загрузить изображение">
                  <CommentEditorToolbarButton
                    ariaLabel="Загрузить изображение"
                    disabled={disabled}
                    onClick={handleImageButtonClick}
                  >
                    <TopicEditorImageIcon />
                  </CommentEditorToolbarButton>
                </HoverTooltip>
                <HoverTooltip label="Встроить видео">
                  <CommentEditorToolbarButton
                    ariaLabel="Встроить видео"
                    active={editor?.isActive("embeddedMedia")}
                    disabled={disabled}
                    onClick={handleVideoButtonClick}
                  >
                    <TopicEditorVideoIcon />
                  </CommentEditorToolbarButton>
                </HoverTooltip>
                <HoverTooltip label="Жирный">
                  <CommentEditorToolbarButton
                    ariaLabel="Жирный"
                    active={editor?.isActive("bold")}
                    disabled={disabled || !editor?.can().chain().focus().toggleBold().run()}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                  >
                    <TopicEditorBoldIcon />
                  </CommentEditorToolbarButton>
                </HoverTooltip>
                <HoverTooltip label="Зачеркнутый">
                  <CommentEditorToolbarButton
                    ariaLabel="Зачеркнутый"
                    active={editor?.isActive("strike")}
                    disabled={disabled || !editor?.can().chain().focus().toggleStrike().run()}
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                  >
                    <TopicEditorStrikethroughIcon />
                  </CommentEditorToolbarButton>
                </HoverTooltip>
                <HoverTooltip label="Цитата">
                  <CommentEditorToolbarButton
                    ariaLabel="Цитата"
                    active={editor?.isActive("blockquote")}
                    disabled={disabled}
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  >
                    <TopicEditorQuoteIcon />
                  </CommentEditorToolbarButton>
                </HoverTooltip>
                <div ref={emojiTriggerRef} className="shrink-0">
                  <HoverTooltip label="Эмодзи">
                    <button
                      type="button"
                      aria-label="Открыть панель эмодзи"
                      disabled={disabled}
                      onClick={() => {
                        if (isEmojiPickerOpen) {
                          closeEmojiPicker();
                          return;
                        }

                        openEmojiPicker();
                      }}
                      className={getCommentEditorToolbarItemClassName({
                        active: isEmojiPickerOpen,
                        disabled,
                      })}
                    >
                      <span
                        className={`inline-flex items-center justify-center ${
                          isEmojiPickerOpen ? "text-[var(--accent-primary)]" : ""
                        }`.trim()}
                      >
                        <TopicEditorEmojiIcon />
                      </span>
                    </button>
                  </HoverTooltip>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {actions ? (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {isEmojiPickerMounted && !disabled ? (
        <div
          ref={emojiPickerRef}
          data-allow-native-wheel="true"
          className={`absolute left-3 top-full z-[200] mt-2 w-[352px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[16px] shadow-[var(--shadow-overlay)] transition-[opacity,transform] duration-200 ease-out ${
            isEmojiPickerOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "-translate-y-1 scale-[0.98] opacity-0 pointer-events-none"
          }`.trim()}
        >
          <CommentEmojiPicker onSelect={handleEmojiSelect} />
        </div>
      ) : null}
    </div>
  );
}
