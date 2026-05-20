/**
 * migrate-rls.js
 * Runs remaining RLS migrations via @supabase/supabase-js
 * Using postgres role via service role key (if available) or anon key.
 * 
 * Run: node scripts/migrate-rls.js
 */

import { createClient } from '@supabase/supabase-js'
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
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  }
})

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper: run a single DDL statement via rpc('exec_sql') if it exists,
// otherwise print for manual run
async function exec(label, sql) {
  console.log(`\n── ${label} ──`)
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    // rpc not available — try via raw REST
    console.warn(`  ⚠️  exec_sql RPC not available: ${error.message}`)
    console.log(`  ℹ️  Paste this SQL into Supabase SQL Editor:\n`)
    console.log(sql)
    return false
  }
  console.log(`  ✅ Done`)
  return true
}

async function main() {
  console.log('Supabase Migration Runner')
  console.log('URL:', SUPABASE_URL)
  console.log('─'.repeat(60))

  // ── milestones RLS ────────────────────────────────────────
  await exec('milestones RLS policies', `
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
  `)

  // ── notifications RLS ──────────────────────────────────────
  await exec('notifications RLS policies', `
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
  `)

  // ── supplier-specific tables RLS ───────────────────────────
  await exec('Enable RLS on bids, bulk_orders, sample_orders, alerts, activity_log, products', `
    ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sample_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  `)

  await exec('bids RLS', `
    DROP POLICY IF EXISTS authenticated_reads_live_bids ON public.bids;
    DROP POLICY IF EXISTS anon_reads_demo_bids ON public.bids;
    CREATE POLICY authenticated_reads_live_bids ON public.bids
      FOR SELECT TO authenticated USING (is_demo = false);
    CREATE POLICY anon_reads_demo_bids ON public.bids
      FOR SELECT TO anon USING (is_demo = true);
  `)

  await exec('bulk_orders RLS', `
    DROP POLICY IF EXISTS authenticated_reads_live_bulk ON public.bulk_orders;
    DROP POLICY IF EXISTS anon_reads_demo_bulk ON public.bulk_orders;
    CREATE POLICY authenticated_reads_live_bulk ON public.bulk_orders
      FOR SELECT TO authenticated USING (is_demo = false);
    CREATE POLICY anon_reads_demo_bulk ON public.bulk_orders
      FOR SELECT TO anon USING (is_demo = true);
  `)

  await exec('sample_orders RLS', `
    DROP POLICY IF EXISTS authenticated_reads_live_samples ON public.sample_orders;
    DROP POLICY IF EXISTS anon_reads_demo_samples ON public.sample_orders;
    CREATE POLICY authenticated_reads_live_samples ON public.sample_orders
      FOR SELECT TO authenticated USING (is_demo = false);
    CREATE POLICY anon_reads_demo_samples ON public.sample_orders
      FOR SELECT TO anon USING (is_demo = true);
  `)

  await exec('alerts RLS', `
    DROP POLICY IF EXISTS authenticated_reads_live_alerts ON public.alerts;
    DROP POLICY IF EXISTS authenticated_writes_live_alerts ON public.alerts;
    DROP POLICY IF EXISTS anon_reads_demo_alerts ON public.alerts;
    CREATE POLICY authenticated_reads_live_alerts ON public.alerts
      FOR SELECT TO authenticated USING (is_demo = false);
    CREATE POLICY authenticated_writes_live_alerts ON public.alerts
      FOR INSERT TO authenticated WITH CHECK (is_demo = false);
    CREATE POLICY anon_reads_demo_alerts ON public.alerts
      FOR SELECT TO anon USING (is_demo = true);
  `)

  await exec('activity_log RLS', `
    DROP POLICY IF EXISTS authenticated_reads_live_activity ON public.activity_log;
    DROP POLICY IF EXISTS anon_reads_demo_activity ON public.activity_log;
    CREATE POLICY authenticated_reads_live_activity ON public.activity_log
      FOR SELECT TO authenticated USING (is_demo = false);
    CREATE POLICY anon_reads_demo_activity ON public.activity_log
      FOR SELECT TO anon USING (is_demo = true);
  `)

  await exec('products RLS', `
    DROP POLICY IF EXISTS authenticated_manages_live_products ON public.products;
    DROP POLICY IF EXISTS anon_reads_demo_products ON public.products;
    CREATE POLICY authenticated_manages_live_products ON public.products
      FOR ALL TO authenticated
      USING (is_demo = false) WITH CHECK (is_demo = false);
    CREATE POLICY anon_reads_demo_products ON public.products
      FOR SELECT TO anon USING (is_demo = true);
  `)

  console.log('\n' + '─'.repeat(60))
  console.log('Migration runner complete.')
  console.log('If any step printed SQL above, paste it into:')
  console.log('https://supabase.com/dashboard/project/apmwmncqmhjacwrmnfms/sql/new')
}

main()
