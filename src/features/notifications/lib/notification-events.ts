import "server-only";

import {
  processDomainEventOutbox,
  readDomainEventPayload,
  type AuthorFollowedPayload,
  type CommentCreatedPayload,
  type DomainEventOutboxRow,
  type PostPublishedPayload,
} from "@/lib/domain-events/outbox";
import {
  createAuthorFollowedNotification,
  createCommentNotifications,
  createPostPublishedNotifications,
} from "@/features/notifications/lib/notifications-repository";

async function handleNotificationDomainEvent(row: DomainEventOutboxRow) {
  if (row.event_type === "post.published") {
    const payload = readDomainEventPayload<PostPublishedPayload>(row.payload_json);

    await createPostPublishedNotifications({
      actor: payload.actor,
      postId: payload.postId,
      title: payload.title,
    });
    return;
  }

  if (row.event_type === "comment.created") {
    const payload = readDomainEventPayload<CommentCreatedPayload>(row.payload_json);

    await createCommentNotifications({
      actor: payload.actor,
      commentId: payload.commentId,
      parentCommentId: payload.parentCommentId,
      postId: payload.postId,
    });
    return;
  }

  if (row.event_type === "author.followed") {
    const payload = readDomainEventPayload<AuthorFollowedPayload>(row.payload_json);

    await createAuthorFollowedNotification({
      actor: payload.actor,
      followedUserId: payload.followedUserId,
    });
    return;
  }

  throw new Error(`Unsupported notification domain event: ${row.event_type}`);
}

export async function processNotificationEvents(limit?: number) {
  return await processDomainEventOutbox(handleNotificationDomainEvent, limit);
}
