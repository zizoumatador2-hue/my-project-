-- TrustTransfer core schema (Cloudflare D1 / SQLite)
-- All money values are integer minor units (cents). All timestamps are unix epoch milliseconds.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','reviewer','arbiter','finance','admin','superadmin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  chat_violations INTEGER NOT NULL DEFAULT 0,
  trust_seller INTEGER NOT NULL DEFAULT 50,
  trust_buyer INTEGER NOT NULL DEFAULT 50,
  trust_breakdown TEXT,
  trust_updated_at INTEGER,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,               -- SHA-256 of the opaque session token (token itself never stored)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL CHECK (platform IN ('instagram','tiktok','snapchat','x','facebook','youtube')),
  handle TEXT NOT NULL,
  handle_normalized TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  followers INTEGER NOT NULL,
  engagement_rate REAL NOT NULL,     -- percent, e.g. 3.4
  category TEXT NOT NULL,
  country TEXT NOT NULL,             -- ISO-3166 alpha-2 of main audience
  language TEXT NOT NULL,            -- ISO-639-1
  account_created_year INTEGER NOT NULL,
  account_created_month INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','needs_evidence','approved','rejected','reserved','sold','withdrawn')),
  verification_code TEXT NOT NULL,
  code_method TEXT NOT NULL DEFAULT 'bio' CHECK (code_method IN ('bio','display_name','story')),
  code_check_status TEXT NOT NULL DEFAULT 'pending' CHECK (code_check_status IN ('pending','found','not_found','unavailable')),
  code_checked_at INTEGER,
  fraud_score INTEGER NOT NULL DEFAULT 0,
  fraud_flags TEXT,                  -- JSON array
  reviewer_id TEXT REFERENCES users(id),
  reviewer_claimed_at INTEGER,
  review_note TEXT,
  reviewer_observed_followers INTEGER,
  submitted_at INTEGER,
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_handle ON listings(platform, handle_normalized);
CREATE INDEX idx_listings_browse ON listings(status, platform, price_cents);

CREATE TABLE listing_evidence (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('settings','analytics','code_proof','other')),
  r2_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,              -- hash of plaintext, used to detect reused evidence across listings
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_evidence_listing ON listing_evidence(listing_id);
CREATE INDEX idx_evidence_hash ON listing_evidence(sha256);

CREATE TABLE listing_reviews (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id), -- NULL = automated system check
  action TEXT NOT NULL,              -- submit | claim | unclaim | approve | reject | request_evidence | auto_check
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_listing_reviews ON listing_reviews(listing_id, created_at);

CREATE TABLE fraud_cases (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('listing','user','deal')),
  subject_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','cleared','actioned')),
  resolved_by TEXT REFERENCES users(id),
  resolved_at INTEGER,
  resolution_note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_fraud_status ON fraud_cases(status, created_at);
CREATE INDEX idx_fraud_subject ON fraud_cases(subject_type, subject_id);

CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  price_cents INTEGER NOT NULL,
  commission_bp INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  seller_net_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  escrow_state TEXT NOT NULL CHECK (escrow_state IN ('pending_payment','held','transfer_in_progress','buyer_confirmation_window','released','disputed','refunded','split','cancelled')),
  prev_state TEXT,
  state_version INTEGER NOT NULL DEFAULT 0,  -- optimistic lock for atomic compare-and-set transitions
  payment_provider TEXT NOT NULL,
  payment_session_id TEXT,
  payment_intent_id TEXT,
  payment_expires_at INTEGER,
  confirm_deadline INTEGER,
  held_at INTEGER,
  released_at INTEGER,
  closed_at INTEGER,
  cancel_reason TEXT,
  cancelled_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_deals_buyer ON deals(buyer_id);
CREATE INDEX idx_deals_seller ON deals(seller_id);
CREATE INDEX idx_deals_state ON deals(escrow_state);
CREATE UNIQUE INDEX idx_deals_session ON deals(payment_session_id);

