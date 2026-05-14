import {
  escapeHtml,
  sanitizeRichHtml,
} from "@/lib/safe-html";

const shortMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});
const shortMonthWithYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const russianPluralRules = new Intl.PluralRules("ru");

const commentsCountLabels: Record<Intl.LDMLPluralRule, string> = {
  zero: "комментариев",
  one: "комментарий",
  two: "комментария",
  few: "комментария",
  many: "комментариев",
  other: "комментариев",
};

const repliesCountLabels: Record<Intl.LDMLPluralRule, string> = {
  zero: "комментариев",
  one: "комментарий",
  two: "комментария",
  few: "комментария",
  many: "комментариев",
  other: "комментариев",
};

export { escapeHtml };

export function plainTextToHtml(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue
    .split(/\n{2,}/)
    .map((paragraph) => {
      const withLineBreaks = escapeHtml(paragraph).replace(/\n/g, "<br />");
      return `<p>${withLineBreaks}</p>`;
    })
    .join("");
}

export function sanitizeCommentHtml(value: string) {
  return sanitizeRichHtml(value, { allowEmbeddedMedia: true });
}

export function buildCommentHtml(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return /<\s*[a-z!/][^>]*>/i.test(trimmedValue)
    ? sanitizeCommentHtml(trimmedValue)
    : plainTextToHtml(trimmedValue);
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function getCommentContentTextLength(value: string) {
  return stripHtml(value).length;
}

export function hasCommentBodyContent(value: string) {
  return (
    getCommentContentTextLength(value) > 0 ||
    /<img[\s>]/i.test(value) ||
    /\sdata-embedded-media(?:\s|=|>)/i.test(value) ||
    /<(?:iframe|video)[\s>]/i.test(value)
  );
}

export function getInitials(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return "??";
  }

  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function normalizeCommentHandle(username: string | null | undefined, name: string) {
  if (username && username.trim()) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return name;
}

export function formatCommentCount(value: number) {
  const category = russianPluralRules.select(value);
  const label = commentsCountLabels[category] ?? commentsCountLabels.other;

  return `${value} ${label}`;
}

export function formatReplyCount(value: number) {
  const category = russianPluralRules.select(value);
  const label = repliesCountLabels[category] ?? repliesCountLabels.other;

  return `${value} ${label}`;
}

function formatShortAbsoluteDate(targetDate: Date, now: Date) {
  if (targetDate.getFullYear() === now.getFullYear()) {
    return shortMonthFormatter.format(targetDate);
  }

  return shortMonthWithYearFormatter.format(targetDate);
}

function formatShortRelativeDate(timestampInSeconds: number) {
  const timestampInMilliseconds = timestampInSeconds * 1000;
  const now = new Date();
  const targetDate = new Date(timestampInMilliseconds);
  const deltaInSeconds = Math.max(
    0,
    Math.floor((now.getTime() - timestampInMilliseconds) / 1000),
  );

  if (deltaInSeconds < 60) {
    return `${Math.max(1, deltaInSeconds)} с`;
  }

  if (deltaInSeconds < 60 * 60) {
    return `${Math.max(1, Math.floor(deltaInSeconds / 60))} мин`;
  }

  if (deltaInSeconds < 60 * 60 * 24) {
    return `${Math.max(1, Math.floor(deltaInSeconds / (60 * 60)))} ч`;
  }

  return formatShortAbsoluteDate(targetDate, now);
}

export function formatRelativeDate(timestampInSeconds: number) {
  return formatShortRelativeDate(timestampInSeconds);
}

export function formatRelativeDateCompact(timestampInSeconds: number) {
  return formatShortRelativeDate(timestampInSeconds);
}
