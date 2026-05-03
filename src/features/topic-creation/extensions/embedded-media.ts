import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

type EmbeddedMediaKind =
  | "audio"
  | "iframe"
  | "instagram"
  | "telegram"
  | "tiktok"
  | "tweet"
  | "video";

type ResolvedEmbeddedMedia = {
  kind: EmbeddedMediaKind;
  src: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embeddedMedia: {
      setEmbeddedMedia: (url: string) => ReturnType;
    };
  }
}

function getUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractIframeSource(value: string) {
  const decodedValue = decodeHtmlEntities(value);
  const iframeSourceMatch = decodedValue.match(
    /<iframe\b[^>]*\ssrc\s*=\s*(["'])(.*?)\1/i,
  );

  return iframeSourceMatch?.[2]?.trim() ?? null;
}

function readHtmlAttribute(value: string, attributeName: string) {
  const decodedValue = decodeHtmlEntities(value);
  const match = decodedValue.match(
    new RegExp(`\\s${attributeName}\\s*=\\s*(['"])(.*?)\\1`, "i"),
  );

  return match?.[2]?.trim() ?? "";
}

function hasIframeMarkup(value: string) {
  return /<iframe\b/i.test(decodeHtmlEntities(value));
}

function normalizeTweetUrl(value: string) {
  const parsedUrl = getUrl(value);

  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return null;
  }

  if (parsedUrl.hostname !== "twitter.com" && parsedUrl.hostname !== "x.com") {
    return null;
  }

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const statusIndex = pathParts.findIndex((pathPart) => pathPart === "status");
  const authorHandle = statusIndex > 0 ? pathParts[statusIndex - 1] : "";
  const tweetId = statusIndex >= 0 ? pathParts[statusIndex + 1] : "";

  if (!authorHandle || !/^\d+$/.test(tweetId ?? "")) {
    return null;
  }

  return `https://twitter.com/${authorHandle}/status/${tweetId}`;
}

function extractTweetSource(value: string) {
  const decodedValue = decodeHtmlEntities(value);
  const tweetUrlMatch = decodedValue.match(
    /https?:\/\/(?:twitter\.com|x\.com)\/[^"'\s<>]+\/status\/\d+[^"'\s<>]*/i,
  );

  return tweetUrlMatch ? normalizeTweetUrl(tweetUrlMatch[0]) : null;
}

function normalizeTelegramUrl(value: string) {
  const parsedUrl = getUrl(value);

  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return null;
  }

  if (parsedUrl.hostname !== "t.me" && parsedUrl.hostname !== "telegram.me") {
    return null;
  }

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const [firstPart, secondPart, thirdPart] = pathParts;
  const channel = firstPart === "s" ? secondPart : firstPart;
  const postId = firstPart === "s" ? thirdPart : secondPart;

  if (!channel || !/^[a-zA-Z0-9_]+$/.test(channel) || !/^\d+$/.test(postId ?? "")) {
    return null;
  }

  return `https://t.me/${channel}/${postId}`;
}

function extractTelegramSource(value: string) {
  const telegramPost = readHtmlAttribute(value, "data-telegram-post");

  if (/^[a-zA-Z0-9_]+\/\d+$/.test(telegramPost)) {
    return `https://t.me/${telegramPost}`;
  }

  const decodedValue = decodeHtmlEntities(value);
  const telegramUrlMatch = decodedValue.match(
    /https?:\/\/(?:t\.me|telegram\.me)\/(?:s\/)?[a-zA-Z0-9_]+\/\d+/i,
  );

  return telegramUrlMatch ? normalizeTelegramUrl(telegramUrlMatch[0]) : null;
}

function normalizeInstagramUrl(value: string) {
  const parsedUrl = getUrl(value);

  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return null;
  }

  if (parsedUrl.hostname !== "instagram.com" && parsedUrl.hostname !== "www.instagram.com") {
    return null;
  }

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const [kind, shortcode] = pathParts;

  if (!["p", "reel", "tv"].includes(kind ?? "") || !shortcode) {
    return null;
  }

  return `https://www.instagram.com/${kind}/${shortcode}/`;
}

function extractInstagramSource(value: string) {
  const permalink = readHtmlAttribute(value, "data-instgrm-permalink");

  if (permalink) {
    return normalizeInstagramUrl(permalink);
  }

  const decodedValue = decodeHtmlEntities(value);
  const instagramUrlMatch = decodedValue.match(
    /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[a-zA-Z0-9_-]+\/?/i,
  );

  return instagramUrlMatch ? normalizeInstagramUrl(instagramUrlMatch[0]) : null;
}

function normalizeTikTokUrl(value: string) {
  const parsedUrl = getUrl(value);

  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return null;
  }

  if (parsedUrl.hostname !== "tiktok.com" && parsedUrl.hostname !== "www.tiktok.com") {
    return null;
  }

  const videoId =
    parsedUrl.pathname.match(/^\/embed\/v2\/(\d+)/)?.[1]
    ?? parsedUrl.pathname.match(/\/video\/(\d+)/)?.[1];

  if (!videoId) {
    return null;
  }

  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

function extractTikTokSource(value: string) {
  const cite = readHtmlAttribute(value, "cite");

  if (cite) {
    return normalizeTikTokUrl(cite);
  }

  const decodedValue = decodeHtmlEntities(value);
  const tiktokUrlMatch = decodedValue.match(
    /https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\s<>]+\/video\/\d+/i,
  );

  return tiktokUrlMatch ? normalizeTikTokUrl(tiktokUrlMatch[0]) : null;
}

