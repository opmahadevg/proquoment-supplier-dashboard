// Supplier Dashboard — Shared Procurement API Layer
// Cross-dashboard operations that connect to the shared Supabase instance
import { supabase } from './supabase'

// ── Notifications ─────────────────────────────────────

export async function fetchSupplierNotifications() {
  const { data, error } = await supabase.from('notifications').select('*')
    .eq('target_dashboard', 'supplier').order('created_at', { ascending: false }).limit(30)
  if (error) { console.error('fetchSupplierNotifications:', error); return [] }
  return (data || []).map(r => ({
    id: r.id, targetDashboard: r.target_dashboard, orderId: r.order_id,
    type: r.type, title: r.title, message: r.message,
    read: r.read ?? false, actionUrl: r.action_url, createdAt: r.created_at,
  }))
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

// ── Submit Quotation (Supplier → Admin) ───────────────
// Phase 2: Full bid payload — unit price, MOQ, lead time, payment terms, notes

export async function submitQuotation({
  rfqId,
  unitPrice,
  moq,
  leadTimeDays,
  paymentTerms,
  notes,
  validUntil,
  supplierId,
  supplierName,
  supplierEmail,
  quoteType,
}) {
  // Validate required numeric fields
  const parsedUnitPrice = parseFloat(unitPrice)
  const parsedMoq       = parseInt(moq, 10)
  const parsedLead      = parseInt(leadTimeDays, 10)

  if (isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) throw new Error('Unit price must be a positive number')
  if (isNaN(parsedMoq)       || parsedMoq <= 0)       throw new Error('MOQ must be a positive integer')
  if (isNaN(parsedLead)      || parsedLead <= 0)       throw new Error('Lead time must be a positive number')

  const id = `SQOT-${Date.now().toString(36).toUpperCase()}`

  // Resolve supplier ID to bigint
  let dbSupplierId = null
  const emailToLookup = supplierEmail || (typeof supplierId === 'string' && supplierId.includes('@') ? supplierId.replace('demo-', '') : null)
  
  if (emailToLookup) {
    const { data: sData, error: sErr } = await supabase
      .from('suppliers')
      .select('id')
      .eq('email', emailToLookup)
      .maybeSingle()
    if (!sErr && sData) {
      dbSupplierId = sData.id
    }
  }

  if (!dbSupplierId && supplierId) {
    const parsedId = parseInt(supplierId, 10)
    if (!isNaN(parsedId)) {
      dbSupplierId = parsedId
    }
  }

  if (!dbSupplierId && emailToLookup) {
    const demoEmailMap = {
      'ahmad@supplier.com': 18,
      'priya@valvetech.in': 19,
      'li.wei@precisionmfg.com': 20,
      'raj@hydrocast.in': 21
    }
    dbSupplierId = demoEmailMap[emailToLookup] || null
  }

  const quoteRow = {
    id,
    rfq_id:         rfqId,
    supplier_id:    dbSupplierId,
    supplier_name:  supplierName || null,
    unit_price:     parsedUnitPrice,
    moq:            parsedMoq,
    lead_time_days: parsedLead,
    delivery_days:  parsedLead,        // kept for legacy compat
    payment_terms:  paymentTerms || 'Net 30',
    notes:          notes        || null,
    valid_until:    validUntil   || null,
    validity_days:  validUntil
      ? Math.ceil((new Date(validUntil) - new Date()) / 86_400_000)
      : 14,
    status: 'pending',
    quote_type:     quoteType || 'bulk',
  }

  const { error: insertError } = await supabase.from('quotes').insert(quoteRow)
  if (insertError) throw insertError

  // Update RFQ status → bid_placed
  await supabase.from('rfqs').update({ status: 'bid_placed' }).eq('id', rfqId)

  // Notify Admin dashboard
  await supabase.from('notifications').insert({
    target_dashboard: 'admin',
    type: 'supplier_quotation',
    title: `Quotation Received for ${rfqId}`,
    message: `${supplierName || 'Supplier'} quoted $${parsedUnitPrice}/unit × MOQ ${parsedMoq} pcs · ${parsedLead} day lead time · ${paymentTerms || 'Net 30'}`,
    action_url: `/quotes/${id}`,
  })

  return id
}

// ── Fetch Quotes for a specific RFQ ───────────────────

export async function getQuotesForRFQ(rfqId) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('rfq_id', rfqId)
    .order('created_at', { ascending: false })
  if (error) { console.error('getQuotesForRFQ:', error); return [] }
  return (data || []).map(q => ({
    id:           q.id,
    rfqId:        q.rfq_id,
    supplierId:   q.supplier_id,
    supplierName: q.supplier_name,
    unitPrice:    q.unit_price,
    moq:          q.moq,
    totalValue:   q.total_value,
    leadTimeDays: q.lead_time_days,
    paymentTerms: q.payment_terms,
    notes:        q.notes,
    validUntil:   q.valid_until,
    status:       q.status,
    createdAt:    q.created_at,
  }))
}

