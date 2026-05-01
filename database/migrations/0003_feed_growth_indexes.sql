CREATE INDEX IF NOT EXISTS posts_feed_priority_idx
  ON posts (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS post_reactions_viewer_lookup_idx
  ON post_reactions (user_id, post_id, reaction_type);

CREATE INDEX IF NOT EXISTS user_bookmarked_posts_viewer_lookup_idx
  ON user_bookmarked_posts (user_id, post_id);

CREATE INDEX IF NOT EXISTS user_profile_favorite_posts_viewer_lookup_idx
  ON user_profile_favorite_posts (user_id, post_id);

CREATE INDEX IF NOT EXISTS user_ignored_authors_viewer_lookup_idx
  ON user_ignored_authors (user_id, ignored_user_id);

CREATE INDEX IF NOT EXISTS user_followed_authors_feed_lookup_idx
  ON user_followed_authors (follower_user_id, followed_user_id);
