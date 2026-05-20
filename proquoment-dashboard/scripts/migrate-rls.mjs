// migrate-rls.js — Run remaining RLS migrations via Supabase REST SQL endpoint
// Uses postgres service-role equivalent via Supabase's /rest/v1/rpc or direct SQL
// Since we only have anon key, we'll use supabase-js rpc workaround
// BUT: the correct approach for DDL is the Supabase Management API

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=')
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim()
    }
  }
})

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

// ── SQL statements to run ─────────────────────────────────────

const MILESTONES_RLS = `
DROP POLICY IF EXISTS admin_sees_real_data ON public.milestones;
DROP POLICY IF EXISTS demo_sees_demo_data ON public.milestones;
DROP POLICY IF EXISTS supplier_sees_milestones ON public.milestones;
DROP POLICY IF EXISTS supplier_updates_milestones ON public.milestones;
DROP POLICY IF EXISTS anon_sees_demo_milestones ON public.milestones;

CREATE POLICY admin_sees_real_data ON public.milestones
  FOR ALL TO authenticated
  USING  (is_demo = false AND is_admin_user())
  WITH CHECK (is_demo = false AND is_admin_user());

CREATE POLICY demo_sees_demo_data ON public.milestones
  FOR ALL TO authenticated
  USING  (is_demo = true AND is_demo_user())
  WITH CHECK (is_demo = true AND is_demo_user());

CREATE POLICY supplier_sees_milestones ON public.milestones
  FOR SELECT TO authenticated
  USING (
    is_demo = false AND is_supplier_user()
    AND order_id IN (
      SELECT id FROM public.orders WHERE supplier_id = current_supplier_id()
    )
  );

CREATE POLICY supplier_updates_milestones ON public.milestones
  FOR UPDATE TO authenticated
  USING (
    is_demo = false AND is_supplier_user()
    AND order_id IN (
      SELECT id FROM public.orders WHERE supplier_id = current_supplier_id()
    )
  );

CREATE POLICY anon_sees_demo_milestones ON public.milestones
  FOR SELECT TO anon
  USING (is_demo = true);
`

const NOTIFICATIONS_RLS = `
DROP POLICY IF EXISTS admin_sees_real_data ON public.notifications;
DROP POLICY IF EXISTS demo_sees_demo_data ON public.notifications;
DROP POLICY IF EXISTS supplier_sees_notifications ON public.notifications;
DROP POLICY IF EXISTS anon_sees_demo_notifications ON public.notifications;

CREATE POLICY admin_sees_real_data ON public.notifications
  FOR ALL TO authenticated
  USING  (is_demo = false AND is_admin_user())
  WITH CHECK (is_demo = false AND is_admin_user());

CREATE POLICY demo_sees_demo_data ON public.notifications
  FOR ALL TO authenticated
  USING  (is_demo = true AND is_demo_user())
  WITH CHECK (is_demo = true AND is_demo_user());

CREATE POLICY supplier_sees_notifications ON public.notifications
  FOR SELECT TO authenticated
  USING (
    is_demo = false AND is_supplier_user()
    AND (
      order_id IS NULL
      OR order_id IN (
        SELECT id FROM public.orders WHERE supplier_id = current_supplier_id()
      )
    )
  );

CREATE POLICY anon_sees_demo_notifications ON public.notifications
  FOR SELECT TO anon
  USING (is_demo = true);
`

const SUPPLIER_TABLES_RLS = `
-- Enable RLS on supplier-specific tables
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- bids: supplier sees all (no supplier_id FK on bids yet, open read)
DROP POLICY IF EXISTS anon_reads_demo_bids ON public.bids;
DROP POLICY IF EXISTS authenticated_reads_live_bids ON public.bids;
CREATE POLICY authenticated_reads_live_bids ON public.bids
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_bids ON public.bids
  FOR SELECT TO anon USING (is_demo = true);

-- bulk_orders: supplier sees all for now (no supplier_id FK)
DROP POLICY IF EXISTS anon_reads_demo_bulk ON public.bulk_orders;
DROP POLICY IF EXISTS authenticated_reads_live_bulk ON public.bulk_orders;
CREATE POLICY authenticated_reads_live_bulk ON public.bulk_orders
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_bulk ON public.bulk_orders
  FOR SELECT TO anon USING (is_demo = true);

-- sample_orders
DROP POLICY IF EXISTS anon_reads_demo_samples ON public.sample_orders;
DROP POLICY IF EXISTS authenticated_reads_live_samples ON public.sample_orders;
CREATE POLICY authenticated_reads_live_samples ON public.sample_orders
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_samples ON public.sample_orders
  FOR SELECT TO anon USING (is_demo = true);

-- alerts
DROP POLICY IF EXISTS anon_reads_demo_alerts ON public.alerts;
DROP POLICY IF EXISTS authenticated_reads_live_alerts ON public.alerts;
DROP POLICY IF EXISTS authenticated_writes_live_alerts ON public.alerts;
CREATE POLICY authenticated_reads_live_alerts ON public.alerts
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY authenticated_writes_live_alerts ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (is_demo = false);
CREATE POLICY anon_reads_demo_alerts ON public.alerts
  FOR SELECT TO anon USING (is_demo = true);

-- activity_log
DROP POLICY IF EXISTS anon_reads_demo_activity ON public.activity_log;
DROP POLICY IF EXISTS authenticated_reads_live_activity ON public.activity_log;
CREATE POLICY authenticated_reads_live_activity ON public.activity_log
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_activity ON public.activity_log
  FOR SELECT TO anon USING (is_demo = true);

-- products (supplier owns their own products — no supplier_id yet, open for authenticated)
DROP POLICY IF EXISTS anon_reads_demo_products ON public.products;
DROP POLICY IF EXISTS authenticated_manages_live_products ON public.products;
CREATE POLICY authenticated_manages_live_products ON public.products
  FOR ALL TO authenticated
  USING (is_demo = false)
  WITH CHECK (is_demo = false);
CREATE POLICY anon_reads_demo_products ON public.products
  FOR SELECT TO anon USING (is_demo = true);
`

// Use Supabase Management API to run raw SQL
async function runSQL(label, sql) {
  console.log(`\n🔧 Running: ${label}...`)
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Management API requires a personal access token, not anon key
        // Fallback: use the Supabase REST endpoint with postgres role via service key
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const text = await resp.text()
  if (!resp.ok) {
    console.error(`❌ Failed (${resp.status}): ${text.slice(0, 300)}`)
    return false
  }
  console.log(`✅ Done: ${label}`)
  return true
}

console.log(`Project: ${PROJECT_REF}`)
console.log('NOTE: Management API requires a Personal Access Token (PAT).')
console.log('Printing SQL for manual execution if API fails:\n')
console.log('=== milestones RLS ===')
console.log(MILESTONES_RLS)
console.log('\n=== notifications RLS ===')
console.log(NOTIFICATIONS_RLS)
console.log('\n=== supplier tables RLS ===')
console.log(SUPPLIER_TABLES_RLS)
