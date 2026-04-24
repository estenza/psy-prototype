"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Button as HeroButton, FieldError, ScrollShadow } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import {
  TopicEditorBoldIcon,
  TopicEditorBulletListIcon,
  TopicEditorEmojiIcon,
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
  errorMessage?: string;
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
    <HoverTooltip label={label}>
      <HeroButton
        type="button"
        isIconOnly
        variant="ghost"
        isDisabled={disabled}
        onClick={onClick}
        aria-label={label}
        className={`h-9 w-9 min-w-9 rounded-[10px] bg-transparent p-0 text-[var(--label-secondary)] transition-colors hover:bg-transparent hover:text-[var(--accent-primary)] data-[hovered=true]:bg-transparent data-[hovered=true]:text-[var(--accent-primary)] ${
          active
            ? "text-[var(--accent-primary)]"
            : ""
        }`}
      >
        <span className="inline-flex items-center justify-center">{icon}</span>
      </HeroButton>
    </HoverTooltip>
  );
}

export function TopicEditor({
  content,
  errorMessage = "Добавьте текст темы, чтобы людям было на что откликнуться.",
  invalid = false,
  onBlur,
  onChange,
  placeholder,
}: TopicEditorProps) {
  const { theme } = useAppTheme();
  const isEditorEmpty = !hasTopicBodyContent(content);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerPortalRef = useRef<HTMLDivElement | null>(null);
  const emojiTriggerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerDidEnterRef = useRef(false);
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
          class: "min-h-[112px] px-4 pb-5 pt-2 text-[16px] leading-6",
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

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      emojiPickerDidEnterRef.current = false;
      return;
    }

    let frameId = 0;
    let cleanupScrollListener: (() => void) | undefined;
    let cleanupScrollObserver: (() => void) | undefined;

    function ensureScrollShadowStyles(shadowRoot: ShadowRoot) {
      if (shadowRoot.querySelector('style[data-codex-emoji-scroll-shadow="true"]')) {
        return;
      }

      const styleElement = document.createElement("style");

      styleElement.setAttribute("data-codex-emoji-scroll-shadow", "true");
      styleElement.textContent = `
        :host {
          display: block !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
        }

        #root {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          overflow: hidden !important;
        }

        .scroll {
          --scroll-shadow-size: 56px;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          flex: 1 1 auto !important;
        }

        .scroll[data-top-scroll="true"] {
          mask-image: linear-gradient(0deg, #000 calc(100% - var(--scroll-shadow-size)), transparent);
          -webkit-mask-image: linear-gradient(0deg, #000 calc(100% - var(--scroll-shadow-size)), transparent);
        }

        .scroll[data-bottom-scroll="true"] {
          mask-image: linear-gradient(180deg, #000 calc(100% - var(--scroll-shadow-size)), transparent);
          -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - var(--scroll-shadow-size)), transparent);
        }

        .scroll[data-top-bottom-scroll="true"] {
          mask-image: linear-gradient(
            #000,
            #000,
            transparent 0,
            #000 var(--scroll-shadow-size),
            #000 calc(100% - var(--scroll-shadow-size)),
            transparent
          );
          -webkit-mask-image: linear-gradient(
            #000,
            #000,
            transparent 0,
            #000 var(--scroll-shadow-size),
            #000 calc(100% - var(--scroll-shadow-size)),
            transparent
          );
        }
      `;

      shadowRoot.appendChild(styleElement);
    }

    function updateScrollShadow(scrollElement: HTMLElement) {
      const hasScrollBefore = scrollElement.scrollTop > 0;
      const hasScrollAfter =
        scrollElement.scrollTop + scrollElement.clientHeight < scrollElement.scrollHeight - 1;

      delete scrollElement.dataset.topScroll;
      delete scrollElement.dataset.bottomScroll;
      delete scrollElement.dataset.topBottomScroll;

      if (hasScrollBefore && hasScrollAfter) {
        scrollElement.dataset.topBottomScroll = "true";
        return;
      }

      scrollElement.dataset.topScroll = String(hasScrollBefore);
      scrollElement.dataset.bottomScroll = String(hasScrollAfter);
    }

    function positionEmojiPicker() {
      const triggerElement = emojiTriggerRef.current;
      const portalElement = emojiPickerPortalRef.current;
      const pickerHost = emojiPickerRef.current?.firstElementChild as HTMLElement | null;
      const shadowRoot = pickerHost?.shadowRoot ?? null;
      const rootElement = shadowRoot?.querySelector("#root") as HTMLElement | null;
      const scrollElement = shadowRoot?.querySelector(".scroll") as HTMLElement | null;

      if (!triggerElement || !portalElement || !pickerHost) {
        frameId = requestAnimationFrame(positionEmojiPicker);
        return;
      }

      const gap = 8;
      const margin = 12;
      const minHeight = 160;
      const maxViewportHeight = window.innerHeight - margin * 2;
      const maxPickerHeight = 320;
      const preferredWidth = 352;
      const triggerRect = triggerElement.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const spaceBelow = window.innerHeight - triggerRect.bottom - gap - margin;
      const spaceAbove = triggerRect.top - gap - margin;
      const openAbove = spaceAbove >= minHeight || spaceAbove >= spaceBelow;
      const availableHeight = openAbove ? spaceAbove : spaceBelow;
      const safeAvailableHeight = Math.max(availableHeight, 0);
      const preferredClampedHeight = Math.min(
        maxPickerHeight,
        maxViewportHeight,
        safeAvailableHeight || maxViewportHeight,
      );
      const minimumFittingHeight = Math.min(minHeight, safeAvailableHeight || maxViewportHeight);
      const height = Math.max(preferredClampedHeight, minimumFittingHeight);
      const width = Math.min(preferredWidth, window.innerWidth - margin * 2);
      const centeredLeft = triggerRect.left + triggerRect.width / 2 - width / 2;
      const left = Math.min(
        Math.max(centeredLeft, margin),
        window.innerWidth - width - margin,
      );
      const unclampedTop = openAbove
        ? triggerRect.top - gap - height
        : triggerRect.bottom + gap;
      const top = Math.min(
        Math.max(unclampedTop, margin),
        window.innerHeight - height - margin,
      );

      portalElement.style.left = `${left + scrollX}px`;
      portalElement.style.top = `${top + scrollY}px`;
      portalElement.style.width = `${width}px`;
      portalElement.style.minWidth = `${width}px`;
      portalElement.style.maxWidth = `${width}px`;
      portalElement.style.height = `${height}px`;
      portalElement.style.minHeight = `${height}px`;
      portalElement.style.maxHeight = `${height}px`;
      portalElement.style.overflow = "hidden";
      portalElement.style.borderRadius = "16px";
      portalElement.style.boxShadow = "var(--shadow-overlay)";
      portalElement.style.transition =
        "opacity 150ms var(--ease-smooth), transform 150ms var(--ease-smooth)";
      portalElement.style.willChange = "opacity, transform";
      portalElement.style.transformOrigin = openAbove ? "bottom center" : "top center";

      pickerHost.style.setProperty("display", "block", "important");
      pickerHost.style.setProperty("width", "100%", "important");
      pickerHost.style.setProperty("min-width", "100%", "important");
      pickerHost.style.setProperty("max-width", "100%", "important");
      pickerHost.style.setProperty("height", `${height}px`, "important");
      pickerHost.style.setProperty("min-height", "0", "important");
      pickerHost.style.setProperty("max-height", `${height}px`, "important");
      pickerHost.style.setProperty("overflow", "hidden", "important");

      if (rootElement) {
        rootElement.style.setProperty("display", "flex", "important");
        rootElement.style.setProperty("flex-direction", "column", "important");
        rootElement.style.setProperty("height", `${height}px`, "important");
        rootElement.style.setProperty("min-height", "0", "important");
        rootElement.style.setProperty("max-height", `${height}px`, "important");
        rootElement.style.setProperty("overflow", "hidden", "important");
      }

      if (scrollElement) {
        scrollElement.style.setProperty("height", "auto", "important");
        scrollElement.style.setProperty("min-height", "0", "important");
        scrollElement.style.setProperty("max-height", "none", "important");
        scrollElement.style.setProperty("flex", "1 1 auto", "important");
        scrollElement.style.setProperty("overflow-y", "auto", "important");
        scrollElement.style.setProperty("overflow-x", "hidden", "important");
      }

      if (shadowRoot && (!rootElement || !scrollElement)) {
        frameId = requestAnimationFrame(positionEmojiPicker);
      }

      if (!emojiPickerDidEnterRef.current) {
        portalElement.style.opacity = "0";
        portalElement.style.transform = openAbove
          ? "translateY(4px) scale(0.9)"
          : "translateY(-4px) scale(0.9)";
        portalElement.style.visibility = "visible";

        requestAnimationFrame(() => {
          const currentPortalElement = emojiPickerPortalRef.current;

          if (!currentPortalElement) {
            return;
          }

          currentPortalElement.style.opacity = "1";
          currentPortalElement.style.transform = "translateY(0) scale(1)";
          emojiPickerDidEnterRef.current = true;
        });
      } else {
        portalElement.style.opacity = "1";
        portalElement.style.transform = "translateY(0) scale(1)";
        portalElement.style.visibility = "visible";
      }

      if (shadowRoot) {
        ensureScrollShadowStyles(shadowRoot);
      }

      if (scrollElement && !cleanupScrollListener) {
        const handleScroll = () => updateScrollShadow(scrollElement);
        const resizeObserver = new ResizeObserver(handleScroll);

        scrollElement.addEventListener("scroll", handleScroll, { passive: true });
        resizeObserver.observe(scrollElement);

        cleanupScrollListener = () => {
          scrollElement.removeEventListener("scroll", handleScroll);
        };
        cleanupScrollObserver = () => {
          resizeObserver.disconnect();
        };
      }

      if (scrollElement) {
        updateScrollShadow(scrollElement);
      }
    }

    function schedulePositionUpdate() {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(positionEmojiPicker);
    }

    schedulePositionUpdate();

    window.addEventListener("resize", schedulePositionUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      cleanupScrollListener?.();
      cleanupScrollObserver?.();
      window.removeEventListener("resize", schedulePositionUpdate);
    };
  }, [isEmojiPickerOpen]);

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

  function handleEmojiSelect(selection: { native?: string } | null | undefined) {
    if (!editor) {
      return;
    }

    const emoji = selection?.native;

    if (!emoji) {
      return;
    }

    editor.chain().focus().insertContent(emoji).run();
    setIsEmojiPickerOpen(false);
  }

  const emojiPickerPortal =
    typeof document !== "undefined" && isEmojiPickerOpen
      ? createPortal(
          <div
            ref={emojiPickerPortalRef}
            className="absolute z-[200]"
            style={{
              left: 0,
              top: 0,
              opacity: 0,
              transform: "translateY(0) scale(1)",
              visibility: "hidden",
            }}
          >
            <div ref={emojiPickerRef}>
              <Picker
                data={data}
                icons="solid"
                locale="ru"
                previewPosition="none"
                skinTonePosition="none"
                theme={theme}
                onEmojiSelect={handleEmojiSelect}
                onClickOutside={() => setIsEmojiPickerOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="space-y-3">
      <div
        className="topic-editor-shell relative overflow-visible rounded-[16px]"
        data-invalid={invalid || undefined}
      >
        <ScrollShadow
          orientation="horizontal"
          hideScrollBar
          size={48}
          className="px-2 py-2"
        >
          <div className="flex w-max min-w-full flex-nowrap items-center gap-0 min-[721px]:w-auto min-[721px]:min-w-0 min-[721px]:flex-wrap">
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
            <div ref={emojiTriggerRef} className="relative">
              <div aria-label="Эмодзи">
                <ToolbarButton
                  label="Эмодзи"
                  icon={<TopicEditorEmojiIcon />}
                  active={isEmojiPickerOpen}
                  onClick={() => setIsEmojiPickerOpen((currentValue) => !currentValue)}
                />
              </div>
            </div>
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
        </ScrollShadow>

        <div className="topic-editor-content relative">
          {isEditorEmpty ? (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-2 select-none text-[16px] leading-6 text-[var(--field-placeholder)]"
            >
              {placeholder}
            </p>
          ) : null}
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div
              aria-hidden="true"
              className="ProseMirror min-h-[112px] px-4 pb-5 pt-2 text-[16px] leading-6"
            >
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {invalid ? <FieldError>{errorMessage}</FieldError> : null}
      </div>
      {emojiPickerPortal}
    </>
  );
}