// ── QC Ready Confirmation (Supplier → Admin) ──────────

export async function confirmQCReady(orderId, notes = '') {
  // Notify Admin that goods are ready for QC inspection
  await supabase.from('notifications').insert({
    target_dashboard: 'admin',
    order_id: orderId,
    type: 'qc_ready',
    title: `QC Ready: ${orderId}`,
    message: notes || 'Production complete — goods ready for quality inspection',
  })

  // Update order stage
  await supabase.from('orders').update({ stage: 'qc_inspection' }).eq('id', orderId)
}

// ── Production Milestone Updates (Supplier → Admin) ───

export async function updateMilestone({ orderId, title, description, status }) {
  const id = `MS-${Date.now().toString(36).toUpperCase()}`
  const { error } = await supabase.from('milestones').insert({
    id,
    order_id: orderId,
    title,
    description,
    status: status || 'completed',
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    updated_by: 'supplier',
  })
  if (error) throw error

  // Notify Admin
  await supabase.from('notifications').insert({
    target_dashboard: 'admin',
    order_id: orderId,
    type: 'milestone_update',
    title: `Milestone Update: ${title}`,
    message: `${description} (Order: ${orderId})`,
  })

  return id
}

// ── Fetch Assigned RFQs (from Admin) ──────────────────

export async function fetchAssignedRFQs(supplierName) {
  // First, fetch assignments from rfq_assignments matching supplierName
  const { data: assignments, error: assErr } = await supabase
    .from('rfq_assignments')
    .select('rfq_id')
    .eq('supplier_name', supplierName);
  if (assErr) { console.error('fetchAssignedRFQs assignments:', assErr); return [] }

  const assignedRfqIds = (assignments || []).map(a => a.rfq_id);

  // also fallback check assigned_supplier for backwards compatibility
  let query = supabase.from('rfqs').select('*');
  
  if (assignedRfqIds.length > 0) {
    // Construct the OR filter properly
    query = query.or(`id.in.(${assignedRfqIds.map(id => `"${id}"`).join(',')}),assigned_supplier.eq."${supplierName}"`);
  } else {
    query = query.eq('assigned_supplier', supplierName);
  }

  const { data, error } = await query
    .in('status', ['assigned', 'bid_placed', 'quoted'])
    .order('created_at', { ascending: false });

  if (error) { console.error('fetchAssignedRFQs:', error); return [] }
  return (data || []).map(r => {
    const buyerId = r.buyer_id ? `Buyer #${r.buyer_id.substring(0, 8)}` : (r.buyer ? `Buyer #${r.buyer.split(' ').map(w => w[0]).join('').toUpperCase()}-${r.id.slice(-4)}` : 'Verified Buyer')
    return {
      id: r.id, product: r.product, buyer: buyerId, qty: r.qty,
      value: r.value, status: r.status, date: r.date,
      targetPrice: r.target_price, specs: r.specs, deadline: r.deadline,
    }
  })
}

// ── Fetch Supplier Orders ─────────────────────────────

export async function fetchSupplierOrders(supplierName) {
  const { data, error } = await supabase.from('orders').select('*')
    .eq('supplier', supplierName)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchSupplierOrders:', error); return [] }
  return (data || []).map(r => {
    const buyerId = r.buyer_id ? `Buyer #${r.buyer_id.substring(0, 8)}` : (r.buyer ? `Buyer #${r.buyer.split(' ').map(w => w[0]).join('').toUpperCase()}-${r.id.slice(-4)}` : 'Verified Buyer')
    return {
      id: r.id, product: r.product, buyer: buyerId,
      value: r.value, stage: r.stage, progress: r.progress,
      days: r.days, eta: r.eta, priority: r.priority,
    }
  })
}

