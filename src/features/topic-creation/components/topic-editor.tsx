"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import {
  TopicEditorBoldIcon,
  TopicEditorBulletListIcon,
  TopicEditorImageIcon,
  TopicEditorLinkIcon,
  TopicEditorOrderedListIcon,
  TopicEditorQuoteIcon,
  TopicEditorSpoilerIcon,
  TopicEditorStrikethroughIcon,
  TopicEditorVideoIcon,
} from "@/features/topic-creation/components/topic-creation-icons";
import { EmbeddedMedia } from "@/features/topic-creation/extensions/embedded-media";
import { SpoilerMark } from "@/features/topic-creation/extensions/spoiler-mark";
import { hasTopicBodyContent } from "@/features/topic-creation/lib/draft-storage";

type TopicEditorProps = {
  content: string;
  invalid?: boolean;
  onBlur?: () => void;
  onChange: (nextContent: string) => void;
  placeholder: string;
};

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

function ToolbarButton({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`interactive-control group/tooltip relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[24px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? "bg-[var(--fill-secondary)]" : ""
      }`}
    >
      <span className="inline-flex items-center justify-center">{icon}</span>
      <HoverTooltip label={label} />
    </button>
  );
}

export function TopicEditor({
  content,
  invalid = false,
  onBlur,
  onChange,
  placeholder,
}: TopicEditorProps) {
  const isEditorEmpty = !hasTopicBodyContent(content);
  const pendingPasteScrollPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  function restorePasteScrollPosition() {
    const savedPosition = pendingPasteScrollPositionRef.current;

    if (!savedPosition) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(savedPosition.x, savedPosition.y);
        pendingPasteScrollPositionRef.current = null;
      });
    });
  }

  const editor = useEditor(
    {
      content,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "min-h-[112px] px-5 pb-5 pt-2 text-[16px] leading-6",
        },
        handleDOMEvents: {
          paste: () => {
            pendingPasteScrollPositionRef.current = {
              x: window.scrollX,
              y: window.scrollY,
            };

            return false;
          },
        },
        handleScrollToSelection: () => {
          if (!pendingPasteScrollPositionRef.current) {
            return false;
          }

          restorePasteScrollPosition();
          return true;
        },
      },
      extensions: [
        StarterKit.configure({
          code: false,
          codeBlock: false,
          dropcursor: false,
          gapcursor: false,
          heading: false,
          horizontalRule: false,
        }),
        Link.configure({
          autolink: false,
          defaultProtocol: "https",
          openOnClick: false,
        }),
        Image,
        SpoilerMark,
        EmbeddedMedia,
      ],
      onBlur() {
        onBlur?.();
      },
      onUpdate({ editor: currentEditor }) {
        onChange(currentEditor.getHTML());

        if (pendingPasteScrollPositionRef.current) {
          restorePasteScrollPosition();
        }
      },
    },
    [placeholder],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  function handleLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const requestedUrl = window.prompt(
      "Введите ссылку. Пустое значение удалит текущую ссылку.",
      previousUrl ?? "https://",
    );

    if (requestedUrl === null) {
      return;
    }

    if (!requestedUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalizeUrl(requestedUrl.trim()) })
      .run();
  }

  function handleImage() {
    if (!editor) {
      return;
    }

    const requestedUrl = window.prompt(
      "Вставьте прямую ссылку на изображение.",
      "https://",
    );

    if (!requestedUrl?.trim()) {
      return;
    }

    editor.chain().focus().setImage({ src: normalizeUrl(requestedUrl.trim()) }).run();
  }

  function handleVideo() {
    if (!editor) {
      return;
    }

    const requestedUrl = window.prompt(
      "Вставьте ссылку на YouTube, Vimeo или прямой mp4/webm/ogg.",
      "https://",
    );

    if (!requestedUrl?.trim()) {
      return;
    }

    const wasInserted = editor
      .chain()
      .focus()
      .setEmbeddedMedia(normalizeUrl(requestedUrl.trim()))
      .run();

    if (!wasInserted) {
      window.alert(
        "Не удалось встроить это видео. Используйте ссылку на YouTube, Vimeo или прямой видеофайл.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="topic-editor-shell overflow-hidden rounded-[16px]">
        <div className="flex flex-wrap items-center gap-0 px-3 py-2">
          <ToolbarButton
            label="Жирный"
            icon={<TopicEditorBoldIcon />}
            disabled={editor ? !editor.can().chain().focus().toggleBold().run() : false}
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Зачеркнутый"
            icon={<TopicEditorStrikethroughIcon />}
            disabled={editor ? !editor.can().chain().focus().toggleStrike().run() : false}
            active={editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />
          <ToolbarButton
            label="Цитата"
            icon={<TopicEditorQuoteIcon />}
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton
            label="Ссылка"
            icon={<TopicEditorLinkIcon />}
            active={editor?.isActive("link")}
            onClick={handleLink}
          />
          <ToolbarButton
            label="Изображение"
            icon={<TopicEditorImageIcon />}
            onClick={handleImage}
          />
          <ToolbarButton
            label="Видео"
            icon={<TopicEditorVideoIcon />}
            onClick={handleVideo}
          />
          <ToolbarButton
            label="Спойлер"
            icon={<TopicEditorSpoilerIcon />}
            active={editor?.isActive("spoiler")}
            onClick={() => editor?.chain().focus().toggleSpoiler().run()}
          />
          <ToolbarButton
            label="Нумерованный список"
            icon={<TopicEditorOrderedListIcon />}
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="Маркированный список"
            icon={<TopicEditorBulletListIcon />}
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
        </div>

        <div className="topic-editor-content relative">
          {isEditorEmpty ? (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute left-5 top-2 text-[16px] leading-6 text-[var(--label-quaternary)]"
            >
              {placeholder}
            </p>
          ) : null}
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div
              aria-hidden="true"
              className="ProseMirror min-h-[112px] px-5 pb-5 pt-2 text-[16px] leading-6"
            >
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {invalid ? (
        <p className="text-[14px] leading-5 text-[var(--accent-like)]">
          Добавьте текст темы, чтобы людям было на что откликнуться.
        </p>
      ) : null}
    </div>
  );
}
