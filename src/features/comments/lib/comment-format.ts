const relativeTimeFormatter = new Intl.RelativeTimeFormat("ru", {
  numeric: "auto",
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
  zero: "ответов",
  one: "ответ",
  two: "ответа",
  few: "ответа",
  many: "ответов",
  other: "ответов",
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

export function formatRelativeDate(timestampInSeconds: number) {
  const timestampInMilliseconds = timestampInSeconds * 1000;
  const deltaInSeconds = Math.round(
    (timestampInMilliseconds - Date.now()) / 1000,
  );

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, unitInSeconds] of units) {
    if (Math.abs(deltaInSeconds) >= unitInSeconds || unit === "second") {
      const value = Math.round(deltaInSeconds / unitInSeconds);
      return relativeTimeFormatter.format(value, unit);
    }
  }

  return relativeTimeFormatter.format(0, "second");
}