// ── Fetch Milestones for an Order ─────────────────────

export async function fetchOrderMilestones(orderId) {
  const { data, error } = await supabase.from('milestones').select('*')
    .eq('order_id', orderId).order('created_at')
  if (error) { console.error('fetchOrderMilestones:', error); return [] }
  return (data || []).map(r => ({
    id: r.id, title: r.title, description: r.description,
    status: r.status, targetDate: r.target_date,
    completedAt: r.completed_at, updatedBy: r.updated_by,
  }))
}

// ── Product Catalog (Supplier Dashboard) ──────────────────

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
    supplierId: p.supplier_id || null,
  }
}

export async function fetchProducts(supplierId, isDemo = false) {
  let query = supabase.from('products').select('*')
  
  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  } else {
    query = query.eq('is_demo', isDemo)
  }
  
  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) {
    console.error('fetchProducts error:', error)
    return []
  }
  return (data || []).map(transformProduct)
}

export async function createProduct(product, supplierId, isDemo = false) {
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
      image_url: product.image || null,
      supplier_id: supplierId,
      is_demo: isDemo,
    })
    .select()
    .single()

  if (error) throw error
  return data ? transformProduct(data) : null
}

export async function updateProduct(id, updates, supplierId) {
  let query = supabase.from('products').update({
    name: updates.name,
    category: updates.category,
    sku: updates.sku,
    hsn: updates.hsn,
    price: updates.price,
    moq: updates.moq,
    lead_time: updates.lead,
    description: updates.description,
    stock: updates.stock,
    image_url: updates.image || null,
  }).eq('id', id)

  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  const { data, error } = await query.select().single()
  if (error) throw error
  return data ? transformProduct(data) : null
}

export async function deleteProduct(id, supplierId) {
  let query = supabase.from('products').delete().eq('id', id)
  
  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  const { error } = await query
  if (error) throw error
  return true
}

// Ensure 'procurement' storage bucket exists with public read access
async function ensureBucketExists() {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) throw listError
    const exists = buckets && buckets.some(b => b.name === 'procurement')
    if (!exists) {
      const { error: createError } = await supabase.storage.createBucket('procurement', {
        public: true,
        fileSizeLimit: 10485760 // 10MB limit
      })
      if (createError) throw createError
    }
  } catch (err) {
    console.warn('ensureBucketExists list/create failed (ignoring):', err.message)
  }
}

// Upload QC image or shipping document to Supabase Storage
export async function uploadOrderDocument(orderId, file) {
  await ensureBucketExists()

  const fileExt = file.name.split('.').pop()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const uniqueName = `${orderId}-${cleanFileName}-${Date.now()}.${fileExt}`
  const filePath = `documents/${uniqueName}`

  try {
    const { data, error } = await supabase.storage
      .from('procurement')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage
      .from('procurement')
      .getPublicUrl(filePath)

    return {
      url: publicUrlData?.publicUrl || '',
      name: file.name,
      isFallback: false
    }
  } catch (error) {
    console.error('uploadOrderDocument failed. Using graceful fallback URL:', error)
    let fallbackUrl = ''
    try {
      fallbackUrl = URL.createObjectURL(file)
    } catch (e) {
      fallbackUrl = `https://apmwmncqmhjacwrmnfms.supabase.co/storage/v1/object/public/procurement/fallback-${uniqueName}`
    }
    return {
      url: fallbackUrl,
      name: file.name,
      isFallback: true
    }
  }
}

