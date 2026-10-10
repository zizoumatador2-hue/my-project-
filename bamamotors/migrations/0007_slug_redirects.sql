-- Old public slugs of vehicles and blog posts, so a changed slug 301-redirects instead of 404ing.
-- target_id points at the record (not the new slug), so the redirect always resolves to the current slug in one hop.
CREATE TABLE IF NOT EXISTS slug_redirects (
  kind TEXT NOT NULL CHECK (kind IN ('vehicle', 'post')),
  old_slug TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (kind, old_slug)
);
