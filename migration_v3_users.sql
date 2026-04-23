-- Phase 1: introduce auth. Creates users table (if missing) and ensures the
-- username column exists. Username is used as the public identifier
-- persisted in messages.user_id. Safe to re-run.

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If the table already existed from an older schema without username, patch it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

UPDATE users
   SET username = split_part(email, '@', 1)
 WHERE username IS NULL AND email IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END$$;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
