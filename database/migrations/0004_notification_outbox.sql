CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('post.published', 'comment.created')
  ),
  aggregate_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'processed', 'failed')
  ),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL,
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
  ON notification_outbox (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS notification_outbox_aggregate_idx
  ON notification_outbox (event_type, aggregate_id);
