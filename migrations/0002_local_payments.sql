-- Algerian local payment methods: Chargily Pay (EDAHABIA / CIB) and manual BaridiMob / CCP transfers.
-- Prices and the ledger stay in USD; the buyer pays the DZD equivalent at the admin-configured rate,
-- which is snapshotted on the deal.

ALTER TABLE deals ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'card'; -- card | edahabia | cib | baridimob
ALTER TABLE deals ADD COLUMN pay_currency TEXT;                           -- currency actually charged (USD or DZD)
ALTER TABLE deals ADD COLUMN pay_amount INTEGER;                          -- amount actually charged, minor units for USD, whole dinars for DZD
ALTER TABLE deals ADD COLUMN fx_rate REAL;                                -- USD→DZD rate snapshot (NULL for USD)

-- Manual transfer proofs (BaridiMob / CCP). Receipt image is encrypted in R2.
CREATE TABLE payment_proofs (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  submitted_by TEXT NOT NULL REFERENCES users(id),
  transfer_ref TEXT NOT NULL,
  receipt_key TEXT NOT NULL,
  receipt_mime TEXT NOT NULL,
  refund_ciphertext TEXT,          -- buyer's own RIP for refunds (encrypted)
  refund_iv TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at INTEGER,
  review_note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_payment_proofs_status ON payment_proofs(status, created_at);
CREATE INDEX idx_payment_proofs_deal ON payment_proofs(deal_id);

-- Refunds that must be executed by hand (providers without a refund API).
CREATE TABLE manual_refunds (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  method TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  executed_by TEXT REFERENCES users(id),
  executed_at INTEGER,
  reference TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_manual_refunds_status ON manual_refunds(status, created_at);

ALTER TABLE withdrawals ADD COLUMN payout_method TEXT NOT NULL DEFAULT 'iban'; -- iban | ccp
