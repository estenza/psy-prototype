ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_status_check'
      AND conrelid = 'posts'::regclass
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_status_check
      CHECK (status IN ('published', 'hidden', 'deleted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_status_created_at_idx
  ON posts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL CHECK (object_type IN ('post', 'comment')),
  object_id TEXT NOT NULL,
  post_id TEXT REFERENCES posts (id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES post_comments (id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content_author_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'spam',
      'abuse',
      'illegal',
      'pornography',
      'violence',
      'misleading',
      'politics',
      'other'
    )
  ),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'reviewed', 'dismissed', 'action_taken')
  ),
  resolved_by_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  UNIQUE (object_type, object_id, reporter_user_id),
  CHECK (
    (object_type = 'post' AND post_id = object_id AND comment_id IS NULL)
    OR
    (object_type = 'comment' AND comment_id = object_id AND post_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS content_reports_created_at_idx
  ON content_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_object_type_idx
  ON content_reports (object_type, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_reason_idx
  ON content_reports (reason, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_reporter_user_id_idx
  ON content_reports (reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_content_author_user_id_idx
  ON content_reports (content_author_user_id, created_at DESC);
