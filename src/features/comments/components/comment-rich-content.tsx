"use client";

import { memo, useEffect, useRef } from "react";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";

type CommentRichContentProps = {
  html: string;
};

const COMMENT_MENTION_PATTERN = /@\[([^[\]|]+)(?:\|([^[\]|]+))?\]/g;
const COMMENT_EMBEDDED_IFRAME_PATTERN =
  /<div\s+data-embedded-media="true"\s+data-kind="iframe">\s*<iframe\b[^>]*\ssrc="([^"]+)"[^>]*><\/iframe>\s*<\/div>/gi;
const INSTAGRAM_EMBEDS_SRC = "https://www.instagram.com/embed.js";
const TELEGRAM_WIDGETS_SRC = "https://telegram.org/js/telegram-widget.js?22";
const TWITTER_WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

declare global {
  interface Window {
    twttr?: {
      ready?: (callback: () => void) => void;
      widgets?: {
        createTweet?: (
          tweetId: string,
          element: HTMLElement,
          options?: {
            dnt?: boolean;
          },
        ) => Promise<HTMLElement | undefined>;
        load?: (element?: HTMLElement) => void;
      };
    };
    instgrm?: {
      Embeds?: {
        process?: () => void;
      };
    };
    __vnutriInstagramEmbedsPromise?: Promise<void>;
    __vnutriTwitterWidgetsPromise?: Promise<void>;
  }
}

