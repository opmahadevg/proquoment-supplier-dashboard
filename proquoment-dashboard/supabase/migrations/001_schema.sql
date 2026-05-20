-- ============================================================
-- Proquoment Supplier Dashboard — Supabase Schema & Seed Data
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- URL: https://supabase.com/dashboard/project/jpsifaqpodwijvgfqfok/sql/new
-- ============================================================

-- Drop existing tables in dependency order
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS analytics_monthly CASCADE;
DROP TABLE IF EXISTS sample_orders CASCADE;
DROP TABLE IF EXISTS bulk_orders CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ── Companies ──────────────────────────────────────────────
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_initials TEXT,
  type TEXT CHECK (type IN ('buyer', 'supplier', 'manufacturer')),
  location TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RFQs ───────────────────────────────────────────────────
CREATE TABLE rfqs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_logo TEXT,
  category TEXT NOT NULL,
  quantity TEXT NOT NULL,
  deadline DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_display TEXT,
  match_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','reviewed','bid_placed','saved','declined','closed')),
  description TEXT,
  specs JSONB DEFAULT '[]',
  location TEXT,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by INTEGER DEFAULT 0,
  bids_received INTEGER DEFAULT 0,
  buyer_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bids ───────────────────────────────────────────────────
CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  rfq_id TEXT,
  title TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_logo TEXT,
  submitted_at DATE,
  expires_at DATE,
  amount NUMERIC,
  amount_display TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Under Review','Won','Lost','Expired')),
  quantity TEXT,
  delivery_days INTEGER,
  rank INTEGER,
  total_bids INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bulk Orders ────────────────────────────────────────────
