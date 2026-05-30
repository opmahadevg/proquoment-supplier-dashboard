/**
 * supplierProfileApi.js
 * ─────────────────────────────────────────────────────────────
 * Full CRUD for supplier self-managed profile data.
 * All tables live in the SHARED Supabase DB (apmwmncqmhjacwrmnfms).
 *
 * Table key strategy:
 *   supplier_auth_id = auth.users UUID  (real Supabase users)
 *                    = 'demo-{email}'   (demo / local accounts)
 *
 * Admin notification: inserts into shared `notifications` table
 * with target_dashboard = 'admin', which the Admin Dashboard picks
 * up via its existing real-time Supabase listener.
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Build a stable key for identifying the current supplier. */
export function getSupplierAuthId(user) {
  if (!user) return null
  // Demo users have no real UUID — use 'demo-{email}'
  if (user.id?.startsWith('demo-')) return user.id
  // Real Supabase auth users
  return user.id
}

/** Calculate profile completion percentage (0-100). */
function calcCompletion(profile, locations, certifications, contacts) {
  const checks = [
    !!profile?.company_name,
    !!profile?.founded,
    !!profile?.employees,
    !!profile?.website,
    !!profile?.contact_email,
    !!profile?.contact_phone,
    !!profile?.address,
    !!profile?.description,
    !!profile?.payment_terms,
    !!profile?.tax_number,
    !!profile?.bank_name,
    (profile?.categories?.length ?? 0) > 0,
    (profile?.countries?.length ?? 0) > 0,
    locations.length > 0,
    certifications.length > 0,
    contacts.length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

// ─────────────────────────────────────────────────────────────
// SUPPLIER PROFILE (company details + financials in one row)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the supplier's profile row.
 * Returns null if no profile saved yet (first time).
 */
export async function getSupplierProfile(supplierAuthId) {
  if (!supplierAuthId) return null
  const { data, error } = await supabase
    .from('supplier_profile')
    .select('*')
    .eq('supplier_auth_id', supplierAuthId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[supplierProfileApi] getSupplierProfile:', error.message)
    return null
  }
  return data || null
}

/**
 * Upsert the core profile row (company details + financials).
 * Automatically recalculates profile_completion.
 */
export async function upsertSupplierProfile(supplierAuthId, profileData, locations = [], certs = [], contacts = []) {
  if (!supplierAuthId) return { error: 'No supplier auth ID' }

  const completion = calcCompletion(
    { ...profileData, categories: profileData.categories || [], countries: profileData.countries || [] },
    locations,
    certs,
    contacts
  )

  const row = {
    supplier_auth_id: supplierAuthId,
    company_name:     profileData.company_name     ?? null,
    founded:          profileData.founded           ?? null,
    employees:        profileData.employees         ?? null,
    website:          profileData.website           ?? null,
    contact_email:    profileData.contact_email     ?? null,
    contact_phone:    profileData.contact_phone     ?? null,
    address:          profileData.address           ?? null,
    description:      profileData.description       ?? null,
    payment_terms:    profileData.payment_terms     ?? 'Net 30',
    tax_number:       profileData.tax_number        ?? null,
    bank_name:        profileData.bank_name         ?? null,
    bank_account:     profileData.bank_account      ?? null,
    swift_code:       profileData.swift_code        ?? null,
    currency:         profileData.currency          ?? 'USD',
    min_order_value:  profileData.min_order_value   ?? 0,
    categories:       profileData.categories        ?? [],
    countries:        profileData.countries         ?? [],
    profile_completion: completion,
    updated_at:       new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('supplier_profile')
    .upsert(row, { onConflict: 'supplier_auth_id' })
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] upsertSupplierProfile:', error.message)
  return { data, error }
}

// ─────────────────────────────────────────────────────────────
// LOCATIONS
// ─────────────────────────────────────────────────────────────

export async function getLocations(supplierAuthId) {
  if (!supplierAuthId) return []
  const { data, error } = await supabase
    .from('supplier_locations')
    .select('*')
    .eq('supplier_auth_id', supplierAuthId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) console.error('[supplierProfileApi] getLocations:', error.message)
  return (data || []).map(r => ({
    id:         r.id,
    label:      r.label,
    address:    r.address,
    city:       r.city,
    country:    r.country,
    type:       r.type || 'warehouse',
    is_primary: r.is_primary || false,
  }))
}

export async function addLocation(supplierAuthId, loc) {
  if (!supplierAuthId) return { error: 'No auth ID' }
  const { data, error } = await supabase
    .from('supplier_locations')
    .insert({
      supplier_auth_id: supplierAuthId,
      supplier_id:      null,
      label:            loc.label,
      address:          loc.address,
      city:             loc.city,
      country:          loc.country,
      type:             loc.type || 'warehouse',
      is_primary:       loc.is_primary || false,
    })
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] addLocation:', error.message)
  return { data, error }
}

export async function updateLocation(id, updates) {
  const { data, error } = await supabase
    .from('supplier_locations')
    .update({
      label:      updates.label,
      address:    updates.address,
      city:       updates.city,
      country:    updates.country,
      type:       updates.type,
      is_primary: updates.is_primary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] updateLocation:', error.message)
  return { data, error }
}

export async function deleteLocation(id) {
  const { error } = await supabase
    .from('supplier_locations')
    .delete()
    .eq('id', id)

  if (error) console.error('[supplierProfileApi] deleteLocation:', error.message)
  return !error
}

// ─────────────────────────────────────────────────────────────
// CERTIFICATIONS
// ─────────────────────────────────────────────────────────────

export async function getCertifications(supplierAuthId) {
  if (!supplierAuthId) return []
  const { data, error } = await supabase
    .from('supplier_certifications')
    .select('*')
    .eq('supplier_auth_id', supplierAuthId)
    .order('created_at', { ascending: false })

  if (error) console.error('[supplierProfileApi] getCertifications:', error.message)
  return (data || []).map(r => ({
    id:          r.id,
    name:        r.name,
    issued_by:   r.issuer || r.issued_by,
    cert_number: r.cert_number || r.certNumber,
    issued_date: r.issued_date || r.issuedDate,
    expiry_date: r.expiry || r.expiry_date,
    doc_url:     r.document_url || r.doc_url,
    status:      r.status || 'active',
  }))
}

export async function addCertification(supplierAuthId, cert) {
  if (!supplierAuthId) return { error: 'No auth ID' }

  // Auto-derive status from expiry date
  let status = cert.status || 'active'
  if (cert.expiry_date) {
    const expiry = new Date(cert.expiry_date)
    if (expiry < new Date()) status = 'expired'
  }

  const { data, error } = await supabase
    .from('supplier_certifications')
    .insert({
      supplier_auth_id: supplierAuthId,
      supplier_id:      null,
      name:             cert.name,
      issuer:           cert.issued_by,
      cert_number:      cert.cert_number,
      issued_date:      cert.issued_date || null,
      expiry:           cert.expiry_date || null,
      document_url:     cert.doc_url || null,
      status,
    })
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] addCertification:', error.message)
  return { data, error }
}

export async function deleteCertification(id) {
  const { error } = await supabase
    .from('supplier_certifications')
    .delete()
    .eq('id', id)

  if (error) console.error('[supplierProfileApi] deleteCertification:', error.message)
  return !error
}

// ─────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────

export async function getContacts(supplierAuthId) {
  if (!supplierAuthId) return []
  const { data, error } = await supabase
    .from('supplier_contacts')
    .select('*')
    .eq('supplier_auth_id', supplierAuthId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) console.error('[supplierProfileApi] getContacts:', error.message)
  return (data || []).map(r => ({
    id:         r.id,
    name:       r.name,
    role:       r.role || r.designation,
    email:      r.email,
    phone:      r.phone,
    whatsapp:   r.whatsapp,
    is_primary: r.is_primary || false,
  }))
}

export async function addContact(supplierAuthId, contact) {
  if (!supplierAuthId) return { error: 'No auth ID' }
  const { data, error } = await supabase
    .from('supplier_contacts')
    .insert({
      supplier_auth_id: supplierAuthId,
      supplier_id:      null,
      name:             contact.name,
      role:             contact.role,
      designation:      contact.role,   // keep both columns in sync
      email:            contact.email,
      phone:            contact.phone,
      whatsapp:         contact.whatsapp || null,
      is_primary:       contact.is_primary || false,
    })
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] addContact:', error.message)
  return { data, error }
}

