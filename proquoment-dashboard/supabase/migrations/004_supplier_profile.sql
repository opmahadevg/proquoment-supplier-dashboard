-- ============================================================
-- Phase 4: Supplier Profile — SHARED DB (apmwmncqmhjacwrmnfms)
-- SAFE / IDEMPOTENT — Run multiple times without side effects
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/apmwmncqmhjacwrmnfms/sql/new
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. supplier_profile — one row per supplier auth session
--    supplier_auth_id = Supabase auth UUID  (real users)
--                     = 'demo-{email}'       (demo accounts)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_profile (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_auth_id   TEXT UNIQUE NOT NULL,
  company_name       TEXT,
  founded            TEXT,
  employees          TEXT,
  website            TEXT,
  contact_email      TEXT,
  contact_phone      TEXT,
  address            TEXT,
  description        TEXT,
  -- Financials (self-reported by supplier)
  payment_terms      TEXT DEFAULT 'Net 30',
  tax_number         TEXT,
  bank_name          TEXT,
  bank_account       TEXT,
  swift_code         TEXT,
  ifsc_code          TEXT,
  currency           TEXT DEFAULT 'USD',
  min_order_value    NUMERIC DEFAULT 0,
  msme_reg           TEXT,
  -- Tag arrays
  categories         TEXT[] DEFAULT '{}',
  countries          TEXT[] DEFAULT '{}',
  -- Completion %
  profile_completion INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_profile DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sp_auth ON supplier_profile (supplier_auth_id);

-- ────────────────────────────────────────────────────────────
-- 2. supplier_locations
--    Dual-keyed: supplier_id (integer, admin-managed)
--                supplier_auth_id (text, supplier-managed)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_locations (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id      BIGINT,               -- admin integer FK (nullable for supplier-created rows)
  supplier_auth_id TEXT,                 -- Phase 4: supplier self-managed rows
  label            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  country          TEXT,
  pincode          TEXT,
  type             TEXT DEFAULT 'warehouse'
                        CHECK (type IN ('factory','warehouse','office','showroom')),
  is_primary       BOOLEAN DEFAULT false,
  lat              NUMERIC,
  lng              NUMERIC,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_locations DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sl_sup    ON supplier_locations (supplier_id);
CREATE INDEX IF NOT EXISTS idx_sl_auth   ON supplier_locations (supplier_auth_id);

-- Add missing columns if the table already existed without them
ALTER TABLE supplier_locations ADD COLUMN IF NOT EXISTS supplier_auth_id TEXT;
ALTER TABLE supplier_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ────────────────────────────────────────────────────────────
-- 3. supplier_certifications
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_certifications (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id      BIGINT,
  supplier_auth_id TEXT,
  name             TEXT NOT NULL,
  issuer           TEXT,
  cert_number      TEXT,
  issued_date      DATE,
  expiry           DATE,
  document_url     TEXT,
  status           TEXT DEFAULT 'active'
                        CHECK (status IN ('active','expired','pending')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_certifications DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sc_sup  ON supplier_certifications (supplier_id);
CREATE INDEX IF NOT EXISTS idx_sc_auth ON supplier_certifications (supplier_auth_id);

-- Add missing columns if table already existed
ALTER TABLE supplier_certifications ADD COLUMN IF NOT EXISTS supplier_auth_id TEXT;
ALTER TABLE supplier_certifications ADD COLUMN IF NOT EXISTS cert_number TEXT;
ALTER TABLE supplier_certifications ADD COLUMN IF NOT EXISTS issued_date DATE;
ALTER TABLE supplier_certifications ADD COLUMN IF NOT EXISTS document_url TEXT;

-- ────────────────────────────────────────────────────────────
-- 4. supplier_contacts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id      BIGINT,
  supplier_auth_id TEXT,
  name             TEXT NOT NULL,
  designation      TEXT,
  role             TEXT,
  department       TEXT,
  phone            TEXT,
  email            TEXT,
  whatsapp         TEXT,
  is_primary       BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_contacts DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sco_sup  ON supplier_contacts (supplier_id);
CREATE INDEX IF NOT EXISTS idx_sco_auth ON supplier_contacts (supplier_auth_id);

-- Add missing columns if table already existed
ALTER TABLE supplier_contacts ADD COLUMN IF NOT EXISTS supplier_auth_id TEXT;
ALTER TABLE supplier_contacts ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE supplier_contacts ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE supplier_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ────────────────────────────────────────────────────────────
-- 5. supplier_financials
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_financials (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id      BIGINT,
  supplier_auth_id TEXT UNIQUE,          -- UNIQUE so upsert works
  bank_name        TEXT,
  account_number   TEXT,
  ifsc_code        TEXT,
  swift_code       TEXT,
  currency         TEXT DEFAULT 'INR',
  payment_terms    TEXT DEFAULT 'Net 30',
  credit_limit     NUMERIC DEFAULT 0,
  outstanding      NUMERIC DEFAULT 0,
  total_gmv        NUMERIC DEFAULT 0,
  pan_number       TEXT,
  msme_reg         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_financials DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sf_sup  ON supplier_financials (supplier_id);
CREATE INDEX IF NOT EXISTS idx_sf_auth ON supplier_financials (supplier_auth_id);

-- Add missing columns if table already existed
ALTER TABLE supplier_financials ADD COLUMN IF NOT EXISTS supplier_auth_id TEXT;
ALTER TABLE supplier_financials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make supplier_auth_id unique for upsert support (safe if already unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'supplier_financials'::regclass
      AND conname   = 'supplier_financials_supplier_auth_id_key'
  ) THEN
    ALTER TABLE supplier_financials
      ADD CONSTRAINT supplier_financials_supplier_auth_id_key
      UNIQUE (supplier_auth_id);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 6. notifications table — must exist for admin notifications
--    (admin dashboard already reads/writes this table)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_dashboard TEXT NOT NULL DEFAULT 'admin'
                        CHECK (target_dashboard IN ('admin','buyer','supplier')),
  order_id         TEXT,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  message          TEXT,
  read             BOOLEAN DEFAULT false,
  action_url       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notif_target ON notifications (target_dashboard, read, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 7. Auto-update updated_at on supplier_profile
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sp_updated_at ON supplier_profile;
CREATE TRIGGER trg_sp_updated_at
  BEFORE UPDATE ON supplier_profile
  FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_sl_updated_at ON supplier_locations;
CREATE TRIGGER trg_sl_updated_at
  BEFORE UPDATE ON supplier_locations
  FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_sco_updated_at ON supplier_contacts;
CREATE TRIGGER trg_sco_updated_at
  BEFORE UPDATE ON supplier_contacts
  FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_sf_updated_at ON supplier_financials;
CREATE TRIGGER trg_sf_updated_at
  BEFORE UPDATE ON supplier_financials
  FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 8. Allow NULL supplier_id (supplier self-managed rows have no integer FK)
--    Safe even if already nullable
-- ────────────────────────────────────────────────────────────
ALTER TABLE supplier_locations      ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE supplier_certifications ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE supplier_contacts       ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE supplier_financials     ALTER COLUMN supplier_id DROP NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 9. Seed demo data (Ahmad Hassan demo account)
--    ON CONFLICT DO NOTHING = safe to re-run
-- ────────────────────────────────────────────────────────────
INSERT INTO supplier_profile (
  supplier_auth_id, company_name, founded, employees, website,
  contact_email, contact_phone, address, description,
  payment_terms, tax_number, bank_name, bank_account, swift_code,
  currency, min_order_value, categories, countries, profile_completion
) VALUES (
  'demo-ahmad@supplier.com',
  'Hassan Industrial Supplies',
  '2015',
  '50–200',
  'https://hassanindustrial.ae',
  'ahmad@supplier.com',
  '+971 50 123 4567',
  'Plot 45, Industrial Area 12, Dubai, UAE',
  'Leading supplier of industrial metals, pipes and valves serving major buyers across the GCC region. ISO-certified with 20+ years industry experience.',
  'Net 30',
  'TRN-100234567890003',
  'Emirates NBD',
  'AE07 0331 2345 6789 0123 456',
  'EBILAEAD',
  'AED',
  5000,
  ARRAY['Industrial Metals', 'Valves & Fittings', 'Hydraulics'],
  ARRAY['UAE', 'Saudi Arabia', 'Kuwait', 'Qatar'],
  72
) ON CONFLICT (supplier_auth_id) DO NOTHING;

INSERT INTO supplier_locations (supplier_id, supplier_auth_id, label, address, city, country, type, is_primary) VALUES
  (NULL, 'demo-ahmad@supplier.com', 'Main Warehouse', 'Plot 45, Industrial Area 12', 'Dubai', 'UAE', 'warehouse', true),
  (NULL, 'demo-ahmad@supplier.com', 'Jebel Ali Factory', 'Jebel Ali Free Zone, Block 3', 'Dubai', 'UAE', 'factory', false)
ON CONFLICT DO NOTHING;

INSERT INTO supplier_certifications (supplier_id, supplier_auth_id, name, issuer, cert_number, issued_date, expiry, status) VALUES
  (NULL, 'demo-ahmad@supplier.com', 'ISO 9001:2015',  'Bureau Veritas', 'BV-QMS-2024-001',  '2022-03-15', '2025-03-14', 'active'),
  (NULL, 'demo-ahmad@supplier.com', 'ISO 14001:2015', 'TÜV SÜD',       'TUV-EMS-2023-112', '2021-07-01', '2024-06-30', 'expired')
ON CONFLICT DO NOTHING;

INSERT INTO supplier_contacts (supplier_id, supplier_auth_id, name, role, designation, email, phone, is_primary) VALUES
  (NULL, 'demo-ahmad@supplier.com', 'Ahmad Hassan',      'Owner & CEO',   'Owner & CEO',   'ahmad@supplier.com',          '+971 50 123 4567', true),
  (NULL, 'demo-ahmad@supplier.com', 'Fatima Al Rashidi', 'Sales Manager', 'Sales Manager', 'fatima@hassanindustrial.ae',  '+971 50 987 6543', false)
ON CONFLICT DO NOTHING;

INSERT INTO supplier_financials (supplier_id, supplier_auth_id, bank_name, account_number, swift_code, currency, payment_terms, credit_limit, outstanding, total_gmv, pan_number) VALUES
  (NULL, 'demo-ahmad@supplier.com', 'Emirates NBD', 'AE070331234567890123456', 'EBILAEAD', 'AED', 'Net 30', 100000, 12500, 248000, 'TRN-100234567890003')
ON CONFLICT (supplier_auth_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 9. Seed demo notification so admin bell shows example
-- ────────────────────────────────────────────────────────────
INSERT INTO notifications (target_dashboard, type, title, message, read, action_url) VALUES
  ('admin', 'supplier_profile_update', 'Profile Update: Hassan Industrial Supplies',
   'Hassan Industrial Supplies updated their company profile', false, '/suppliers')
ON CONFLICT DO NOTHING;
