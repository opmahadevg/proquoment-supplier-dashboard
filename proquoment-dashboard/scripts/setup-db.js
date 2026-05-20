/**
 * Proquoment Supabase DB Setup Checker
 * Run: node scripts/setup-db.js
 *
 * This script checks whether the Supabase tables exist and reports
 * what tables are found vs missing. To create them, paste the
 * contents of supabase/migrations/001_schema.sql into:
 * https://supabase.com/dashboard/project/jpsifaqpodwijvgfqfok/sql/new
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jpsifaqpodwijvgfqfok.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_ANON_KEY) {
  console.error('❌  SUPABASE_ANON_KEY is not set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TABLES = [
  'companies', 'rfqs', 'bids', 'bulk_orders', 'sample_orders',
  'products', 'conversations', 'messages', 'activity_log',
  'alerts', 'analytics_monthly',
]

console.log('\n🔍  Checking Supabase tables...\n')
let allOk = true

for (const table of TABLES) {
  const { error } = await supabase.from(table).select('id').limit(1)
  if (error && error.code === '42P01') {
    console.log(`  ❌  ${table} — not found`)
    allOk = false
  } else if (error) {
    console.log(`  ⚠️   ${table} — error: ${error.message}`)
    allOk = false
  } else {
    console.log(`  ✅  ${table} — OK`)
  }
}

if (allOk) {
  console.log('\n🎉  All tables found! Database is ready.\n')
} else {
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_schema.sql')
  console.log('\n⚠️  Some tables are missing.\n')
  console.log('  To create them, open the Supabase SQL Editor:')
  console.log('  https://supabase.com/dashboard/project/jpsifaqpodwijvgfqfok/sql/new\n')
  console.log('  Copy and paste the contents of:')
  console.log(`  ${sqlPath}\n`)
  console.log('  Then click "Run" (or press Ctrl+Enter / Cmd+Enter).\n')
}
