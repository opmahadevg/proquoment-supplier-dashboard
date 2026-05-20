import { supabase } from './supabase'

// ── Helpers ─────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTimeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

const BID_STATUS_COLORS = {
  'Pending':      'bg-[#ffdad6] text-[#ba1a1a]',
  'Under Review': 'bg-[#e1e0ff] text-[#0f00da]',
  'Won':          'bg-[#e1e0ff] text-[#0f00da]',
  'Lost':         'bg-[#e8e8e8] text-[#9e9e9e]',
  'Expired':      'bg-[#e8e8e8] text-[#9e9e9e]',
}

const SAMPLE_STATUS_COLORS = {
  'Delivered':  'bg-[#e1e0ff] text-[#0f00da]',
  'In Transit': 'bg-[#ffdad6] text-[#ba1a1a]',
  'Pending':    'bg-[#e8e8e8] text-[#9e9e9e]',
}

// ── Transformers ─────────────────────────────────────────────

export function transformRFQ(r) {
  const deadline = r.deadline ? r.deadline.replace(/-/g, '') : 0
  return {
    id: r.id,
    title: r.title,
    buyer: r.buyer_name,
    buyerLogo: r.buyer_logo,
    category: r.category,
    quantity: r.quantity,
    deadline: fmtDate(r.deadline),
    deadlineTs: parseInt(deadline) || 0,
    budget: r.budget_display,
    budgetMin: r.budget_min,
    match: r.match_score,
    status: r.status,
    description: r.description,
    specs: Array.isArray(r.specs) ? r.specs : [],
    location: r.location,
    postedTime: fmtTimeAgo(r.posted_at),
    savedBy: r.saved_by,
    bidsReceived: r.bids_received,
    buyerVerified: r.buyer_verified,
  }
}

export function transformBid(b) {
  return {
    id: b.id,
    rfqId: b.rfq_id,
    title: b.title,
    buyer: b.buyer_name,
    buyerLogo: b.buyer_logo,
    submitted: fmtDate(b.submitted_at),
    expires: fmtDate(b.expires_at),
    myBid: b.amount_display,
    status: b.status,
    statusColor: BID_STATUS_COLORS[b.status] || 'bg-[#e8e8e8] text-[#9e9e9e]',
    quantity: b.quantity,
    deliveryDays: b.delivery_days,
    rank: b.rank,
    totalBids: b.total_bids,
  }
}

export function transformBulkOrder(o) {
  return {
    id: o.id,
    product: o.product,
    buyer: o.buyer_name,
    buyerLogo: o.buyer_logo,
    orderValue: o.order_value,
    status: o.status,
    statusColor: o.status === 'Delivered' ? 'bg-[#e1e0ff] text-[#0f00da]'
      : o.status === 'In Production' || o.status === 'Shipped' ? 'bg-[#e1e0ff] text-[#0f00da]'
      : 'bg-[#e8e8e8] text-[#9e9e9e]',
    placed: fmtDate(o.placed_at),
    delivery: fmtDate(o.delivery_at),
    progress: o.progress,
    milestones: Array.isArray(o.milestones) ? o.milestones : [],
  }
}

export function transformSampleOrder(s) {
  return {
    id: s.id,
    product: s.product,
    buyer: s.buyer_name,
    buyerLogo: s.buyer_logo,
    quantity: s.quantity,
    status: s.status,
    statusColor: SAMPLE_STATUS_COLORS[s.status] || 'bg-[#e8e8e8] text-[#9e9e9e]',
    requested: fmtDate(s.requested_at),
    delivered: s.delivered_at,
    feedback: s.feedback,
    docUrl: s.doc_url || null,
    docName: s.doc_name || null,
  }
}

export function transformProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    sku: p.sku,
    hsn: p.hsn || '',
    price: p.price,
    moq: p.moq,
    lead: p.lead_time,
    description: p.description,
    stock: p.stock,
    image: p.image_url || null,
  }
}

export function transformConversation(c, msgs) {
  return {
    id: c.id,
    name: c.buyer_name,
    avatar: c.buyer_logo,
    lastMessage: c.last_message,
    time: fmtTimeAgo(c.last_message_at),
    unread: c.unread_count,
    online: c.online,
    messages: (msgs || []).map(m => ({
      id: m.id,
      from: m.from_me ? 'me' : 'them',
      text: m.text,
      time: fmtTimeAgo(m.sent_at),
    })),
  }
}


// ── Data Fetchers ────────────────────────────────────────────

