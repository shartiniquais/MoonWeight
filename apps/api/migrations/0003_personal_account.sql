CREATE TABLE personal_account (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  username TEXT NOT NULL CHECK (username ~ '^[a-z0-9][a-z0-9_.-]{2,31}$'),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
