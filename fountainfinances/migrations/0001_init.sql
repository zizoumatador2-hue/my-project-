-- Fountain Finances D1 schema
CREATE TABLE IF NOT EXISTS subscribers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  status          TEXT    NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirm_hash    TEXT,
  confirm_expires INTEGER,
  unsub_hash      TEXT,
  source_path     TEXT,
  consent_text    TEXT    NOT NULL,
  created_at      INTEGER NOT NULL,
  confirmed_at    INTEGER,
  unsubscribed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirm ON subscribers (confirm_hash);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsub ON subscribers (unsub_hash);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers (status, created_at);

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  topic       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  source_path TEXT,
  status      TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'answered', 'closed')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages (created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket      TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
