const SAFE_HTTP_URL_PATTERN = /^https?:\/\//i;
const SAFE_IMAGE_SRC_PATTERN = /^(https?:\/\/|data:image\/(?:png|jpeg|gif);base64,)/i;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readAttribute(tag: string, attributeName: string) {
  const match = tag.match(new RegExp(`\\s${attributeName}\\s*=\\s*(['"])(.*?)\\1`, "i"));
  return match?.[2]?.trim() ?? "";
}

function getSafeTweetSource(source: string) {
  try {
    const url = new URL(source);

    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }

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

    return `https://twitter.com/${authorHandle}/status/${tweetId}`;
  } catch {
    return null;
  }
}

function getSafeTelegramSource(source: string) {
  try {
    const url = new URL(source);

    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }

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

    return `https://t.me/${channel}/${postId}`;
  } catch {
    return null;
  }
}

function getSafeInstagramSource(source: string) {
  try {
    const url = new URL(source);

    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }

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

function getSafeTikTokSource(source: string) {
  try {
    const url = new URL(source);

    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }

    if (url.hostname === "www.tiktok.com" || url.hostname === "tiktok.com") {
      const videoId =
        url.pathname.match(/^\/embed\/v2\/(\d+)/)?.[1]
        ?? url.pathname.match(/\/video\/(\d+)/)?.[1];
      return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function sanitizeImageTag(tag: string) {
  const source = readAttribute(tag, "src");

  if (!source || !SAFE_IMAGE_SRC_PATTERN.test(source)) {
    return "";
  }

  const alt = readAttribute(tag, "alt");

  return `<img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" />`;
}

function sanitizeAnchorTag(tag: string) {
  const href = readAttribute(tag, "href");

  if (!href || !SAFE_HTTP_URL_PATTERN.test(href)) {
    return "";
  }

  return `<a href="${escapeHtml(href)}" rel="nofollow noreferrer noopener" target="_blank">`;
}

function sanitizeEmbeddedMediaTag(tag: string) {
  if (/^<\s*\/\s*div\s*>$/i.test(tag)) {
    return "</div>";
  }

  if (/^<\s*div\b/i.test(tag) && /\sdata-embedded-media(?:\s|=|>)/i.test(tag)) {
    const kind = readAttribute(tag, "data-kind") || readAttribute(tag, "kind") || "iframe";
    const safeKind = (
      kind === "audio"
      || kind === "instagram"
      || kind === "telegram"
      || kind === "tiktok"
      || kind === "tweet"
      || kind === "video"
    )
      ? kind
      : "iframe";

    if (safeKind === "tweet") {
      const source = getSafeTweetSource(
        readAttribute(tag, "data-src") || readAttribute(tag, "src"),
      );

      if (!source) {
        return "";
      }

      return `<div data-embedded-media="true" data-kind="tweet" data-src="${escapeHtml(source)}">`;
    }

    if (safeKind === "telegram" || safeKind === "instagram" || safeKind === "tiktok") {
      const source = readAttribute(tag, "data-src") || readAttribute(tag, "src");
      const safeSource = safeKind === "telegram"
        ? getSafeTelegramSource(source)
        : safeKind === "instagram"
          ? getSafeInstagramSource(source)
          : getSafeTikTokSource(source);

      if (!safeSource) {
        return "";
      }

      return `<div data-embedded-media="true" data-kind="${safeKind}" data-src="${escapeHtml(safeSource)}">`;
    }

    return `<div data-embedded-media="true" data-kind="${safeKind}">`;
  }

  if (/^<\s*iframe\b/i.test(tag)) {
    const source = readAttribute(tag, "src");

    if (!source || !SAFE_HTTP_URL_PATTERN.test(source)) {
      return "";
    }

    return `<iframe src="${escapeHtml(source)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="true" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }

  if (/^<\s*video\b/i.test(tag)) {
    const source = readAttribute(tag, "src");

    if (!source || !SAFE_HTTP_URL_PATTERN.test(source)) {
      return "";
    }

    return `<video controls="true" preload="metadata" src="${escapeHtml(source)}"></video>`;
  }

  if (/^<\s*\/\s*(?:iframe|video)\s*>$/i.test(tag)) {
    return "";
  }

  return "";
}

function sanitizeRichHtmlTag(tag: string, { allowEmbeddedMedia }: { allowEmbeddedMedia: boolean }) {
  if (/^<\s*br\s*\/?\s*>$/i.test(tag)) {
    return "<br />";
  }

  if (/^<\s*p\s*>$/i.test(tag)) {
    return "<p>";
  }

  if (/^<\s*\/\s*p\s*>$/i.test(tag)) {
    return "</p>";
  }

  if (/^<\s*(?:strong|b)\s*>$/i.test(tag)) {
    return "<strong>";
  }

  if (/^<\s*\/\s*(?:strong|b)\s*>$/i.test(tag)) {
    return "</strong>";
  }

  if (/^<\s*(?:s|strike|del)\s*>$/i.test(tag)) {
    return "<s>";
  }

  if (/^<\s*\/\s*(?:s|strike|del)\s*>$/i.test(tag)) {
    return "</s>";
  }

  if (/^<\s*blockquote\s*>$/i.test(tag)) {
    return "<blockquote>";
  }

  if (/^<\s*\/\s*blockquote\s*>$/i.test(tag)) {
    return "</blockquote>";
  }

  if (/^<\s*(?:ul|ol|li)\s*>$/i.test(tag)) {
    return tag.toLowerCase();
  }

  if (/^<\s*\/\s*(?:ul|ol|li)\s*>$/i.test(tag)) {
    return tag.toLowerCase();
  }

  if (/^<\s*span\b/i.test(tag) && /\sdata-spoiler\s*=\s*(['"])true\1/i.test(tag)) {
    return '<span data-spoiler="true">';
  }

  if (/^<\s*\/\s*span\s*>$/i.test(tag)) {
    return "</span>";
  }

  if (/^<\s*a\b/i.test(tag)) {
    return sanitizeAnchorTag(tag);
  }

  if (/^<\s*\/\s*a\s*>$/i.test(tag)) {
    return "</a>";
  }

  if (/^<\s*img\b/i.test(tag)) {
    return sanitizeImageTag(tag);
  }

  if (allowEmbeddedMedia) {
    return sanitizeEmbeddedMediaTag(tag);
  }

  return "";
}

export function sanitizeRichHtml(
  value: string,
  options: {
    allowEmbeddedMedia?: boolean;
  } = {},
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const tagPattern = /<[^>]*>/g;
  let sanitized = "";
  let lastIndex = 0;

  for (const match of trimmedValue.matchAll(tagPattern)) {
    const currentIndex = match.index ?? 0;

    sanitized += escapeHtml(trimmedValue.slice(lastIndex, currentIndex));
    sanitized += sanitizeRichHtmlTag(match[0], {
      allowEmbeddedMedia: Boolean(options.allowEmbeddedMedia),
    });
    lastIndex = currentIndex + match[0].length;
  }

  sanitized += escapeHtml(trimmedValue.slice(lastIndex));

  return sanitized.trim();
}