CREATE TABLE bulk_orders (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_logo TEXT,
  order_value TEXT,
  order_amount NUMERIC,
  status TEXT NOT NULL,
  placed_at DATE,
  delivery_at DATE,
  progress INTEGER DEFAULT 0,
  milestones JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sample Orders ──────────────────────────────────────────
CREATE TABLE sample_orders (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_logo TEXT,
  quantity TEXT,
  status TEXT CHECK (status IN ('Pending','In Transit','Delivered')),
  requested_at DATE,
  delivered_at TEXT,
  feedback NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Product Catalogue ──────────────────────────────────────
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT UNIQUE,
  hsn TEXT,
  price TEXT,
  moq TEXT,
  lead_time TEXT,
  description TEXT,
  stock TEXT DEFAULT 'In Stock' CHECK (stock IN ('In Stock','Low Stock','Out of Stock')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Conversations ──────────────────────────────────────────
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name TEXT NOT NULL,
  buyer_logo TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ───────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  from_me BOOLEAN NOT NULL DEFAULT false,
  text TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Activity Log ───────────────────────────────────────────
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  description TEXT,
  buyer_name TEXT,
  status TEXT,
  status_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alerts ─────────────────────────────────────────────────
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  icon TEXT,
  title TEXT,
  description TEXT,
  action_label TEXT,
  action_path TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Analytics Monthly ──────────────────────────────────────
CREATE TABLE analytics_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  revenue NUMERIC DEFAULT 0,
  bids_submitted INTEGER DEFAULT 0,
  bids_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Disable RLS (development / demo mode) ─────────────────
ALTER TABLE companies       DISABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs            DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids            DISABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_orders     DISABLE ROW LEVEL SECURITY;
ALTER TABLE sample_orders   DISABLE ROW LEVEL SECURITY;
ALTER TABLE products        DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations   DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages        DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log    DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_monthly DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Companies
INSERT INTO companies (name, logo_initials, type, location, verified) VALUES
  ('Sunrise Manufacturing LLC',  'SM', 'buyer', 'Dubai, UAE',       true),
  ('Gulf Construction Co.',      'GC', 'buyer', 'Abu Dhabi, UAE',   true),
  ('Al Futtaim Industries',      'AF', 'buyer', 'Sharjah, UAE',     false),
  ('Emirates Steel Corp',        'ES', 'buyer', 'Dubai, UAE',       true),
  ('Qatar Water Authority',      'QW', 'buyer', 'Doha, Qatar',      true),
  ('Arabtec Construction',       'AC', 'buyer', 'Abu Dhabi, UAE',   false),
  ('ADNOC Distribution',         'AD', 'buyer', 'Abu Dhabi, UAE',   true),
  ('Dubai Municipality',         'DM', 'buyer', 'Dubai, UAE',       true);

-- RFQs
INSERT INTO rfqs (id, title, buyer_name, buyer_logo, category, quantity, deadline, budget_min, budget_max, budget_display, match_score, status, description, specs, location, saved_by, bids_received, buyer_verified, posted_at) VALUES
  ('RFQ-2024-001', 'Steel Pipes — Grade A',          'Sunrise Manufacturing LLC', 'SM', 'Industrial Metals',  '500 units',    '2024-12-15', 12000, 18000, '$12,000 – $18,000', 96, 'new',        'High-grade steel pipes required for pipeline infrastructure project. Must meet ASTM A106 Grade A standards. Delivery within 30 days from order confirmation.', '["Diameter: 4\", 6\", 8\"","Length: 6m per piece","Standard: ASTM A106 Grade A","Finish: Black painted"]',          'Dubai, UAE',       0, 4,  true,  NOW() - INTERVAL '2 hours'),
  ('RFQ-2024-002', 'Industrial Valves DN50',          'Gulf Construction Co.',     'GC', 'Valves & Fittings',  '200 units',    '2024-12-20',  8000, 14000, '$8,000 – $14,000',  88, 'reviewed',   'Gate valves DN50 PN16 required for water treatment plant expansion. Must be EN1171 certified.',                                                                      '["Size: DN50 (2\")","Pressure: PN16","Material: Cast Iron","Standard: EN 1171"]',                                  'Abu Dhabi, UAE',   2, 7,  true,  NOW() - INTERVAL '5 hours'),
  ('RFQ-2024-003', 'Hydraulic Fittings Assortment',  'Al Futtaim Industries',     'AF', 'Hydraulics',         '1,000 units',  '2025-01-05',  5000,  9000, '$5,000 – $9,000',   82, 'bid_placed', 'Various hydraulic fittings including elbows, tees, and reducers for maintenance stock.',                                                                             '["Pressure: up to 350 bar","Material: Carbon Steel","Thread: BSP"]',                                              'Sharjah, UAE',     5, 12, false, NOW() - INTERVAL '1 day'),
  ('RFQ-2024-004', 'Stainless Steel Flanges',        'Emirates Steel Corp',       'ES', 'Industrial Metals',  '300 units',    '2025-01-10', 15000, 22000, '$15,000 – $22,000', 75, 'new',        'Weld neck flanges SS316L for offshore application. Must be ASME certified and include mill test reports.',                                                           '["Material: SS316L","Standard: ASME B16.5","Class: 150, 300, 600"]',                                             'Dubai, UAE',       3, 2,  true,  NOW() - INTERVAL '2 days'),
  ('RFQ-2024-005', 'HDPE Pipes for Water Supply',    'Qatar Water Authority',     'QW', 'Plastic Pipes',      '2,000 meters', '2025-01-20', 20000, 30000, '$20,000 – $30,000', 71, 'new',        'HDPE SDR11 pipes for municipal water supply network. Must comply with ISO 4427.',                                                                                    '["Grade: PE100","Standard: ISO 4427","SDR: 11","Colour: Blue or Black"]',                                         'Doha, Qatar',      8, 9,  true,  NOW() - INTERVAL '3 days'),
  ('RFQ-2024-006', 'Safety Helmets & PPE Kit',       'Arabtec Construction',      'AC', 'Safety & PPE',       '500 kits',     '2024-12-30',  6500, 10000, '$6,500 – $10,000',  68, 'reviewed',   'Complete PPE kits including hard hats, gloves, safety vests, and steel-toed boots for construction site workers.',                                                  '["Helmet: EN 397 certified","Vest: Hi-vis class 2","Gloves: EN 388","Boots: ISO 20345"]',                         'Abu Dhabi, UAE',   1, 6,  false, NOW() - INTERVAL '4 days');

-- Bids
INSERT INTO bids (id, rfq_id, title, buyer_name, buyer_logo, submitted_at, expires_at, amount, amount_display, status, quantity, delivery_days, rank, total_bids) VALUES
  ('BID-2024-001', 'RFQ-2024-001', 'Steel Pipes — Grade A',          'Sunrise Manufacturing LLC', 'SM', '2024-11-28', '2024-12-15', 15500, '$15,500',  'Pending',      '500 units',   21, 2, 5),
  ('BID-2024-002', 'RFQ-2024-003', 'Hydraulic Fittings Assortment',  'Al Futtaim Industries',     'AF', '2024-11-25', '2025-01-05',  7200, '$7,200',   'Under Review', '1,000 units', 14, 1, 4),
  ('BID-2024-003', 'RFQ-2023-045', 'Gate Valves DN80',               'ADNOC Distribution',        'AD', '2024-11-10', '2024-11-30', 22000, '$22,000',  'Won',          '150 units',   28, 1, 6),
  ('BID-2024-004', 'RFQ-2023-038', 'PVC Pipes Bundle',               'Dubai Municipality',        'DM', '2024-10-20', '2024-11-10',  9800, '$9,800',   'Lost',         '800 units',   18, 3, 7);

-- Bulk Orders
INSERT INTO bulk_orders (id, product, buyer_name, buyer_logo, order_value, order_amount, status, placed_at, delivery_at, progress, milestones) VALUES
  ('BO-2024-001', 'Steel Pipes Grade A — 500 units',     'Sunrise Manufacturing LLC', 'SM', '$15,500', 15500, 'In Production',       '2024-11-20', '2024-12-10', 65,  '[{"label":"Order Confirmed","done":true},{"label":"Production Started","done":true},{"label":"Quality Inspection","done":false},{"label":"Shipped","done":false},{"label":"Delivered","done":false}]'),
  ('BO-2024-002', 'Gate Valves DN80 — 150 units',        'ADNOC Distribution',        'AD', '$22,000', 22000, 'Delivered',           '2024-10-15', '2024-11-10', 100, '[{"label":"Order Confirmed","done":true},{"label":"Production Started","done":true},{"label":"Quality Inspection","done":true},{"label":"Shipped","done":true},{"label":"Delivered","done":true}]'),
  ('BO-2024-003', 'Hydraulic Fittings — 1,000 units',    'Al Futtaim Industries',     'AF', '$7,200',   7200, 'Pending Confirmation', '2024-11-28', '2025-01-05', 10,  '[{"label":"Order Confirmed","done":false},{"label":"Production Started","done":false},{"label":"Quality Inspection","done":false},{"label":"Shipped","done":false},{"label":"Delivered","done":false}]'),
  ('BO-2024-004', 'SS Flanges 316L — 300 units',         'Emirates Steel Corp',       'ES', '$18,400', 18400, 'Shipped',             '2024-11-01', '2024-12-05', 80,  '[{"label":"Order Confirmed","done":true},{"label":"Production Started","done":true},{"label":"Quality Inspection","done":true},{"label":"Shipped","done":true},{"label":"Delivered","done":false}]');

-- Sample Orders
INSERT INTO sample_orders (id, product, buyer_name, buyer_logo, quantity, status, requested_at, delivered_at, feedback) VALUES
  ('SO-2024-001', 'Steel Pipes Grade A',    'Sunrise Manufacturing', 'SM', '5 samples',  'Delivered',  '2024-11-20', 'Nov 24, 2024',    4.5),
  ('SO-2024-002', 'Gate Valves DN50',       'Gulf Construction Co.', 'GC', '2 samples',  'In Transit', '2024-11-25', 'Expected Dec 1',  NULL),
  ('SO-2024-003', 'Hydraulic Fittings',     'Al Futtaim Industries', 'AF', '10 samples', 'Pending',    '2024-11-28', '—',               NULL),
  ('SO-2024-004', 'SS Flanges 316L',        'Emirates Steel',        'ES', '3 samples',  'Delivered',  '2024-11-10', 'Nov 15, 2024',    5.0),
  ('SO-2024-005', 'HDPE Pipes SDR11',       'Qatar Water Authority', 'QW', '5 samples',  'Pending',    '2024-11-30', '—',               NULL),
  ('SO-2024-006', 'Butterfly Valves PN10',  'Arabtec Construction',  'AC', '3 samples',  'In Transit', '2024-11-22', 'Expected Dec 3',  NULL);

-- Products
INSERT INTO products (name, category, sku, price, moq, lead_time, description, stock) VALUES
  ('Steel Pipes Grade A',           'Industrial Metals', 'SP-GRA-001',   '$32/meter',      '50 meters',   '14 days', 'High-grade steel pipes for industrial and construction use.',          'In Stock'),
  ('Gate Valves DN50–DN200',        'Valves & Fittings', 'GV-DN-002',    '$85–$340/unit',  '10 units',    '21 days', 'Cast iron gate valves for pipeline systems.',                          'In Stock'),
  ('Hydraulic Fittings Set',        'Hydraulics',        'HF-SET-003',   '$12/unit',       '100 units',   '7 days',  'Assorted hydraulic fittings up to 350 bar pressure rating.',           'In Stock'),
  ('Stainless Steel Flanges 316L',  'Industrial Metals', 'SSF-316-004',  '$45/unit',       '20 units',    '28 days', 'Weld neck flanges SS316L for offshore applications.',                  'Low Stock'),
  ('Butterfly Valves PN10',         'Valves & Fittings', 'BV-PN10-005',  '$120/unit',      '5 units',     '14 days', 'Wafer-type butterfly valves for water treatment plants.',              'In Stock'),
  ('HDPE Pipes SDR11',              'Plastic Pipes',     'HP-SDR11-006', '$18/meter',      '100 meters',  '10 days', 'High density polyethylene pipes for underground applications.',        'In Stock');

-- Conversations (fixed UUIDs for message FK references)
INSERT INTO conversations (id, buyer_name, buyer_logo, last_message, last_message_at, unread_count, online) VALUES
  ('a1a1a1a1-0000-0000-0000-000000000001', 'Sunrise Manufacturing LLC', 'SM', 'Can you provide a revised quote with faster delivery?',    NOW() - INTERVAL '90 minutes',  2, true),
  ('a1a1a1a1-0000-0000-0000-000000000002', 'Gulf Construction Co.',     'GC', 'Please send the product data sheet for DN50 valves.',      NOW() - INTERVAL '1 day',       0, false),
  ('a1a1a1a1-0000-0000-0000-000000000003', 'Al Futtaim Industries',     'AF', 'Your bid looks competitive. We''ll review by Friday.',     NOW() - INTERVAL '2 days',      0, true),
  ('a1a1a1a1-0000-0000-0000-000000000004', 'Emirates Steel Corp',       'ES', 'Can we schedule a call to discuss the order?',             NOW() - INTERVAL '10 days',     1, false);

-- Messages
INSERT INTO messages (conversation_id, from_me, text, sent_at) VALUES
  ('a1a1a1a1-0000-0000-0000-000000000001', false, 'Hello, we reviewed your bid for Steel Pipes RFQ-2024-001.',                                                NOW() - INTERVAL '3 hours'),
  ('a1a1a1a1-0000-0000-0000-000000000001', true,  'Thank you for considering our bid. How can I help?',                                                        NOW() - INTERVAL '175 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000001', false, 'We''re interested but the delivery time is a bit long. Can you do 14 days instead of 21?',                  NOW() - INTERVAL '170 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000001', true,  'Let me check with our logistics team. We might be able to expedite if we source locally.',                  NOW() - INTERVAL '165 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000001', false, 'That would be great. Also, what certifications do you hold for Grade A steel?',                             NOW() - INTERVAL '130 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000001', false, 'Can you provide a revised quote with faster delivery?',                                                     NOW() - INTERVAL '90 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000002', false, 'We received your bid for Industrial Valves.',                                                               NOW() - INTERVAL '1 day 4 hours'),
  ('a1a1a1a1-0000-0000-0000-000000000002', true,  'Great! Do you have any specific requirements?',                                                             NOW() - INTERVAL '1 day 3 hours 45 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000002', false, 'Please send the product data sheet for DN50 valves.',                                                       NOW() - INTERVAL '1 day'),
  ('a1a1a1a1-0000-0000-0000-000000000003', false, 'We have reviewed your bid for hydraulic fittings.',                                                         NOW() - INTERVAL '2 days 2 hours'),
  ('a1a1a1a1-0000-0000-0000-000000000003', true,  'We can guarantee quality and timely delivery.',                                                             NOW() - INTERVAL '2 days 1 hour 30 minutes'),
  ('a1a1a1a1-0000-0000-0000-000000000003', false, 'Your bid looks competitive. We''ll review by Friday.',                                                      NOW() - INTERVAL '2 days'),
  ('a1a1a1a1-0000-0000-0000-000000000004', false, 'We want to discuss the flanges order further.',                                                             NOW() - INTERVAL '10 days 3 hours'),
  ('a1a1a1a1-0000-0000-0000-000000000004', false, 'Can we schedule a call to discuss the order?',                                                              NOW() - INTERVAL '10 days');

-- Activity Log
INSERT INTO activity_log (type, description, buyer_name, status, status_type, created_at) VALUES
  ('RFQ Match',        'Steel Pipes — Grade A, 500 units',        'Sunrise Manufacturing', 'New',       'new',       NOW() - INTERVAL '10 minutes'),
  ('Bid Submitted',    'Industrial Valves DN50, 200 units',        'Gulf Construction Co.', 'Pending',   'pending',   NOW() - INTERVAL '2 hours'),
  ('Order Won',        'Hydraulic Fittings, 1000 units',           'Al Futtaim Industries', 'Won',       'won',       NOW() - INTERVAL '1 day'),
  ('Sample Requested', 'Stainless Steel Flanges',                  'Emirates Steel',        'Delivered', 'delivered', NOW() - INTERVAL '2 days');

-- Alerts
INSERT INTO alerts (type, icon, title, description, action_label, action_path, read) VALUES
  ('rfq',     'request_quote', 'New RFQ Match',      '3 new RFQs match your product catalogue',              'View RFQs', '/matched-rfqs', false),
  ('bid',     'gavel',         'Bid Expiring Soon',  'Your bid on "Industrial Valves" expires in 2 hours',   'View Bid',  '/my-bids',      false),
  ('message', 'chat',          'New Message',        'Sunrise Manufacturing sent you a message',              'Reply',     '/messages',     false);

-- Analytics Monthly
INSERT INTO analytics_monthly (month, year, revenue, bids_submitted, bids_won) VALUES
  ('Jul', 2024, 18000,  8,  2),
  ('Aug', 2024, 24000, 12,  4),
  ('Sep', 2024, 21000, 10,  3),
  ('Oct', 2024, 32000, 15,  5),
  ('Nov', 2024, 28000, 11,  4),
  ('Dec', 2024, 48200, 18,  6);
