import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  execAuthPostgres,
  isPostgresAuthEnabled,
  runAuthPostgresTransaction,
  type AuthPostgresTransaction,
} from "@/lib/auth-postgres";
import { getDatabase, runDatabaseTransaction } from "@/lib/db";
import type { StorageUnitOfWork } from "@/lib/unit-of-work";
import type { SessionUser } from "@/features/auth/types";

export type DomainEventType = "post.published" | "comment.created" | "author.followed";

export type PostPublishedPayload = {
  actor: SessionUser;
  postId: string;
  title: string;
};

export type CommentCreatedPayload = {
  actor: SessionUser;
  commentId: string;
  parentCommentId: string | null;
  postId: string;
};

export type AuthorFollowedPayload = {
  actor: SessionUser;
  followedUserId: string;
};

export type DomainEvent =
  | {
      aggregateId: string;
      eventType: "post.published";
      payload: PostPublishedPayload;
    }
  | {
      aggregateId: string;
      eventType: "comment.created";
      payload: CommentCreatedPayload;
    }
  | {
      aggregateId: string;
      eventType: "author.followed";
      payload: AuthorFollowedPayload;
    };

export type DomainEventOutboxRow = Record<string, unknown> & {
  attempts: number;
  event_type: DomainEventType;
  id: string;
  payload_json: unknown;
};

export type DomainEventHandler = (row: DomainEventOutboxRow) => Promise<void>;

const DOMAIN_EVENTS_OUTBOX_BATCH_SIZE = 20;
const DOMAIN_EVENTS_OUTBOX_MAX_ATTEMPTS = 5;

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown domain event outbox error.";
}

function buildRetryAvailableAt(attempts: number) {
  const retryDelayMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + retryDelayMs).toISOString();
}

export function readDomainEventPayload<TPayload>(value: unknown) {
  if (typeof value === "string") {
    return JSON.parse(value) as TPayload;
  }

  return value as TPayload;
}

export async function enqueueDomainEventInPostgres(
  transaction: AuthPostgresTransaction,
  event: DomainEvent,
) {
  const timestamp = new Date().toISOString();

  await transaction.query(
    `INSERT INTO notification_outbox (
      id,
      event_type,
      aggregate_id,
      payload_json,
      available_at,
      created_at
    )
    VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [
      randomUUID(),
      event.eventType,
      event.aggregateId,
      JSON.stringify(event.payload),
      timestamp,
      timestamp,
    ],
  );
}

export function enqueueDomainEventInSqlite(
  database: DatabaseSync,
  event: DomainEvent,
) {
  const timestamp = new Date().toISOString();

  database
    .prepare(
      `INSERT INTO notification_outbox (
        id,
        event_type,
        aggregate_id,
        payload_json,
        available_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      event.eventType,
      event.aggregateId,
      JSON.stringify(event.payload),
      timestamp,
      timestamp,
    );
}

export async function enqueueDomainEvent(unitOfWork: StorageUnitOfWork, event: DomainEvent) {
  if (unitOfWork.kind === "postgres") {
    await enqueueDomainEventInPostgres(unitOfWork.transaction, event);
    return;
  }

  enqueueDomainEventInSqlite(unitOfWork.database, event);
}

async function claimPostgresOutboxRows(limit: number) {
  return runAuthPostgresTransaction(async (transaction) => {
    const result = await transaction.query<DomainEventOutboxRow>(
      `SELECT id, event_type, payload_json, attempts
       FROM notification_outbox
       WHERE status = 'pending'
         AND available_at <= NOW()
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );

    for (const row of result.rows) {
      await transaction.query(
        `UPDATE notification_outbox
         SET status = 'processing',
             attempts = attempts + 1,
             processing_started_at = $2,
             last_error = NULL
         WHERE id = $1`,
        [row.id, new Date().toISOString()],
      );
    }

    return result.rows;
  });
}

function claimSqliteOutboxRows(limit: number) {
  return runDatabaseTransaction((database) => {
    const rows = database
      .prepare(
        `SELECT id, event_type, payload_json, attempts
         FROM notification_outbox
         WHERE status = 'pending'
           AND available_at <= ?
         ORDER BY created_at ASC
         LIMIT ?`,
      )
      .all(new Date().toISOString(), limit) as DomainEventOutboxRow[];

    const processingStartedAt = new Date().toISOString();
    const markProcessing = database.prepare(
      `UPDATE notification_outbox
       SET status = 'processing',
           attempts = attempts + 1,
           processing_started_at = ?,
           last_error = NULL
       WHERE id = ?`,
    );

    rows.forEach((row) => {
      markProcessing.run(processingStartedAt, row.id);
    });

    return rows;
  });
}

async function markPostgresOutboxRowProcessed(id: string) {
  await execAuthPostgres(
    `UPDATE notification_outbox
     SET status = 'processed',
         processed_at = $2
     WHERE id = $1`,
    [id, new Date().toISOString()],
  );
}

function markSqliteOutboxRowProcessed(id: string) {
  getDatabase()
    .prepare(
      `UPDATE notification_outbox
       SET status = 'processed',
           processed_at = ?
       WHERE id = ?`,
    )
    .run(new Date().toISOString(), id);
}

async function markPostgresOutboxRowFailed(row: DomainEventOutboxRow, error: unknown) {
  const nextAttempts = row.attempts + 1;
  const status = nextAttempts >= DOMAIN_EVENTS_OUTBOX_MAX_ATTEMPTS ? "failed" : "pending";

  await execAuthPostgres(
    `UPDATE notification_outbox
     SET status = $2,
         available_at = $3,
         last_error = $4
     WHERE id = $1`,
    [
      row.id,
      status,
      buildRetryAvailableAt(nextAttempts),
      readErrorMessage(error),
    ],
  );
}

function markSqliteOutboxRowFailed(row: DomainEventOutboxRow, error: unknown) {
  const nextAttempts = row.attempts + 1;
  const status = nextAttempts >= DOMAIN_EVENTS_OUTBOX_MAX_ATTEMPTS ? "failed" : "pending";

  getDatabase()
    .prepare(
      `UPDATE notification_outbox
       SET status = ?,
           available_at = ?,
           last_error = ?
       WHERE id = ?`,
    )
    .run(
      status,
      buildRetryAvailableAt(nextAttempts),
      readErrorMessage(error),
      row.id,
    );
}

export async function processDomainEventOutbox(
  handleEvent: DomainEventHandler,
  limit = DOMAIN_EVENTS_OUTBOX_BATCH_SIZE,
) {
  const rows = isPostgresAuthEnabled()
    ? await claimPostgresOutboxRows(limit)
    : claimSqliteOutboxRows(limit);

  let processed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await handleEvent(row);

      if (isPostgresAuthEnabled()) {
        await markPostgresOutboxRowProcessed(row.id);
      } else {
        markSqliteOutboxRowProcessed(row.id);
      }

      processed += 1;
    } catch (error) {
      console.error("[domain-events/outbox]", error);

      if (isPostgresAuthEnabled()) {
        await markPostgresOutboxRowFailed(row, error);
      } else {
        markSqliteOutboxRowFailed(row, error);
      }

      failed += 1;
    }
  }

  return {
    claimed: rows.length,
    failed,
    processed,
  };
}
