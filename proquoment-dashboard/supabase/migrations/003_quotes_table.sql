-- ============================================================
-- Migration 003 — Quotes Table (Phase 2: Bid Submission)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── Quotes ─────────────────────────────────────────────────
-- Stores supplier quotations linked to RFQs.
-- Created by procurementApi.submitQuotation()
DROP TABLE IF EXISTS quotes CASCADE;

CREATE TABLE quotes (
  id                  TEXT PRIMARY KEY,                         -- e.g. SQOT-XXXX
  rfq_id              TEXT NOT NULL,                            -- FK → rfqs.id (soft, no hard constraint to stay flexible)
  supplier_id         TEXT,                                     -- Supabase auth user id or demo-<email>
  supplier_name       TEXT,                                     -- Company name from auth context
  unit_price          NUMERIC NOT NULL,                         -- Per-unit price
  moq                 INTEGER NOT NULL DEFAULT 1,               -- Minimum Order Quantity
  total_value         NUMERIC GENERATED ALWAYS AS (unit_price * moq) STORED,
  lead_time_days      INTEGER NOT NULL,                         -- Production + shipping lead time in days
  delivery_days       INTEGER,                                  -- Legacy alias kept for backwards compat
  payment_terms       TEXT DEFAULT 'Net 30',                    -- e.g. "Net 30", "50% advance", "LC"
  notes               TEXT,                                     -- Additional terms / certifications
  valid_until         DATE,                                     -- Quote expiry
  validity_days       INTEGER DEFAULT 14,
  status              TEXT DEFAULT 'supplier_submitted'
                        CHECK (status IN (
                          'supplier_submitted',
                          'admin_reviewing',
                          'accepted',
                          'rejected',
                          'expired'
                        )),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_quotes_updated_at();

-- Disable RLS for dev/demo (mirror other tables)
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

-- Index for common lookups
CREATE INDEX idx_quotes_rfq_id      ON quotes (rfq_id);
CREATE INDEX idx_quotes_supplier_id ON quotes (supplier_id);
CREATE INDEX idx_quotes_status      ON quotes (status);

-- ── Backfill rfqs columns used by procurementApi ──────────
-- These columns may already exist if a previous migration added them.
-- Use DO block to safely add only if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rfqs' AND column_name = 'assigned_supplier'
  ) THEN
    ALTER TABLE rfqs ADD COLUMN assigned_supplier TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rfqs' AND column_name = 'target_price'
  ) THEN
    ALTER TABLE rfqs ADD COLUMN target_price NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rfqs' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE rfqs ADD COLUMN is_demo BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bids' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE bids ADD COLUMN is_demo BOOLEAN DEFAULT false;
  END IF;
END;
$$;

-- ── Notifications table (used by procurementApi) ──────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_dashboard TEXT NOT NULL CHECK (target_dashboard IN ('admin', 'supplier')),
  order_id      TEXT,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT,
  read          BOOLEAN DEFAULT false,
  action_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ── Milestones table (used by procurementApi) ─────────────
CREATE TABLE IF NOT EXISTS milestones (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'completed',
  target_date   DATE,
  completed_at  TIMESTAMPTZ,
  updated_by    TEXT DEFAULT 'supplier',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;

-- ── Orders table (used by procurementApi.confirmQCReady) ──
CREATE TABLE IF NOT EXISTS orders (
  id        TEXT PRIMARY KEY,
  product   TEXT,
  buyer     TEXT,
  supplier  TEXT,
  value     NUMERIC,
  stage     TEXT DEFAULT 'production',
  progress  INTEGER DEFAULT 0,
  days      INTEGER,
  eta       DATE,
  priority  TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