function normalizeEmbeddedMediaUrl(value: string) {
  const trimmedValue = value.trim();
  const iframeSource = extractIframeSource(trimmedValue);
  const mediaUrl = iframeSource ?? trimmedValue;

  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl;
  }

  if (!/^(?:www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]|$)/i.test(mediaUrl)) {
    return null;
  }

  return `https://${mediaUrl}`;
}

function getYouTubeEmbedUrl(url: URL) {
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.replace("/", "");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (url.hostname.includes("youtube.com")) {
    const videoId = url.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  return null;
}

function getVimeoEmbedUrl(url: URL) {
  if (!url.hostname.includes("vimeo.com")) {
    return null;
  }

  const videoId = url.pathname.split("/").filter(Boolean).at(-1);
  return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
}

function getYandexMusicEmbedUrl(url: URL) {
  if (url.hostname !== "music.yandex.ru") {
    return null;
  }

  if (url.pathname.startsWith("/iframe/")) {
    return url.toString();
  }

  if (url.pathname.startsWith("/album/")) {
    return `https://music.yandex.ru/iframe${url.pathname}`;
  }

  return null;
}

function isDirectVideoUrl(url: URL) {
  return /\.(mp4|webm|ogg)$/i.test(url.pathname);
}

function isLikelyEmbedUrl(url: URL) {
  return /\/(?:embed|iframe|player|widget)(?:\/|$)/i.test(url.pathname);
}

export function resolveEmbeddedMedia(url: string): ResolvedEmbeddedMedia | null {
  const tweetUrl = extractTweetSource(url);

  if (tweetUrl) {
    return { kind: "tweet", src: tweetUrl };
  }

  const telegramUrl = extractTelegramSource(url);

  if (telegramUrl) {
    return { kind: "telegram", src: telegramUrl };
  }

  const instagramUrl = extractInstagramSource(url);

  if (instagramUrl) {
    return { kind: "instagram", src: instagramUrl };
  }

  const tiktokUrl = extractTikTokSource(url);

  if (tiktokUrl) {
    return { kind: "tiktok", src: tiktokUrl };
  }

  const isIframeMarkup = hasIframeMarkup(url);
  const normalizedUrl = normalizeEmbeddedMediaUrl(url);
  const parsedUrl = normalizedUrl ? getUrl(normalizedUrl) : null;

  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return null;
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(parsedUrl);

  if (youtubeEmbedUrl) {
    return { kind: "iframe", src: youtubeEmbedUrl };
  }

  const vimeoEmbedUrl = getVimeoEmbedUrl(parsedUrl);

  if (vimeoEmbedUrl) {
    return { kind: "iframe", src: vimeoEmbedUrl };
  }

  const yandexMusicEmbedUrl = getYandexMusicEmbedUrl(parsedUrl);

  if (yandexMusicEmbedUrl) {
    return { kind: "audio", src: yandexMusicEmbedUrl };
  }

  if (isDirectVideoUrl(parsedUrl)) {
    return { kind: "video", src: parsedUrl.toString() };
  }

  if (isIframeMarkup && isLikelyEmbedUrl(parsedUrl)) {
    return { kind: "iframe", src: parsedUrl.toString() };
  }

  return null;
}

export const EmbeddedMedia = Node.create({
  name: "embeddedMedia",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      kind: {
        default: "iframe",
        parseHTML: (element) => (
          element.getAttribute("data-kind")
          ?? element.getAttribute("kind")
          ?? "iframe"
        ),
      },
      src: {
        default: null,
        parseHTML: (element) => (
          element.getAttribute("data-src")
          ?? element.getAttribute("src")
          ?? element.querySelector("iframe, video, a")?.getAttribute("src")
          ?? element.querySelector("a")?.getAttribute("href")
          ?? null
        ),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embedded-media]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes.kind as EmbeddedMediaKind;
    const src = HTMLAttributes.src as string | null;

    if (!src) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-embedded-media": "true" })];
    }

    if (kind === "video") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-embedded-media": "true",
          "data-kind": "video",
        }),
        ["video", { controls: "true", preload: "metadata", src }],
      ];
    }

    if (kind === "audio") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-embedded-media": "true",
          "data-kind": "audio",
        }),
        [
          "iframe",
          {
            allow: "autoplay; clipboard-write; encrypted-media",
            frameborder: "0",
            src,
          },
        ],
      ];
    }

    if (kind === "tweet") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-embedded-media": "true",
          "data-kind": "tweet",
          "data-src": src,
        }),
        ["a", { href: src }, "Открыть твит"],
      ];
    }

    if (kind === "telegram" || kind === "instagram" || kind === "tiktok") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-embedded-media": "true",
          "data-kind": kind,
          "data-src": src,
        }),
        ["a", { href: src }, "Открыть embed"],
      ];
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-embedded-media": "true",
        "data-kind": "iframe",
      }),
      [
        "iframe",
        {
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
          src,
        },
      ],
    ];
  },

  addCommands() {
    return {
      setEmbeddedMedia:
        (url) =>
        ({ commands }) => {
          const resolvedMedia = resolveEmbeddedMedia(url);

          if (!resolvedMedia) {
            return false;
          }

          return commands.insertContent({
            attrs: resolvedMedia,
            type: this.name,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboardText =
              event.clipboardData?.getData("text/plain") ||
              event.clipboardData?.getData("text/html") ||
              "";

            if (!resolveEmbeddedMedia(clipboardText)) {
              return false;
            }

            event.preventDefault();
            return this.editor.commands.setEmbeddedMedia(clipboardText);
          },
        },
      }),
    ];
  },
});