function isRenderableIframeSource(source: string) {
  try {
    const url = new URL(source);
    return /\.(mp4|webm|ogg)$/i.test(url.pathname)
      || /\/(?:embed|iframe|player|widget)(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeTweetSource(source: string) {
  try {
    const url = new URL(source);

    if (url.hostname !== "twitter.com" && url.hostname !== "x.com") {
      return null;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const statusIndex = pathParts.findIndex((pathPart) => pathPart === "status");
    const authorHandle = statusIndex > 0 ? pathParts[statusIndex - 1] : "";
    const tweetId = statusIndex >= 0 ? pathParts[statusIndex + 1] : "";

    if (!authorHandle || !/^\d+$/.test(tweetId ?? "")) {
      return null;
    }

    return {
      id: tweetId,
      source: `https://twitter.com/${authorHandle}/status/${tweetId}`,
    };
  } catch {
    return null;
  }
}

function normalizeTelegramSource(source: string) {
  try {
    const url = new URL(source);

    if (url.hostname !== "t.me" && url.hostname !== "telegram.me") {
      return null;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const [firstPart, secondPart, thirdPart] = pathParts;
    const channel = firstPart === "s" ? secondPart : firstPart;
    const postId = firstPart === "s" ? thirdPart : secondPart;

    if (!channel || !/^[a-zA-Z0-9_]+$/.test(channel) || !/^\d+$/.test(postId ?? "")) {
      return null;
    }

    return {
      post: `${channel}/${postId}`,
      source: `https://t.me/${channel}/${postId}`,
    };
  } catch {
    return null;
  }
}

function normalizeInstagramSource(source: string) {
  try {
    const url = new URL(source);

    if (url.hostname !== "instagram.com" && url.hostname !== "www.instagram.com") {
      return null;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const [kind, shortcode] = pathParts;

    if (!["p", "reel", "tv"].includes(kind ?? "") || !shortcode) {
      return null;
    }

    return `https://www.instagram.com/${kind}/${shortcode}/`;
  } catch {
    return null;
  }
}

function normalizeTikTokSource(source: string) {
  try {
    const url = new URL(source);

    if (url.hostname !== "tiktok.com" && url.hostname !== "www.tiktok.com") {
      return null;
    }

    const embeddedVideoId = url.pathname.match(/^\/embed\/v2\/(\d+)/)?.[1];
    const videoId = embeddedVideoId ?? url.pathname.match(/\/video\/(\d+)/)?.[1];

    if (!videoId) {
      return null;
    }

    return {
      id: videoId,
      source: `https://www.tiktok.com/embed/v2/${videoId}`,
    };
  } catch {
    return null;
  }
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderTweetPlaceholder(source: string) {
  const tweet = normalizeTweetSource(source);

  if (!tweet) {
    return renderEmbeddedFallbackLink(source);
  }

  const safeSource = escapeHtmlAttribute(tweet.source);

  return `<div data-embedded-media="true" data-kind="tweet" data-src="${safeSource}"><a href="${safeSource}" rel="nofollow noreferrer noopener" target="_blank">Открыть твит</a></div>`;
}

function renderTelegramPlaceholder(source: string) {
  const telegram = normalizeTelegramSource(source);

  if (!telegram) {
    return renderEmbeddedFallbackLink(source);
  }

  const safeSource = escapeHtmlAttribute(telegram.source);

  return `<div data-embedded-media="true" data-kind="telegram" data-src="${safeSource}"><a href="${safeSource}" rel="nofollow noreferrer noopener" target="_blank">Открыть пост в Telegram</a></div>`;
}

function renderInstagramPlaceholder(source: string) {
  const instagramSource = normalizeInstagramSource(source);

  if (!instagramSource) {
    return renderEmbeddedFallbackLink(source);
  }

  const safeSource = escapeHtmlAttribute(instagramSource);

  return `<div data-embedded-media="true" data-kind="instagram" data-src="${safeSource}"><a href="${safeSource}" rel="nofollow noreferrer noopener" target="_blank">Открыть пост в Instagram</a></div>`;
}

function renderTikTokPlaceholder(source: string) {
  const tiktok = normalizeTikTokSource(source);

  if (!tiktok) {
    return renderEmbeddedFallbackLink(source);
  }

  const safeSource = escapeHtmlAttribute(tiktok.source);

  return `<div data-embedded-media="true" data-kind="tiktok" data-src="${safeSource}"><a href="${safeSource}" rel="nofollow noreferrer noopener" target="_blank">Открыть TikTok</a></div>`;
}

function renderEmbeddedFallbackLink(source: string) {
  return `<p><a href="${source}" rel="nofollow noreferrer noopener" target="_blank">${source}</a></p>`;
}

function decorateCommentHtml(html: string) {
  return html
    .replace(
      COMMENT_EMBEDDED_IFRAME_PATTERN,
      (match, source: string) => {
        if (normalizeTweetSource(source)) {
          return renderTweetPlaceholder(source);
        }

        if (normalizeTelegramSource(source)) {
          return renderTelegramPlaceholder(source);
        }

        if (normalizeInstagramSource(source)) {
          return renderInstagramPlaceholder(source);
        }

        if (normalizeTikTokSource(source)) {
          return renderTikTokPlaceholder(source);
        }

        if (isRenderableIframeSource(source)) {
          return match;
        }

        return renderEmbeddedFallbackLink(source);
      },
    )
    .replace(
      COMMENT_MENTION_PATTERN,
      (_match, mentionLabel: string) => {
      const profilePath = buildPublicProfilePathFromHandle(`@${mentionLabel}`);

      if (!profilePath) {
        return `@${mentionLabel}`;
      }

      return `<a href="${profilePath}">@${mentionLabel}</a>`;
      },
    );
}

function loadInstagramEmbeds() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.instgrm?.Embeds?.process) {
    return Promise.resolve();
  }

  if (window.__vnutriInstagramEmbedsPromise) {
    return window.__vnutriInstagramEmbedsPromise;
  }

  window.__vnutriInstagramEmbedsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${INSTAGRAM_EMBEDS_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = INSTAGRAM_EMBEDS_SRC;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });

  return window.__vnutriInstagramEmbedsPromise;
}

function loadTwitterWidgets() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.twttr?.widgets?.load) {
    return Promise.resolve();
  }

  if (window.__vnutriTwitterWidgetsPromise) {
    return window.__vnutriTwitterWidgetsPromise;
  }

  window.__vnutriTwitterWidgetsPromise = new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;
    let intervalId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const resolveWhenReady = () => {
      if (window.twttr?.widgets?.load) {
        cleanup();

        if (window.twttr.ready) {
          window.twttr.ready(resolve);
          return;
        }

        resolve();
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TWITTER_WIDGETS_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolveWhenReady, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    } else {
      const script = document.createElement("script");
      script.async = true;
      script.charset = "utf-8";
      script.src = TWITTER_WIDGETS_SRC;
      script.addEventListener("load", resolveWhenReady, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    }

    intervalId = window.setInterval(resolveWhenReady, 100);
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Twitter widgets did not become ready."));
    }, 8_000);

    resolveWhenReady();
  });

  return window.__vnutriTwitterWidgetsPromise;
}

