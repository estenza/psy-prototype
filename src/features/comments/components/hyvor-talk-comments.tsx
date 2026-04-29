"use client";

import { createElement, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const HYVOR_TALK_WEBSITE_ID = "15244";
const HYVOR_TALK_EMBED_SRC = "https://talk.hyvor.com/embed/embed.js";
const HYVOR_TALK_FOCUS_RESET_CSS = `
  :host,
  * {
    outline: none !important;
  }

  *:focus,
  *:focus-visible,
  *:focus-within,
  article:focus,
  article:focus-visible,
  article:focus-within,
  [tabindex]:focus,
  [tabindex]:focus-visible,
  [tabindex]:focus-within {
    outline: none !important;
  }
`;

type HyvorTalkElement = HTMLElement & {
  shadowRoot: ShadowRoot | null;
};

type HyvorTalkCommentsProps = {
  pageId: string;
  className?: string;
};

export function HyvorTalkComments({
  pageId,
  className = "",
}: HyvorTalkCommentsProps) {
  const pathname = usePathname();
  const commentsRef = useRef<HyvorTalkElement | null>(null);
  const resolvedPageId =
    pageId.trim() || pathname || "post:current-page";

  useEffect(() => {
    const commentsElement = commentsRef.current;

    if (!commentsElement) {
      return;
    }

    let animationFrameId = 0;
    let cleanupShadowBindings: (() => void) | null = null;

    function isEditableElement(element: HTMLElement | null) {
      if (!element) {
        return false;
      }

      if (element.matches("input, textarea, select")) {
        return true;
      }

      return element.closest('[contenteditable="true"]') !== null;
    }

    function blurIfNeeded(target: EventTarget | null, root: ShadowRoot) {
      if (!(target instanceof HTMLElement) || isEditableElement(target)) {
        return;
      }

      window.requestAnimationFrame(() => {
        const activeElement =
          root.activeElement instanceof HTMLElement ? root.activeElement : null;

        if (activeElement && !isEditableElement(activeElement)) {
          activeElement.blur();
        }

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
    }

    function bindShadowRoot() {
      const currentCommentsElement = commentsRef.current;

      if (!currentCommentsElement) {
        return;
      }

      const shadowRoot = currentCommentsElement.shadowRoot;

      if (!shadowRoot) {
        animationFrameId = window.requestAnimationFrame(bindShadowRoot);
        return;
      }

      if (!shadowRoot.querySelector('style[data-codex-hyvor-focus-reset="true"]')) {
        const styleElement = document.createElement("style");
        styleElement.dataset.codexHyvorFocusReset = "true";
        styleElement.textContent = HYVOR_TALK_FOCUS_RESET_CSS;
        shadowRoot.appendChild(styleElement);
      }

      const handleFocusIn = (event: Event) => {
        blurIfNeeded(event.target, shadowRoot);
      };

      const handlePointerUp = (event: Event) => {
        blurIfNeeded(event.target, shadowRoot);
      };

      shadowRoot.addEventListener("focusin", handleFocusIn, true);
      shadowRoot.addEventListener("pointerup", handlePointerUp, true);

      cleanupShadowBindings = () => {
        shadowRoot.removeEventListener("focusin", handleFocusIn, true);
        shadowRoot.removeEventListener("pointerup", handlePointerUp, true);
      };
    }

    bindShadowRoot();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      cleanupShadowBindings?.();
    };
  }, [resolvedPageId]);

  return (
    <div className={className}>
      <Script
        id="hyvor-talk-embed"
        src={HYVOR_TALK_EMBED_SRC}
        type="module"
        strategy="afterInteractive"
      />
      {createElement("hyvor-talk-comments", {
        key: resolvedPageId,
        ref: commentsRef,
        "website-id": HYVOR_TALK_WEBSITE_ID,
        "page-id": resolvedPageId,
      })}
    </div>
  );
}
