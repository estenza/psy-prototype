ALTER TABLE users ADD COLUMN IF NOT EXISTS specialist_gender TEXT CHECK (specialist_gender IS NULL OR specialist_gender IN ('female', 'male'));
