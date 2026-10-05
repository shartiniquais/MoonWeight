-- Keep the original timestamp for lossless migration review. New dates use UTC
-- calendar dates; the old app did not store the user's originating timezone.
ALTER TABLE weight_entries RENAME COLUMN date TO recorded_at_legacy;
ALTER TABLE weight_entries ADD COLUMN date DATE;
UPDATE weight_entries SET date = (recorded_at_legacy AT TIME ZONE 'UTC')::date;
ALTER TABLE weight_entries ALTER COLUMN date SET NOT NULL;
ALTER TABLE weight_entries ALTER COLUMN recorded_at_legacy DROP NOT NULL;
ALTER TABLE weight_entries ALTER COLUMN weight_kg TYPE NUMERIC(7, 3);
ALTER TABLE weight_entries ADD CONSTRAINT valid_weight CHECK (weight_kg >= 0.1 AND weight_kg <= 1000);
ALTER TABLE weight_entries ADD CONSTRAINT valid_note CHECK (note IS NULL OR char_length(note) <= 500);
ALTER TABLE weight_entries ADD CONSTRAINT valid_calendar_date CHECK (date >= DATE '1900-01-01');
DROP INDEX weight_entries_date_idx;
CREATE INDEX weight_entries_date_idx ON weight_entries (date DESC, created_at DESC, id DESC);

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  target_weight_kg NUMERIC(7,3) CHECK (target_weight_kg >= 0.1 AND target_weight_kg <= 1000)
);
INSERT INTO app_settings (id) VALUES (1);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

