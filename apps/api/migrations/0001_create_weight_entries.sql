CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY,
  weight_kg NUMERIC(6, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weight_entries_date_idx ON weight_entries (date DESC);
