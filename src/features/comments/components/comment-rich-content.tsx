"use client";

import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";

type CommentRichContentProps = {
  html: string;
};

const COMMENT_MENTION_PATTERN = /@\[([^[\]|]+)(?:\|([^[\]|]+))?\]/g;

function decorateCommentHtml(html: string) {
  return html.replace(
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

export function CommentRichContent({
  html,
}: CommentRichContentProps) {
  return (
    <div
      className="comment-rich-content text-label-primary w-full text-[16px] leading-6"
      dangerouslySetInnerHTML={{
        __html: decorateCommentHtml(html),
      }}
    />
  );
}
