DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_notification_preferences'
      AND column_name = 'bookmarked_post_replies_enabled'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_notification_preferences'
      AND column_name = 'followed_post_replies_enabled'
  ) THEN
    ALTER TABLE user_notification_preferences
      RENAME COLUMN bookmarked_post_replies_enabled TO followed_post_replies_enabled;
  END IF;
END $$;

DO $$
DECLARE
  notification_outbox_event_type_constraint TEXT;
BEGIN
  SELECT conname INTO notification_outbox_event_type_constraint
  FROM pg_constraint
  WHERE conrelid = 'notification_outbox'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%post.published%'
    AND pg_get_constraintdef(oid) NOT LIKE '%author.followed%'
  LIMIT 1;

  IF notification_outbox_event_type_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE notification_outbox DROP CONSTRAINT %I',
      notification_outbox_event_type_constraint
    );

    ALTER TABLE notification_outbox
      ADD CONSTRAINT notification_outbox_event_type_check CHECK (
        event_type IN ('post.published', 'comment.created', 'author.followed')
      );
  END IF;
END $$;