CREATE TABLE escrow_events (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_id TEXT,                     -- NULL = system (webhook / scheduler)
  reason TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_escrow_events ON escrow_events(deal_id, created_at);

CREATE TABLE transfer_steps (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  step_no INTEGER NOT NULL,
  step_key TEXT NOT NULL,
  performer TEXT NOT NULL CHECK (performer IN ('seller','buyer','admin')),
  confirmer TEXT CHECK (confirmer IN ('seller','buyer','admin')),
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked','active','awaiting_confirmation','done')),
  performed_by TEXT,
  performed_at INTEGER,
  confirmed_by TEXT,
  confirmed_at INTEGER,
  note TEXT,
  UNIQUE (deal_id, step_no)
);

CREATE TABLE transfer_step_log (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  step_no INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,              -- perform | confirm | reject | provide_secret | reveal_secret
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_step_log ON transfer_step_log(deal_id, created_at);

CREATE TABLE transfer_secrets (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  step_key TEXT NOT NULL,
  created_by TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  ciphertext TEXT,                   -- AES-256-GCM; wiped (NULL) on reveal or expiry
  iv TEXT,
  expires_at INTEGER NOT NULL,
  revealed_at INTEGER,
  destroyed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_secrets_deal ON transfer_secrets(deal_id);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  deal_id TEXT REFERENCES deals(id),
  last_message_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (listing_id, buyer_id)
);
CREATE INDEX idx_conv_buyer ON conversations(buyer_id);
CREATE INDEX idx_conv_seller ON conversations(seller_id);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT,                    -- NULL for system messages
  body TEXT NOT NULL,
  blocked INTEGER NOT NULL DEFAULT 0,
  block_reasons TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

CREATE TABLE message_reads (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE disputes (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  opened_by TEXT NOT NULL REFERENCES users(id),
  reason_code TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','awaiting_evidence','resolved')),
  opened_in_state TEXT NOT NULL,
  assigned_to TEXT REFERENCES users(id),
  resolution TEXT CHECK (resolution IN ('refund','release','split','resume')),
  buyer_refund_cents INTEGER,
  resolved_by TEXT REFERENCES users(id),
  resolved_at INTEGER,
  resolution_note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_disputes_deal ON disputes(deal_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE dispute_events (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id),
  actor_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('statement','request_evidence','evidence','note','assign','resolve')),
  body TEXT,
  evidence_key TEXT,
  evidence_mime TEXT,
  evidence_size INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_dispute_events ON dispute_events(dispute_id, created_at);

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  deal_id TEXT REFERENCES deals(id),
  withdrawal_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('sale_proceeds','dispute_split','reclaim_reversal','withdrawal','withdrawal_reversal')),
  amount_cents INTEGER NOT NULL,     -- signed
  available_at INTEGER NOT NULL,     -- funds become withdrawable at this time (reclaim-protection hold)
  frozen INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_ledger_user ON ledger_entries(user_id, created_at);
CREATE INDEX idx_ledger_deal ON ledger_entries(deal_id);

CREATE TABLE platform_ledger (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  kind TEXT NOT NULL CHECK (kind IN ('commission','refund','commission_reversal')),
  amount_cents INTEGER NOT NULL,
  provider_ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_platform_ledger ON platform_ledger(created_at);

CREATE TABLE withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('pending_review','approved','paid','rejected')),
  payout_ciphertext TEXT NOT NULL,   -- encrypted payout destination (IBAN / account)
  payout_iv TEXT NOT NULL,
  payout_hint TEXT NOT NULL,         -- masked, e.g. "SA•• •••• 1234"
  auto_approved INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at INTEGER,
  payout_ref TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_withdrawals_status ON withdrawals(status, created_at);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  details TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_subject ON audit_log(subject_type, subject_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,               -- provider event id, for idempotency
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE TABLE settings_history (
  id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
