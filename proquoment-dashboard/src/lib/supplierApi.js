import { supabase } from './supabase'

// Format ISO string to time ago
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

export async function getAssignedRFQs(authUserId, isDemo = false) {
  if (isDemo) {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*')
      .eq('is_demo', true)
      .order('match_score', { ascending: false })
    if (error) throw error
    return data || []
  }

  if (!authUserId) return []

  // Get RFQ IDs assigned to this supplier authUserId
  const { data: assignments, error: assignErr } = await supabase
    .from('rfq_assignments')
    .select('rfq_id')
    .eq('supplier_id', authUserId)

  if (assignErr) throw assignErr
  if (!assignments || assignments.length === 0) return []

  const rfqIds = assignments.map(a => a.rfq_id)

  const { data: rfqs, error: rfqErr } = await supabase
    .from('rfqs')
    .select('*')
    .in('id', rfqIds)
    .order('created_at', { ascending: false })

  if (rfqErr) throw rfqErr
  return rfqs || []
}

export async function getBids(authUserId, isDemo = false) {
  if (isDemo) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('is_demo', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  if (!authUserId) return []

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('auth_supplier_id', authUserId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function submitBid(rfqId, authUserId, supplierId, supplierName, payload, isDemo = false) {
  // Calculate total value
  const qty = payload.qty || 1
  const unitPrice = payload.unitPrice || 0
  const totalValue = qty * unitPrice

  // 1. Insert into quotes table
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .insert({
      rfq_id: rfqId,
      supplier_id: supplierId,
      auth_supplier_id: authUserId,
      supplier_name: supplierName,
      unit_price: unitPrice,
      moq: payload.moq || 1,
      total_value: totalValue,
      lead_time_days: payload.leadTime || 30,
      payment_terms: payload.paymentTerms || '30% Advance, 70% against BL copy',
      notes: payload.notes || '',
      status: 'pending',
      quote_type: 'supplier',
      is_demo: isDemo
    })
    .select()
    .single()

  if (quoteErr) throw quoteErr

  // 2. Update rfqs status to 'bid_placed'
  const { error: rfqErr } = await supabase
    .from('rfqs')
    .update({ status: 'bid_placed', assigned_supplier: supplierName })
    .eq('id', rfqId)

  if (rfqErr) throw rfqErr

  // 3. Create notification for admin
  const { error: notifErr } = await supabase
    .from('notifications')
    .insert({
      target_dashboard: 'admin',
      order_id: rfqId,
      type: 'bid',
      title: 'New Bid Received',
      message: `${supplierName} submitted a bid of $${unitPrice} per unit for RFQ ${rfqId}`,
      read: false,
      is_demo: isDemo
    })

  if (notifErr) throw notifErr

  return quote
}

export async function getSupplierNotifications(authUserId, isDemo = false) {
  if (isDemo) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_dashboard', 'supplier')
      .eq('is_demo', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  if (!authUserId) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('target_dashboard', 'supplier')
    .eq('supplier_id', authUserId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function markNotificationRead(notifId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notifId)
  if (error) throw error
  return true
}

export async function getConversations(authUserId, isDemo = false) {
  if (!authUserId) return []

  // 1. Fetch conversations for this supplier
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('supplier_id', authUserId)
    .order('last_message_at', { ascending: false })

  if (convErr) throw convErr
  if (!convs || convs.length === 0) return []

  // 2. Fetch all messages in these conversations
  const convIds = convs.map(c => c.id)
  const { data: msgs, error: msgErr } = await supabase
    .from('supplier_messages')
    .select('*')
    .in('conversation_id', convIds)
    .order('sent_at', { ascending: true })

  if (msgErr) throw msgErr

  // Show all conversations, do not filter them out just because admin has not replied yet
  const repliedConvs = convs


  return repliedConvs.map(c => {
    const cMsgs = (msgs || []).filter(m => m.conversation_id === c.id)
    return {
      id: c.id,
      name: 'Proquoment Admin',
      avatar: 'A',
      lastMessage: c.last_message,
      time: fmtTimeAgo(c.last_message_at),
      unread: c.unread_count || 0,
      online: true,
      messages: cMsgs.map(m => ({
        id: m.id,
        from: m.from_me ? 'them' : 'me', // from_me = true means Admin, from_me = false means Supplier
        text: m.text,
        time: fmtTimeAgo(m.sent_at || m.created_at)
      }))
    }
  })
}

export async function sendMessageToAdmin(authUserId, supplierId, supplierName, text, isDemo = false) {
  if (!authUserId) return null

  // 1. Look up existing conversation
  const { data: existing, error: existErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('supplier_id', authUserId)
    .maybeSingle()

  if (existErr) throw existErr

  let convId = ''
  if (existing) {
    convId = existing.id
  } else {
    // Create new conversation
    const avatar = supplierName ? supplierName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'S'
    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({
        buyer_name: supplierName || 'Supplier',
        buyer_logo: avatar,
        last_message: text,
        last_message_at: new Date().toISOString(),
        unread_count: 1, // Admin has 1 unread message
        online: true,
        supplier_id: authUserId,
        is_demo: false
      })
      .select('id')
      .single()

    if (createErr) throw createErr
    convId = newConv.id
  }

  // 2. Insert the message
  const { data: newMsg, error: msgErr } = await supabase
    .from('supplier_messages')
    .insert({
      conversation_id: convId,
      from_me: false, // from_me = false from Admin perspective, i.e. sent by Supplier
      text: text,
      supplier_id: authUserId,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  if (msgErr) throw msgErr

  // 3. Update conversation last message details and increment admin unread count
  const nextUnread = existing ? (existing.unread_count || 0) + 1 : 1
  const { error: updateErr } = await supabase
    .from('conversations')
    .update({
      last_message: text,
      last_message_at: new Date().toISOString(),
      unread_count: nextUnread
    })
    .eq('id', convId)

  if (updateErr) throw updateErr

  return {
    id: newMsg.id,
    from: 'me',
    text: newMsg.text,
    time: 'Just now'
  }
}
