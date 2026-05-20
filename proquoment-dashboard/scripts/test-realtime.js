import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

// Simple manual .env parser
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const value = parts.slice(1).join('=').trim()
      env[key] = value
    }
  }
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRealtime() {
  console.log('Sending Real-Time trigger updates to Supabase...')
  
  // 1. Insert a new RFQ to trigger notification & item update
  const rfqId = `RFQ-TEST-${Math.floor(Math.random() * 1000)}`
  console.log(`Inserting test RFQ: ${rfqId}`)
  const { error: rfqErr } = await supabase
    .from('rfqs')
    .insert({
      id: rfqId,
      product: 'Test Copper Tubing',
      title: 'Test Copper Tubing',
      buyer: 'Industrial Sourcing Corp',
      buyer_name: 'Industrial Sourcing Corp',
      buyer_logo: 'IS',
      category: 'Industrial Metals',
      qty: '2000 meters',
      quantity: '2000 meters',
      deadline: '2026-06-30',
      budget_min: 5000,
      budget_max: 8000,
      value: '$5,000 – $8,000',
      budget_display: '$5,000 – $8,000',
      match_score: 95,
      status: 'new',
      description: 'Test RFQ for realtime verification.',
      location: 'New Delhi, India',
      buyer_verified: true
    })
  if (rfqErr) console.error('Error inserting RFQ:', rfqErr)
  else console.log('Successfully inserted test RFQ!')

  // 2. Update progress on bulk order BO-2024-001
  const newProgress = Math.floor(Math.random() * 30) + 70 // 70% to 99%
  console.log(`Updating progress of Bulk Order BO-2024-001 to ${newProgress}%`)
  const { error: boErr } = await supabase
    .from('bulk_orders')
    .update({ progress: newProgress })
    .eq('id', 'BO-2024-001')
  if (boErr) console.error('Error updating bulk order:', boErr)
  else console.log('Successfully updated bulk order progress!')

  // 3. Create a new alert
  console.log('Inserting new alert')
  const { error: alertErr } = await supabase
    .from('alerts')
    .insert({
      type: 'rfq',
      icon: 'request_quote',
      title: 'Realtime Verification Alert',
      description: `Test alert created at ${new Date().toLocaleTimeString()}`,
      action_label: 'View RFQs',
      action_path: '/matched-rfqs',
      read: false
    })
  if (alertErr) console.error('Error inserting alert:', alertErr)
  else console.log('Successfully inserted test alert!')

  console.log('Done triggering updates.')
}

testRealtime()