function mountTelegramEmbed(embedElement: HTMLElement) {
  if (embedElement.dataset.telegramMounted === "true") {
    return;
  }

  const telegram = normalizeTelegramSource(embedElement.dataset.src ?? "");

  if (!telegram) {
    return;
  }

  const fallbackHtml = embedElement.innerHTML;
  embedElement.dataset.telegramMounted = "true";
  embedElement.innerHTML = "";

  const script = document.createElement("script");
  script.async = true;
  script.src = TELEGRAM_WIDGETS_SRC;
  script.setAttribute("data-telegram-post", telegram.post);
  script.setAttribute("data-width", "100%");
  script.addEventListener(
    "error",
    () => {
      embedElement.innerHTML = fallbackHtml;
      delete embedElement.dataset.telegramMounted;
    },
    { once: true },
  );
  embedElement.appendChild(script);
}

function mountInstagramEmbed(embedElement: HTMLElement) {
  if (embedElement.dataset.instagramMounted === "true") {
    return;
  }

  const instagramSource = normalizeInstagramSource(embedElement.dataset.src ?? "");

  if (!instagramSource) {
    return;
  }

  const safeSource = escapeHtmlAttribute(instagramSource);
  embedElement.dataset.instagramMounted = "true";
  embedElement.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${safeSource}" data-instgrm-version="14"><a href="${safeSource}" rel="nofollow noreferrer noopener" target="_blank">Открыть пост в Instagram</a></blockquote>`;

  void loadInstagramEmbeds()
    .then(() => {
      window.instgrm?.Embeds?.process?.();
    })
    .catch(() => {
      delete embedElement.dataset.instagramMounted;
    });
}

function mountTikTokEmbed(embedElement: HTMLElement) {
  if (embedElement.dataset.tiktokMounted === "true") {
    return;
  }

  const tiktok = normalizeTikTokSource(embedElement.dataset.src ?? "");

  if (!tiktok) {
    return;
  }

  embedElement.dataset.tiktokMounted = "true";
  embedElement.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.src = tiktok.source;
  iframe.title = "TikTok";
  embedElement.appendChild(iframe);
}

function mountTwitterEmbed(embedElement: HTMLElement) {
  if (embedElement.dataset.twitterMounted === "true") {
    return;
  }

  const tweet = normalizeTweetSource(embedElement.dataset.src ?? "");

  if (!tweet) {
    return;
  }

  const safeSource = escapeHtmlAttribute(tweet.source);
  const fallbackHtml = embedElement.innerHTML;
  embedElement.dataset.twitterMounted = "true";
  embedElement.innerHTML = `<blockquote class="twitter-tweet" data-dnt="true"><a href="${safeSource}" rel="nofollow noreferrer noopener" target="_blank">Открыть твит</a></blockquote>`;

  void loadTwitterWidgets()
    .then(() => {
      window.twttr?.widgets?.load?.(embedElement);
    })
    .catch(() => {
      embedElement.innerHTML = fallbackHtml;
      delete embedElement.dataset.twitterMounted;
    });
}

function CommentRichContentComponent({
  html,
}: CommentRichContentProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootElement = rootRef.current;

    if (!rootElement) {
      return;
    }

    const tweetElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>(
        'div[data-embedded-media="true"][data-kind="tweet"][data-src]',
      ),
    );
    const telegramElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>(
        'div[data-embedded-media="true"][data-kind="telegram"][data-src]',
      ),
    );
    const instagramElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>(
        'div[data-embedded-media="true"][data-kind="instagram"][data-src]',
      ),
    );
    const tiktokElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>(
        'div[data-embedded-media="true"][data-kind="tiktok"][data-src]',
      ),
    );

    telegramElements.forEach(mountTelegramEmbed);
    instagramElements.forEach(mountInstagramEmbed);
    tiktokElements.forEach(mountTikTokEmbed);

    if (tweetElements.length === 0) {
      return;
    }

    tweetElements.forEach(mountTwitterEmbed);
  }, [html]);

  return (
    <div
      ref={rootRef}
      className="comment-rich-content text-label-primary w-full text-[16px] leading-6"
      dangerouslySetInnerHTML={{
        __html: decorateCommentHtml(html),
      }}
    />
  );
}

export const CommentRichContent = memo(CommentRichContentComponent);
