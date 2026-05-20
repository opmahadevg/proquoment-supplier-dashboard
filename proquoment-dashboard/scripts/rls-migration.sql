-- ================================================================
-- PROQUOMENT — Complete RLS Migration
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/apmwmncqmhjacwrmnfms/sql/new
-- ================================================================

-- ── 1. milestones ────────────────────────────────────────────

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

-- ── 2. notifications ─────────────────────────────────────────

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

-- ── 3. Enable RLS on supplier-specific tables ────────────────

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ── 4. bids ──────────────────────────────────────────────────

DROP POLICY IF EXISTS authenticated_reads_live_bids ON public.bids;
DROP POLICY IF EXISTS anon_reads_demo_bids ON public.bids;

CREATE POLICY authenticated_reads_live_bids ON public.bids
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_bids ON public.bids
  FOR SELECT TO anon USING (is_demo = true);

-- ── 5. bulk_orders ───────────────────────────────────────────

DROP POLICY IF EXISTS authenticated_reads_live_bulk ON public.bulk_orders;
DROP POLICY IF EXISTS anon_reads_demo_bulk ON public.bulk_orders;

CREATE POLICY authenticated_reads_live_bulk ON public.bulk_orders
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_bulk ON public.bulk_orders
  FOR SELECT TO anon USING (is_demo = true);

-- ── 6. sample_orders ─────────────────────────────────────────

DROP POLICY IF EXISTS authenticated_reads_live_samples ON public.sample_orders;
DROP POLICY IF EXISTS anon_reads_demo_samples ON public.sample_orders;

CREATE POLICY authenticated_reads_live_samples ON public.sample_orders
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_samples ON public.sample_orders
  FOR SELECT TO anon USING (is_demo = true);

-- ── 7. alerts ────────────────────────────────────────────────

DROP POLICY IF EXISTS authenticated_reads_live_alerts ON public.alerts;
DROP POLICY IF EXISTS authenticated_writes_live_alerts ON public.alerts;
DROP POLICY IF EXISTS anon_reads_demo_alerts ON public.alerts;

CREATE POLICY authenticated_reads_live_alerts ON public.alerts
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY authenticated_writes_live_alerts ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (is_demo = false);
CREATE POLICY anon_reads_demo_alerts ON public.alerts
  FOR SELECT TO anon USING (is_demo = true);

-- ── 8. activity_log ──────────────────────────────────────────

DROP POLICY IF EXISTS authenticated_reads_live_activity ON public.activity_log;
DROP POLICY IF EXISTS anon_reads_demo_activity ON public.activity_log;

CREATE POLICY authenticated_reads_live_activity ON public.activity_log
  FOR SELECT TO authenticated USING (is_demo = false);
CREATE POLICY anon_reads_demo_activity ON public.activity_log
  FOR SELECT TO anon USING (is_demo = true);

-- ── 9. products ──────────────────────────────────────────────

DROP POLICY IF EXISTS authenticated_manages_live_products ON public.products;
DROP POLICY IF EXISTS anon_reads_demo_products ON public.products;

CREATE POLICY authenticated_manages_live_products ON public.products
  FOR ALL TO authenticated
  USING (is_demo = false) WITH CHECK (is_demo = false);
CREATE POLICY anon_reads_demo_products ON public.products
  FOR SELECT TO anon USING (is_demo = true);

-- ── Verify ───────────────────────────────────────────────────

SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'rfqs','orders','milestones','notifications',
    'bids','bulk_orders','sample_orders','alerts',
    'activity_log','products'
  )
ORDER BY tablename, policyname;
