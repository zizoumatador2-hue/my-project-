-- Admin audit log: one row per sensitive admin action (who, when, what changed, why).
-- Timestamps are Unix seconds, matching the other tables.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL,
  actor       TEXT    NOT NULL,
  action      TEXT    NOT NULL,
  target_type TEXT    NOT NULL,
  target_id   TEXT    NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  reason      TEXT,
  ip_hash     TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_log (actor, created_at);