export async function getRFQs(isDemo = false) {
  const { data, error } = await supabase
    .from('rfqs')
    .select('*')
    .eq('is_demo', isDemo)
    .order('match_score', { ascending: false })
  if (error || !data?.length) return null
  return data.map(transformRFQ)
}

export async function updateRFQStatus(id, status) {
  const { error } = await supabase
    .from('rfqs')
    .update({ status })
    .eq('id', id)
  return !error
}

export async function getBids(isDemo = false) {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('is_demo', isDemo)
    .order('submitted_at', { ascending: false })
  if (error || !data?.length) return null
  return data.map(transformBid)
}

export async function getBulkOrders(isDemo = false) {
  const { data, error } = await supabase
    .from('bulk_orders')
    .select('*')
    .eq('is_demo', isDemo)
    .order('placed_at', { ascending: false })
  if (error || !data?.length) return null
  return data.map(transformBulkOrder)
}

export async function getSampleOrders(isDemo = false) {
  const { data, error } = await supabase
    .from('sample_orders')
    .select('*')
    .eq('is_demo', isDemo)
    .order('requested_at', { ascending: false })
  if (error || !data?.length) return null
  return data.map(transformSampleOrder)
}

export async function getProducts(isDemo = false) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_demo', isDemo)
    .order('created_at', { ascending: true })
  if (error || !data?.length) return null
  return data.map(transformProduct)
}

export async function insertProduct(product, isDemo = false) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      category: product.category,
      sku: product.sku,
      hsn: product.hsn,
      price: product.price,
      moq: product.moq,
      lead_time: product.lead,
      description: product.description,
      stock: product.stock,
      is_demo: isDemo,
    })
    .select()
    .single()
  return { data: data ? transformProduct(data) : null, error }
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  return !error
}

export async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: updates.name,
      category: updates.category,
      sku: updates.sku,
      hsn: updates.hsn,
      price: updates.price,
      moq: updates.moq,
      lead_time: updates.lead,
      description: updates.description,
      stock: updates.stock,
    })
    .eq('id', id)
    .select()
    .single()
  return { data: data ? transformProduct(data) : null, error }
}

export async function getConversations() {
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
  if (convErr || !convs?.length) return null

  const { data: allMsgs } = await supabase
    .from('supplier_messages')
    .select('*')
    .order('sent_at', { ascending: true })

  return convs.map(c => {
    const msgs = (allMsgs || []).filter(m => m.conversation_id === c.id)
    return transformConversation(c, msgs)
  })
}

export async function sendMessage(conversationId, text) {
  const { data, error } = await supabase
    .from('supplier_messages')
    .insert({ conversation_id: conversationId, from_me: true, text })
    .select()
    .single()
  if (error) return null
  await supabase
    .from('conversations')
    .update({ last_message: text, last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
  return { id: data.id, from: 'me', text: data.text, time: 'Just now' }
}

export async function getActivityLog(isDemo = false) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('is_demo', isDemo)
    .order('created_at', { ascending: false })
    .limit(8)
  if (error || !data?.length) return null
  const STATUS_COLORS = {
    new:       'bg-[#e1e0ff] text-[#0f00da]',
    pending:   'bg-[#ffdad6] text-[#ba1a1a]',
    won:       'bg-[#e1e0ff] text-[#0f00da]',
    delivered: 'bg-[#e8e8e8] text-[#555555]',
  }
  return data.map(a => ({
    id: a.id,
    type: a.type,
    desc: a.description,
    buyer: a.buyer_name,
    time: fmtTimeAgo(a.created_at),
    status: a.status,
    statusColor: STATUS_COLORS[a.status_type] || 'bg-[#e8e8e8] text-[#555555]',
  }))
}

export async function getAlerts(isDemo = false) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_demo', isDemo)
    .eq('read', false)
    .order('created_at', { ascending: false })
  if (error || !data?.length) return null
  const ALERT_COLORS = {
    rfq:     'bg-[#e1e0ff] text-[#0f00da]',
    bid:     'bg-[#ffdad6] text-[#ba1a1a]',
    message: 'bg-[#e1e0ff] text-[#0f00da]',
  }
  return data.map(a => ({
    id: a.id,
    type: a.type,
    icon: a.icon,
    color: ALERT_COLORS[a.type] || 'bg-[#e8e8e8] text-[#555555]',
    title: a.title,
    desc: a.description,
    time: fmtTimeAgo(a.created_at),
    action: a.action_label,
    path: a.action_path,
  }))
}

export async function getAnalyticsMonthly() {
  const { data, error } = await supabase
    .from('analytics_monthly')
    .select('*')
    .order('year', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data?.length) return null
  return data
}
