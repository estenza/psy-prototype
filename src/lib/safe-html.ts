const SAFE_HTTP_URL_PATTERN = /^https?:\/\//i;
const SAFE_IMAGE_SRC_PATTERN = /^(https?:\/\/|data:image\/(?:png|jpeg);base64,)/i;
const SAFE_EMBED_SRC_PATTERN =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)/i;

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
    const safeKind = kind === "video" ? "video" : "iframe";
    return `<div data-embedded-media="true" data-kind="${safeKind}">`;
  }

  if (/^<\s*iframe\b/i.test(tag)) {
    const source = readAttribute(tag, "src");

    if (!source || !SAFE_EMBED_SRC_PATTERN.test(source)) {
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