// Update milestones, progress and status in bulk_orders table
export async function updateBulkOrderMilestones(orderId, milestonesList, progress, status) {
  const { data, error } = await supabase
    .from('bulk_orders')
    .update({
      milestones: milestonesList,
      progress: parseInt(progress, 10) || 0,
      status: status || 'In Production'
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('updateBulkOrderMilestones error:', error)
    throw error
  }

  // Sync back to unified orders table for admin view tracking
  try {
    const stage = status === 'Delivered' ? 'delivered' : status === 'Shipped' ? 'shipped' : 'production'
    await supabase
      .from('orders')
      .update({
        progress: parseInt(progress, 10) || 0,
        stage: stage
      })
      .eq('id', orderId)
  } catch (err) {
    console.warn('Sync to unified orders failed (non-blocking):', err.message)
  }

  return data
}

// Update status and optional attachments in sample_orders table
export async function updateSampleOrderStatus(orderId, status, docUrl = null, docName = null) {
  const updates = { status }
  if (docUrl) updates.doc_url = docUrl
  if (docName) updates.doc_name = docName

  if (status === 'Delivered') {
    updates.delivered_at = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const { data, error } = await supabase
    .from('sample_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('updateSampleOrderStatus error:', error)
    throw error
  }
  return data
}

// ─────────────────────────────────────────────────────────────
// SAMPLES FLOW API FUNCTIONS
// ─────────────────────────────────────────────────────────────

export async function fetchSampleRFQsForSupplier(supplierName) {
  const { data, error } = await supabase
    .from('sample_rfqs')
    .select('*')
    .contains('assigned_supplier_ids', [supplierName])
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchSampleRFQsForSupplier error:', error);
    throw error;
  }
  return (data || []).map(r => {
    const buyerId = r.parent_rfq_id ? `Buyer #${r.parent_rfq_id.slice(-8)}` : (r.buyer ? `Buyer #${r.buyer.split(' ').map(w => w[0]).join('').toUpperCase()}-${r.id.slice(-4)}` : 'Verified Buyer')
    return {
      ...r,
      buyer: buyerId
    }
  });
}

export async function submitSampleQuote(sampleRfqId, quoteData) {
  const quoteId = `SQ-${Date.now()}`;
  const { error: insertErr } = await supabase
    .from('sample_quotes')
    .insert({
      id: quoteId,
      sample_rfq_id: sampleRfqId,
      supplier_id: quoteData.supplierId,
      supplier_name: quoteData.supplierName,
      unit_price: parseFloat(quoteData.unitPrice),
      sample_qty: parseInt(quoteData.sampleQty, 10),
      lead_time_days: parseInt(quoteData.leadTimeDays, 10),
      payment_terms: quoteData.paymentTerms,
      notes: quoteData.notes || '',
      valid_until: quoteData.validUntil || '',
      status: 'pending'
    });
  if (insertErr) {
    console.error('submitSampleQuote error:', insertErr);
    throw insertErr;
  }

  // Update sample RFQ status to bids_received
  await supabase
    .from('sample_rfqs')
    .update({ status: 'bids_received', updated_at: new Date().toISOString() })
    .eq('id', sampleRfqId);

  // Insert notification for admin
  await supabase.from('notifications').insert({
    target_dashboard: 'admin',
    type: 'sample_bid_received',
    title: `New Sample Bid Received`,
    message: `${quoteData.supplierName} submitted a quote for sample request ${sampleRfqId}.`,
    read: false,
    action_url: '/sample-management'
  });

  return quoteId;
}

export async function fetchSampleQuotesForSupplier(supplierName) {
  const { data, error } = await supabase
    .from('sample_quotes')
    .select('*, sample_rfqs(*)')
    .eq('supplier_name', supplierName)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchSampleQuotesForSupplier error:', error);
    throw error;
  }
  return (data || []).map(q => {
    if (q.sample_rfqs) {
      const buyerId = q.sample_rfqs.parent_rfq_id ? `Buyer #${q.sample_rfqs.parent_rfq_id.slice(-8)}` : (q.sample_rfqs.buyer ? `Buyer #${q.sample_rfqs.buyer.split(' ').map(w => w[0]).join('').toUpperCase()}-${q.sample_rfqs.id.slice(-4)}` : 'Verified Buyer')
      q.sample_rfqs.buyer = buyerId
    }
    return q;
  });
}

export async function fetchSampleOrdersForSupplier(supplierName) {
  const { data, error } = await supabase
    .from('sample_orders')
    .select('*')
    .eq('supplier', supplierName)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchSampleOrdersForSupplier error:', error);
    throw error;
  }
  return (data || []).map(o => ({
    ...o,
    buyer: o.buyer_id ? `Buyer #${o.buyer_id.substring(0, 8)}` : o.buyer_name || 'Verified Buyer'
  }));
}

