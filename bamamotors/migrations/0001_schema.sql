-- BamaMotors core schema (Cloudflare D1 / SQLite).
-- All timestamps are ISO-8601 UTC strings. Money is stored in whole cents (INTEGER).
PRAGMA foreign_keys = ON;

-- ───────────────────────── Identity ─────────────────────────
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'consumer' CHECK (role IN ('consumer','dealer','admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  -- Public author profile (used for blog bylines / E-E-A-T). Only filled for real staff.
  author_slug   TEXT UNIQUE,
  author_title  TEXT,
  author_bio    TEXT,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_users_role ON users(role, status);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,               -- SHA-256 of the cookie token (raw token never stored)
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE password_resets (
  id          TEXT PRIMARY KEY,               -- SHA-256 of the emailed token
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ───────────────────────── Reference data ─────────────────────────
CREATE TABLE cities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,            -- e.g. birmingham-al
  name        TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'AL',
  county      TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  intro       TEXT,                            -- unique, hand-written SEO intro (markdown)
  body        TEXT,                            -- long-form local buying guide (markdown)
  faq_json    TEXT,                            -- [{q,a}]
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE zip_codes (
  zip   TEXT PRIMARY KEY CHECK (length(zip) = 5),
  city  TEXT NOT NULL,
  state TEXT NOT NULL,
  lat   REAL NOT NULL,
  lng   REAL NOT NULL
);

CREATE TABLE makes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  is_popular  INTEGER NOT NULL DEFAULT 0,
  intro       TEXT
);

CREATE TABLE models (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  make_id   INTEGER NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  slug      TEXT NOT NULL,
  name      TEXT NOT NULL,
  body_type TEXT,
  intro     TEXT,
  UNIQUE (make_id, slug)
);

-- ───────────────────────── Dealers ─────────────────────────
CREATE TABLE dealers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  address       TEXT NOT NULL,
  city_id       INTEGER REFERENCES cities(id),
  city_name     TEXT NOT NULL,
  zip           TEXT NOT NULL,
  lat           REAL,
  lng           REAL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','basic','pro')),
  is_featured   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_dealers_status ON dealers(status, is_featured);
CREATE INDEX idx_dealers_city ON dealers(city_id);

CREATE TABLE dealer_profiles (
  dealer_id     INTEGER PRIMARY KEY REFERENCES dealers(id) ON DELETE CASCADE,
  description   TEXT,
  website       TEXT,
  hours_json    TEXT,              -- {"mon":"9:00 AM – 7:00 PM", ...}
  logo_key      TEXT,              -- R2 object key
  license_number TEXT,             -- Alabama dealer license (shown when provided)
  facebook_url  TEXT,
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ───────────────────────── Vehicles ─────────────────────────
CREATE TABLE vehicles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id       INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  vin             TEXT CHECK (vin IS NULL OR length(vin) = 17),
  stock_number    TEXT,
  year            INTEGER NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  make_id         INTEGER NOT NULL REFERENCES makes(id),
  model_id        INTEGER NOT NULL REFERENCES models(id),
  trim            TEXT,
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  mileage         INTEGER NOT NULL CHECK (mileage >= 0),
  body_type       TEXT NOT NULL,
  fuel_type       TEXT NOT NULL,
  transmission    TEXT NOT NULL,
  drivetrain      TEXT NOT NULL,
  exterior_color  TEXT,
  interior_color  TEXT,
  condition       TEXT NOT NULL DEFAULT 'used' CHECK (condition IN ('used','certified','new')),
  engine          TEXT,
  mpg_city        INTEGER,
  mpg_highway     INTEGER,
  city_id         INTEGER REFERENCES cities(id),
  city_name       TEXT NOT NULL,
  zip             TEXT NOT NULL,
  lat             REAL,
  lng             REAL,
  description     TEXT,
  -- Vehicle history as disclosed by the dealer (not a third-party report).
  owners          INTEGER,
  accident_free   INTEGER,          -- 1 yes, 0 no, NULL unknown
  title_status    TEXT CHECK (title_status IS NULL OR title_status IN ('clean','rebuilt','salvage','lemon','unknown')),
  service_records INTEGER,          -- 1 yes, 0 no, NULL unknown
  history_report_url TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','sold','archived')),
  featured_until  TEXT,
  views           INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'dealer' CHECK (source IN ('dealer','admin','feed')),
  feed_id         TEXT,             -- external id for licensed inventory feeds
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (dealer_id, feed_id)
);
CREATE INDEX idx_vehicles_status_created ON vehicles(status, created_at DESC);
CREATE INDEX idx_vehicles_make_model ON vehicles(status, make_id, model_id);
CREATE INDEX idx_vehicles_price ON vehicles(status, price_cents);
CREATE INDEX idx_vehicles_mileage ON vehicles(status, mileage);
CREATE INDEX idx_vehicles_year ON vehicles(status, year);
CREATE INDEX idx_vehicles_body ON vehicles(status, body_type);
CREATE INDEX idx_vehicles_city ON vehicles(status, city_id);
CREATE INDEX idx_vehicles_geo ON vehicles(status, lat, lng);
CREATE INDEX idx_vehicles_dealer ON vehicles(dealer_id, status);
CREATE INDEX idx_vehicles_featured ON vehicles(featured_until);

CREATE TABLE vehicle_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  key_large   TEXT NOT NULL,       -- R2 key, ~1600px WebP
  key_small   TEXT NOT NULL,       -- R2 key, ~640px WebP
  width       INTEGER,
  height      INTEGER,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_vehicle_images_vehicle ON vehicle_images(vehicle_id, position);

CREATE TABLE vehicle_view_stats (
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  day         TEXT NOT NULL,       -- YYYY-MM-DD
  views       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (vehicle_id, day)
);

CREATE TABLE vehicle_features (
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL CHECK (length(feature) BETWEEN 1 AND 80),
  PRIMARY KEY (vehicle_id, feature)
);

-- ───────────────────────── Leads ─────────────────────────
CREATE TABLE leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  type            TEXT NOT NULL CHECK (type IN ('contact','info','price','test_drive','financing')),
  vehicle_id      INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  dealer_id       INTEGER REFERENCES dealers(id) ON DELETE CASCADE,   -- NULL = site-level lead (e.g. general financing)
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT,
  preferred_date  TEXT,
  vehicle_label   TEXT,              -- snapshot, survives vehicle deletion
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','closed')),
  source_path     TEXT,
  ip_hash         TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_leads_dealer ON leads(dealer_id, status, created_at DESC);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_vehicle ON leads(vehicle_id);

CREATE TABLE lead_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL DEFAULT 'reply' CHECK (kind IN ('reply','note')),
  body        TEXT NOT NULL,
  emailed     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_lead_messages_lead ON lead_messages(lead_id);

CREATE TABLE saved_vehicles (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, vehicle_id)
);

CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

-- ───────────────────────── Billing ─────────────────────────
CREATE TABLE subscriptions (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id                INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  plan                     TEXT NOT NULL CHECK (plan IN ('free','basic','pro')),
  status                   TEXT NOT NULL CHECK (status IN ('active','past_due','canceled','incomplete','requested')),
  provider                 TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual','stripe')),
  provider_customer_id     TEXT,
  provider_subscription_id TEXT UNIQUE,
  current_period_end       TEXT,
  cancel_at_period_end     INTEGER NOT NULL DEFAULT 0,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_subscriptions_dealer ON subscriptions(dealer_id, status);

CREATE TABLE payments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id     INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('subscription','featured')),
  amount_cents  INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency      TEXT NOT NULL DEFAULT 'usd',
  status        TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')),
  provider      TEXT NOT NULL DEFAULT 'manual',
  provider_ref  TEXT UNIQUE,
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_payments_dealer ON payments(dealer_id, created_at DESC);

CREATE TABLE featured_listings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id   INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','expired','canceled')),
  source      TEXT NOT NULL DEFAULT 'plan' CHECK (source IN ('plan','purchase','admin')),
  payment_id  INTEGER REFERENCES payments(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_featured_vehicle ON featured_listings(vehicle_id, status);
CREATE INDEX idx_featured_dealer ON featured_listings(dealer_id, status);

-- ───────────────────────── Reviews ─────────────────────────
-- Only real, signed-in consumers can review; reviews are moderated before display.
CREATE TABLE reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id   INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (dealer_id, user_id)
);
CREATE INDEX idx_reviews_dealer ON reviews(dealer_id, status);

-- ───────────────────────── CMS ─────────────────────────
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE blog_posts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  excerpt          TEXT NOT NULL,
  body             TEXT NOT NULL,              -- markdown (raw HTML is escaped on render)
  category_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  meta_title       TEXT,
  meta_description TEXT,
  keywords         TEXT,
  faq_json         TEXT,                       -- [{q,a}] → FAQPage schema
  howto_json       TEXT,                       -- {name, steps:[{name,text}]} → HowTo schema
  cover_key        TEXT,
  published_at     TEXT,
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_posts_status ON blog_posts(status, published_at DESC);
CREATE INDEX idx_posts_category ON blog_posts(category_id, status);

-- ───────────────────────── Site ─────────────────────────
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE email_outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','logged')),
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_outbox_created ON email_outbox(created_at DESC);

CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
