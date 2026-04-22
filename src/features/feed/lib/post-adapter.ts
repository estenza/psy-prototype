import { formatRelativeDate, formatRelativeDateCompact } from "@/features/comments/lib/comment-format";
import type { ApiPostRecord, Post } from "@/features/feed/types";

function formatPostPublishedAtLabel(createdAtIso: string) {
  return formatRelativeDate(
    Math.floor(new Date(createdAtIso).getTime() / 1000),
  );
}

function formatPostCompactPublishedAtLabel(createdAtIso: string) {
  return formatRelativeDateCompact(
    Math.floor(new Date(createdAtIso).getTime() / 1000),
  );
}

export function mapApiPostToPost(record: ApiPostRecord): Post {
  return {
    id: record.id,
    createdAt: new Date(record.created_at_iso),
    intent: record.intent,
    topic: record.topic,
    author: {
      id: record.author.id,
      name: record.author.display_name,
      handle: record.author.username,
      avatarUrl: record.author.avatar_url,
    },
    activity: {
      publishedAtLabel: formatPostPublishedAtLabel(record.created_at_iso),
      compactPublishedAtLabel: formatPostCompactPublishedAtLabel(record.created_at_iso),
      lastCommentAtLabel: record.timeline.last_comment_at_label,
      lastCommentAuthor: record.timeline.last_comment_author,
    },
    content: {
      title: record.body.title,
      excerpt: record.body.excerpt,
    },
    stats: {
      comments: record.counters.comments,
      likes: record.counters.likes,
    },
    viewer: {
      isAuthor: false,
      liked: record.viewer_state.liked,
      bookmarked: record.viewer_state.bookmarked,
    },
    media:
      record.body.media?.kind === "image"
        ? {
            type: "image",
            src: record.body.media.url,
            alt: record.body.media.alt_text,
          }
        : undefined,
  };
}

export function mapApiPostsToFeed(records: ApiPostRecord[]): Post[] {
  return records.map(mapApiPostToPost);
}