export async function upsertSampleStageSupplier(sampleOrderId, stageName, status, notes, supplierName) {
  // 1. Check if stage exists
  const { data: existing, error: findErr } = await supabase
    .from('sample_stages')
    .select('id')
    .eq('sample_order_id', sampleOrderId)
    .eq('stage_name', stageName)
    .maybeSingle();
  if (findErr) throw findErr;

  let result;
  if (existing) {
    const { data, error: updateErr } = await supabase
      .from('sample_stages')
      .update({
        status: status,
        notes: notes,
        updated_by: 'supplier',
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateErr) throw updateErr;
    result = data;
  } else {
    const { data, error: insertErr } = await supabase
      .from('sample_stages')
      .insert({
        sample_order_id: sampleOrderId,
        stage_name: stageName,
        status: status,
        notes: notes,
        updated_by: 'supplier'
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    result = data;
  }

  // Update sample order status
  let orderStatus = 'confirmed';
  if (stageName === 'shipping' && status === 'completed') {
    orderStatus = 'shipped';
  } else if (stageName === 'qa' && status === 'completed') {
    orderStatus = 'qa_check';
  } else if (status === 'in_progress') {
    orderStatus = 'in_production';
  }

  await supabase
    .from('sample_orders')
    .update({
      status: orderStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', sampleOrderId);

  // Fetch order details for notifications
  const { data: order } = await supabase
    .from('sample_orders')
    .select('buyer, product, parent_rfq_id')
    .eq('id', sampleOrderId)
    .single();

  if (order) {
    // Notify admin
    await supabase.from('notifications').insert({
      target_dashboard: 'admin',
      type: 'sample_stage_updated',
      title: `Sample Stage Updated by Supplier: ${stageName.toUpperCase()}`,
      message: `${supplierName} updated ${stageName} stage to ${status.toUpperCase()} for sample order ${sampleOrderId}.`,
      read: false,
      action_url: '/sample-management'
    });

    // Notify buyer
    await supabase.from('notifications').insert({
      target_dashboard: 'buyer',
      order_id: order.parent_rfq_id || undefined,
      type: 'sample_stage_updated',
      title: `Sample Stage Updated: ${stageName.toUpperCase()}`,
      message: `Supplier ${supplierName} updated stage ${stageName} to ${status.toUpperCase()} for your sample of ${order.product}.`,
      read: false,
      action_url: `/product-detail?id=${order.parent_rfq_id}`
    });
  }

  return result;
}

export async function fetchSampleStagesForOrderSupplier(sampleOrderId) {
  const { data, error } = await supabase
    .from('sample_stages')
    .select('*')
    .eq('sample_order_id', sampleOrderId)
    .order('updated_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function uploadSampleDocumentSupplier(sampleOrderId, stageName, docType, file, supplierName) {
  const ext = file.name.split('.').pop() || 'pdf';
  const storagePath = `${sampleOrderId}/${stageName}/${docType.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('sample-documents')
    .upload(storagePath, file, { cacheControl: '3600', upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: publicUrlData } = supabase.storage
    .from('sample-documents')
    .getPublicUrl(storagePath);
  const fileUrl = publicUrlData.publicUrl;

  const { data, error: insertErr } = await supabase
    .from('sample-documents')
    .insert({
      sample_order_id: sampleOrderId,
      stage_name: stageName,
      doc_type: docType,
      file_url: fileUrl,
      file_name: file.name,
      storage_path: storagePath,
      uploaded_by: supplierName
    })
    .select()
    .single();
  if (insertErr) throw insertErr;

  // Fetch order details for notifications
  const { data: order } = await supabase
    .from('sample_orders')
    .select('product, parent_rfq_id')
    .eq('id', sampleOrderId)
    .single();

  if (order) {
    // Notify admin
    await supabase.from('notifications').insert({
      target_dashboard: 'admin',
      type: 'sample_doc_uploaded',
      title: `New Sample Document from Supplier`,
      message: `${supplierName} uploaded ${docType} for sample order ${sampleOrderId}.`,
      read: false,
      action_url: '/sample-management'
    });

    // Notify buyer
    await supabase.from('notifications').insert({
      target_dashboard: 'buyer',
      order_id: order.parent_rfq_id || undefined,
      type: 'sample_doc_uploaded',
      title: `New Sample Document Uploaded`,
      message: `Supplier ${supplierName} uploaded ${docType} for your sample of ${order.product}.`,
      read: false,
      action_url: `/product-detail?id=${order.parent_rfq_id}`
    });
  }

  return data;
}

export async function fetchSampleDocumentsForOrderSupplier(sampleOrderId) {
  const { data, error } = await supabase
    .from('sample_documents')
    .select('*')
    .eq('sample_order_id', sampleOrderId)
    .order('uploaded_at', { ascending: true });
  if (error) throw error;
  return data || [];
}