export async function updateContact(id, updates) {
  const { data, error } = await supabase
    .from('supplier_contacts')
    .update({
      name:        updates.name,
      role:        updates.role,
      designation: updates.role,
      email:       updates.email,
      phone:       updates.phone,
      whatsapp:    updates.whatsapp || null,
      is_primary:  updates.is_primary,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] updateContact:', error.message)
  return { data, error }
}

export async function deleteContact(id) {
  const { error } = await supabase
    .from('supplier_contacts')
    .delete()
    .eq('id', id)

  if (error) console.error('[supplierProfileApi] deleteContact:', error.message)
  return !error
}

// ─────────────────────────────────────────────────────────────
// FINANCIALS (upsert into supplier_financials)
// ─────────────────────────────────────────────────────────────

export async function getFinancials(supplierAuthId) {
  if (!supplierAuthId) return null
  const { data, error } = await supabase
    .from('supplier_financials')
    .select('*')
    .eq('supplier_auth_id', supplierAuthId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[supplierProfileApi] getFinancials:', error.message)
    return null
  }
  if (!data) return null
  return {
    id:             data.id,
    bank_name:      data.bank_name,
    bank_account:   data.account_number,
    ifsc_code:      data.ifsc_code,
    swift_code:     data.swift_code,
    currency:       data.currency || 'USD',
    payment_terms:  data.payment_terms || 'Net 30',
    credit_limit:   data.credit_limit || 0,
    outstanding:    data.outstanding || 0,
    total_gmv:      data.total_gmv || 0,
    tax_number:     data.pan_number,
    msme_reg:       data.msme_reg,
  }
}

export async function upsertFinancials(supplierAuthId, fin) {
  if (!supplierAuthId) return { error: 'No auth ID' }
  const { data, error } = await supabase
    .from('supplier_financials')
    .upsert({
      supplier_auth_id: supplierAuthId,
      supplier_id:      null,
      bank_name:        fin.bank_name,
      account_number:   fin.bank_account,
      ifsc_code:        fin.ifsc_code,
      swift_code:       fin.swift_code,
      currency:         fin.currency,
      payment_terms:    fin.payment_terms,
      pan_number:       fin.tax_number,
      msme_reg:         fin.msme_reg,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'supplier_auth_id' })
    .select()
    .single()

  if (error) console.error('[supplierProfileApi] upsertFinancials:', error.message)
  return { data, error }
}

// ─────────────────────────────────────────────────────────────
// ADMIN NOTIFICATION TRIGGER
// ─────────────────────────────────────────────────────────────

/**
 * Inserts a row into the shared `notifications` table with
 * target_dashboard = 'admin'. The Admin Dashboard picks this up
 * instantly via its existing Supabase real-time listener on
 * the notifications table.
 *
 * @param {string} supplierAuthId - supplier's auth ID
 * @param {string} supplierName   - display name for the notification
 * @param {string} changeType     - 'company_details' | 'financials' | 'certification_added' | 'location_added' | 'contact_added'
 * @param {string} detail         - optional short description of what changed
 */
export async function notifyAdminProfileUpdate(supplierAuthId, supplierName, changeType, detail = '') {
  const typeMessages = {
    company_details:     `updated their company profile`,
    financials:          `updated financial & banking details`,
    certification_added: `added a new certification`,
    certification_removed: `removed a certification`,
    location_added:      `added a new location`,
    location_removed:    `removed a location`,
    contact_added:       `added a new contact`,
    contact_updated:     `updated contact information`,
  }

  const typeIcons = {
    company_details:     'business',
    financials:          'account_balance',
    certification_added: 'verified',
    certification_removed: 'remove_moderator',
    location_added:      'location_on',
    location_removed:    'location_off',
    contact_added:       'person_add',
    contact_updated:     'manage_accounts',
  }

  const actionMsg = typeMessages[changeType] || 'updated their profile'
  const message   = detail ? `${actionMsg}: ${detail}` : actionMsg

  const { error } = await supabase
    .from('notifications')
    .insert({
      target_dashboard: 'admin',
      type:             'supplier_profile_update',
      title:            `Profile Update: ${supplierName || 'Supplier'}`,
      message:          `${supplierName || 'A supplier'} ${message}`,
      read:             false,
      action_url:       '/suppliers',
    })

  if (error) {
    // Non-fatal — log but don't block the save
    console.warn('[supplierProfileApi] Admin notification failed:', error.message)
  }
}

// Race a promise against a timeout to prevent infinite hangs
const withTimeout = (promise, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile query timed out after 8s')), ms)
    )
  ])

// ─────────────────────────────────────────────────────────────
// FULL PROFILE LOAD (all sections in parallel)
// ─────────────────────────────────────────────────────────────

/**
 * Load all profile sections for a supplier in parallel.
 * Returns { profile, locations, certifications, contacts, financials }
 */
export async function loadFullProfile(supplierAuthId) {
  if (!supplierAuthId) {
    return { profile: null, locations: [], certifications: [], contacts: [], financials: null }
  }

  const [profileRes, locsRes, certsRes, contactsRes, finRes] = await Promise.allSettled([
    withTimeout(getSupplierProfile(supplierAuthId)),
    withTimeout(getLocations(supplierAuthId)),
    withTimeout(getCertifications(supplierAuthId)),
    withTimeout(getContacts(supplierAuthId)),
    withTimeout(getFinancials(supplierAuthId)),
  ])

  return {
    profile:        profileRes.status === 'fulfilled' ? profileRes.value : null,
    locations:      locsRes.status === 'fulfilled' ? locsRes.value : [],
    certifications: certsRes.status === 'fulfilled' ? certsRes.value : [],
    contacts:       contactsRes.status === 'fulfilled' ? contactsRes.value : [],
    financials:     finRes.status === 'fulfilled' ? finRes.value : null,
  }
}
