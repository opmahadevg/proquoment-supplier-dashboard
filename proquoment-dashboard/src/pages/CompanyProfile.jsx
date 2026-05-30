import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import {
  getSupplierAuthId,
  loadFullProfile,
  upsertSupplierProfile,
  addLocation, updateLocation, deleteLocation,
  addCertification, deleteCertification,
  addContact, updateContact, deleteContact,
  notifyAdminProfileUpdate,
} from '../lib/supplierProfileApi'

// ─────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const colors = {
    success: 'bg-[#111111] text-white',
    error:   'bg-[#ba1a1a]   text-white',
    info:    'bg-[#0f00da]   text-white',
  }
  const icons = { success: 'check_circle', error: 'error', info: 'info' }
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] ${colors[type]} text-sm px-5 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in`}>
      <span className="material-symbols-outlined text-[17px]">{icons[type] || 'check_circle'}</span>
      {message}
    </div>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`bg-[#f0f0f0] rounded-xl animate-pulse ${className}`} />
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#555555] block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder = '', type = 'text', readOnly = false, className = '' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors bg-white ${readOnly ? 'bg-[#fafafa] text-[#9e9e9e] cursor-not-allowed' : ''} ${className}`}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={onChange}
      className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white transition-colors"
    >
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  )
}

function SaveBar({ onSave, onDiscard, saving }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-[#0f00da] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors flex items-center gap-1.5 disabled:opacity-60"
      >
        {saving
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
          : <><span className="material-symbols-outlined text-[16px]">save</span>Save Changes</>
        }
      </button>
      <button
        onClick={onDiscard}
        className="border border-[#ebebeb] text-[#555555] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
      >
        Discard
      </button>
    </div>
  )
}

function TagInput({ tags, onAdd, onRemove, placeholder }) {
  const [val, setVal] = useState('')
  const add = () => {
    const v = val.trim()
    if (v && !tags.includes(v)) { onAdd(v); setVal('') }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 bg-[#e1e0ff] text-[#0f00da] text-xs px-2.5 py-1 rounded-full font-medium">
            {t}
            <button onClick={() => onRemove(t)} className="hover:text-[#ba1a1a] transition-colors">
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 border border-[#ebebeb] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f00da] transition-colors"
        />
        <button
          onClick={add}
          className="border border-[#0f00da] text-[#0f00da] px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#f0f1ff] transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-lg' : 'max-w-sm'} overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f3f3]">
          <h3 className="text-base font-semibold text-[#111111]">{title}</h3>
          <button onClick={onClose} className="text-[#9e9e9e] hover:text-[#111111] transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPLETION BAR
// ─────────────────────────────────────────────────────────────

function CompletionBar({ pct }) {
  return (
    <div className="bg-[#e1e0ff] border border-[#bfc1ff] rounded-2xl p-4 flex items-center gap-4 mb-5">
      <div className="w-10 h-10 bg-[#0f00da] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[20px] text-white">
          {pct === 100 ? 'verified' : 'business'}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-[#0f00da]">Profile Completion — {pct}%</p>
          {pct < 100
            ? <span className="text-xs text-[#555555]">Fill all sections to reach 100%</span>
            : <span className="text-xs text-[#0f00da] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span>Complete</span>
          }
        </div>
        <div className="h-2 bg-[#bfc1ff] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#0f00da] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#ebebeb] rounded-2xl p-5 mb-4">
      <h2 className="text-sm font-semibold text-[#111111] mb-4 pb-3 border-b border-[#f3f3f3] flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-[#0f00da]">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 1 — COMPANY DETAILS
// ─────────────────────────────────────────────────────────────

function CompanyDetailsTab({ profile, onSaved, showToast, supplierAuthId, supplierName, locations, certifications, contacts }) {
  const defaultForm = {
    company_name:  '',
    founded:       '',
    employees:     '',
    website:       '',
    contact_email: '',
    contact_phone: '',
    address:       '',
    description:   '',
    categories:    [],
    countries:     [],
  }

  const [form, setForm]     = useState(() => profile ? { ...defaultForm, ...profile } : defaultForm)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)
  const origRef             = useRef(form)

  useEffect(() => {
    if (profile) {
      const next = { ...defaultForm, ...profile }
      setForm(next)
      origRef.current = next
      setDirty(false)
    }
  }, [profile])

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await upsertSupplierProfile(supplierAuthId, form, locations, certifications, contacts)
    setSaving(false)
    if (error) { showToast('Failed to save company details', 'error'); return }
    origRef.current = form
    setDirty(false)
    onSaved({ ...form })
    showToast('Company details saved')
    await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'company_details', form.company_name)
  }

  const handleDiscard = () => { setForm(origRef.current); setDirty(false) }

  const employeeOptions = ['1–10','11–50','50–200','201–500','500+']
  const currencyOptions = ['USD','AED','EUR','GBP','INR','SAR','QAR']

  return (
    <div className="space-y-4">
      {/* Banner + logo */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#0f00da] to-[#2d2dff]" />
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-[#0f00da]">
                {(form.company_name || 'C')[0].toUpperCase()}
              </span>
            </div>
            <div className="pb-1.5">
              <h2 className="text-lg font-bold text-[#111111]">{form.company_name || 'Your Company'}</h2>
              <p className="text-sm text-[#9e9e9e]">{form.address || 'No address set'}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#555555] block mb-1.5">Company Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Describe your company, specializations, and value proposition…"
              className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] resize-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Core fields */}
      <Section title="Company Details" icon="business">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name">
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Your company name" />
          </Field>
          <Field label="Founded Year">
            <Input value={form.founded} onChange={e => set('founded', e.target.value)} placeholder="e.g. 2010" />
          </Field>
          <Field label="No. of Employees">
            <Select value={form.employees} onChange={e => set('employees', e.target.value)}
              options={['', ...employeeOptions].map(o => ({ value: o, label: o || 'Select range' }))} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Contact Email">
            <Input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} type="email" placeholder="sales@company.com" />
          </Field>
          <Field label="Contact Phone">
            <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+1 234 567 8900" />
          </Field>
          <div className="col-span-2">
            <Field label="Headquarters Address">
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, City, Country" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Product categories */}
      <Section title="Product Categories" icon="category">
        <p className="text-xs text-[#9e9e9e] mb-3">Add the product categories you supply. These appear on your profile visible to buyers.</p>
        <TagInput
          tags={form.categories || []}
          onAdd={v => set('categories', [...(form.categories || []), v])}
          onRemove={v => set('categories', (form.categories || []).filter(c => c !== v))}
          placeholder="e.g. Industrial Metals, Hydraulics…"
        />
      </Section>

      {/* Countries */}
      <Section title="Countries Served" icon="public">
        <p className="text-xs text-[#9e9e9e] mb-3">Countries and regions where you can supply and ship to.</p>
        <TagInput
          tags={form.countries || []}
          onAdd={v => set('countries', [...(form.countries || []), v])}
          onRemove={v => set('countries', (form.countries || []).filter(c => c !== v))}
          placeholder="e.g. UAE, Saudi Arabia, India…"
        />
      </Section>

      {dirty && <SaveBar onSave={handleSave} onDiscard={handleDiscard} saving={saving} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 2 — LOCATIONS
// ─────────────────────────────────────────────────────────────

const LOCATION_TYPES = ['warehouse','factory','office','showroom']

function LocationsTab({ locations, setLocations, supplierAuthId, supplierName, showToast }) {
  const [showAdd, setShowAdd]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving]     = useState(false)

  const emptyForm = { label: '', address: '', city: '', country: '', type: 'warehouse', is_primary: false }
  const [form, setForm] = useState(emptyForm)

  const openAdd  = () => { setForm(emptyForm); setEditItem(null); setShowAdd(true) }
  const openEdit = (loc) => { setForm({ ...loc }); setEditItem(loc); setShowAdd(true) }
  const closeModal = () => { setShowAdd(false); setEditItem(null) }

  const handleSave = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    if (editItem) {
      const { error } = await updateLocation(editItem.id, form)
      if (!error) {
        setLocations(prev => prev.map(l => l.id === editItem.id ? { ...l, ...form } : l))
        showToast('Location updated')
      } else { showToast('Failed to update location', 'error') }
    } else {
      const { data, error } = await addLocation(supplierAuthId, form)
      if (data && !error) {
        setLocations(prev => [...prev, { ...form, id: data.id }])
        showToast('Location added')
        await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'location_added', form.label)
      } else { showToast('Failed to add location', 'error') }
    }
    setSaving(false)
    closeModal()
  }

  const handleDelete = async (loc) => {
    const ok = await deleteLocation(loc.id)
    if (ok) {
      setLocations(prev => prev.filter(l => l.id !== loc.id))
      showToast('Location removed')
      await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'location_removed', loc.label)
    } else {
      showToast('Failed to remove location', 'error')
    }
  }

  const typeIcon = { warehouse: 'warehouse', factory: 'factory', office: 'apartment', showroom: 'store' }
  const typeColor = { warehouse: '#0f00da', factory: '#9b59b6', office: '#27ae60', showroom: '#e67e22' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9e9e9e]">Manage your shipping, factory, and office locations.</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#0f00da] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add_location</span>
          Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="bg-white border border-dashed border-[#d0d0d0] rounded-2xl p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#9e9e9e] block mb-2">location_off</span>
          <p className="text-sm text-[#9e9e9e]">No locations added yet</p>
          <button onClick={openAdd} className="mt-3 text-xs text-[#0f00da] hover:underline">Add your first location →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locations.map(loc => (
            <motion.div
              key={loc.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border rounded-2xl p-4 ${loc.is_primary ? 'border-[#0f00da]' : 'border-[#ebebeb]'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${typeColor[loc.type] || '#0f00da'}18` }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: typeColor[loc.type] || '#0f00da' }}>
                      {typeIcon[loc.type] || 'location_on'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#111111]">{loc.label}</p>
                      {loc.is_primary && (
                        <span className="text-[10px] bg-[#e1e0ff] text-[#0f00da] px-2 py-0.5 rounded-full font-semibold">Primary</span>
                      )}
                    </div>
                    <p className="text-xs text-[#9e9e9e] mt-0.5 capitalize">{loc.type}</p>
                    <p className="text-xs text-[#555555] mt-1">{loc.address && `${loc.address}, `}{loc.city}{loc.country && `, ${loc.country}`}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(loc)}
                    className="p-1.5 rounded-lg hover:bg-[#f5f5f5] text-[#9e9e9e] hover:text-[#111111] transition-colors">
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(loc)}
                    className="p-1.5 rounded-lg hover:bg-[#fff0f0] text-[#9e9e9e] hover:text-[#ba1a1a] transition-colors">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <Modal title={editItem ? 'Edit Location' : 'Add Location'} onClose={closeModal} wide>
            <div className="space-y-3">
              <Field label="Location Label *">
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Main Warehouse, Factory Unit A" />
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  options={LOCATION_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
              </Field>
              <Field label="Street Address">
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Plot no, Street, Area" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Dubai" />
                </Field>
                <Field label="Country">
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="UAE" />
                </Field>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  onClick={() => setForm(f => ({ ...f, is_primary: !f.is_primary }))}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.is_primary ? 'bg-[#0f00da]' : 'bg-[#d4d4d4]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_primary ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-[#555555]">Set as primary location</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editItem ? 'Update Location' : 'Add Location'}
              </button>
              <button onClick={closeModal}
                className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 3 — FINANCIALS
// ─────────────────────────────────────────────────────────────

function FinancialsTab({ profile, onSaved, showToast, supplierAuthId, supplierName, locations, certifications, contacts }) {
  const defaultForm = {
    payment_terms:  'Net 30',
    tax_number:     '',
    bank_name:      '',
    bank_account:   '',
    swift_code:     '',
    ifsc_code:      '',
    currency:       'USD',
    min_order_value: '',
    msme_reg:       '',
  }

  const [form, setForm]     = useState(() => profile ? { ...defaultForm, ...profile } : defaultForm)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)
  const origRef             = useRef(form)

  useEffect(() => {
    if (profile) {
      const next = { ...defaultForm, ...profile }
      setForm(next)
      origRef.current = next
      setDirty(false)
    }
  }, [profile])

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    // Save financials inside the main supplier_profile row (single upsert)
    const { error } = await upsertSupplierProfile(
      supplierAuthId,
      { ...profile, ...form },
      locations, certifications, contacts
    )
    setSaving(false)
    if (error) { showToast('Failed to save financial details', 'error'); return }
    origRef.current = form
    setDirty(false)
    onSaved({ ...profile, ...form })
    showToast('Financial details saved')
    await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'financials')
  }

  const handleDiscard = () => { setForm(origRef.current); setDirty(false) }

  const paymentTermsOptions = ['Net 15','Net 30','Net 45','Net 60','50% Advance + 50% On Delivery','100% Advance','Letter of Credit','Open Account']
  const currencyOptions     = ['USD','AED','EUR','GBP','INR','SAR','QAR','CNY','JPY']

  return (
    <div className="space-y-4">
      <Section title="Banking Details" icon="account_balance">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bank Name">
            <Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. Emirates NBD" />
          </Field>
          <Field label="Account Number / IBAN">
            <Input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="AE07 0331 2345…" />
          </Field>
          <Field label="SWIFT / BIC Code">
            <Input value={form.swift_code} onChange={e => set('swift_code', e.target.value)} placeholder="e.g. EBILAEAD" />
          </Field>
          <Field label="IFSC Code (if applicable)">
            <Input value={form.ifsc_code} onChange={e => set('ifsc_code', e.target.value)} placeholder="e.g. HDFC0001234" />
          </Field>
        </div>
      </Section>

      <Section title="Payment & Trade Terms" icon="payments">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Payment Terms">
            <Select value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}
              options={paymentTermsOptions.map(o => ({ value: o, label: o }))} />
          </Field>
          <Field label="Primary Currency">
            <Select value={form.currency} onChange={e => set('currency', e.target.value)}
              options={currencyOptions.map(o => ({ value: o, label: o }))} />
          </Field>
          <Field label="Minimum Order Value">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9e9e9e]">{form.currency === 'AED' ? 'AED' : '$'}</span>
              <input
                type="number"
                value={form.min_order_value || ''}
                onChange={e => set('min_order_value', e.target.value)}
                className="w-full border border-[#ebebeb] rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors"
                placeholder="5000"
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Compliance & Registration" icon="verified_user">
        <div className="grid grid-cols-2 gap-4">
          <Field label="VAT / TRN / GST Number">
            <Input value={form.tax_number} onChange={e => set('tax_number', e.target.value)} placeholder="e.g. TRN-100234567890003" />
          </Field>
          <Field label="MSME / Trade Reg. Number">
            <Input value={form.msme_reg} onChange={e => set('msme_reg', e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <p className="text-xs text-[#9e9e9e] mt-3">
          <span className="material-symbols-outlined text-[13px] align-middle mr-1">lock</span>
          Financial details are confidential and only visible to verified admins.
        </p>
      </Section>

      {dirty && <SaveBar onSave={handleSave} onDiscard={handleDiscard} saving={saving} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 4 — CERTIFICATIONS
// ─────────────────────────────────────────────────────────────

function CertificationsTab({ certifications, setCertifications, supplierAuthId, supplierName, showToast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]  = useState(false)
  const emptyForm = { name: '', issued_by: '', cert_number: '', issued_date: '', expiry_date: '', status: 'active' }
  const [form, setForm] = useState(emptyForm)

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await addCertification(supplierAuthId, form)
    setSaving(false)
    if (data && !error) {
      setCertifications(prev => [{ ...form, id: data.id }, ...prev])
      setShowAdd(false)
      setForm(emptyForm)
      showToast('Certification added')
      await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'certification_added', form.name)
    } else { showToast('Failed to add certification', 'error') }
  }

  const handleDelete = async (cert) => {
    const ok = await deleteCertification(cert.id)
    if (ok) {
      setCertifications(prev => prev.filter(c => c.id !== cert.id))
      showToast('Certification removed')
      await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'certification_removed', cert.name)
    } else { showToast('Failed to remove certification', 'error') }
  }

  const statusColor = {
    active:  { bg: 'bg-[#e1ffe8] text-[#1a7a1a]', icon: 'verified', dot: '#1a7a1a' },
    expired: { bg: 'bg-[#fff0e0] text-[#b84a00]', icon: 'warning',  dot: '#b84a00' },
    pending: { bg: 'bg-[#e1e0ff] text-[#0f00da]', icon: 'schedule', dot: '#0f00da' },
  }

  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date()
  const daysUntilExpiry = (dateStr) => {
    if (!dateStr) return null
    const diff = new Date(dateStr) - new Date()
    return Math.ceil(diff / 86400000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9e9e9e]">Add quality certifications, compliance certificates, and accreditations.</p>
        <button
          onClick={() => { setForm(emptyForm); setShowAdd(true) }}
          className="flex items-center gap-1.5 bg-[#0f00da] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Certification
        </button>
      </div>

      {certifications.length === 0 ? (
        <div className="bg-white border border-dashed border-[#d0d0d0] rounded-2xl p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#9e9e9e] block mb-2">workspace_premium</span>
          <p className="text-sm text-[#9e9e9e]">No certifications added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map(cert => {
            const days = daysUntilExpiry(cert.expiry_date)
            const expired = isExpired(cert.expiry_date)
            const status = expired ? 'expired' : (days !== null && days < 60 ? 'pending' : cert.status || 'active')
            const sc = statusColor[status] || statusColor.active
            return (
              <motion.div key={cert.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#ebebeb] rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f0f1ff] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-[#0f00da] icon-fill">{sc.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">{cert.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {cert.issued_by && <span className="text-xs text-[#9e9e9e]">By {cert.issued_by}</span>}
                      {cert.cert_number && <span className="text-xs text-[#9e9e9e] font-mono">#{cert.cert_number}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.bg}`}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: sc.dot }} />
                        {status}
                      </span>
                      {cert.expiry_date && (
                        <span className="text-xs text-[#9e9e9e]">
                          {expired ? 'Expired' : 'Expires'}: {new Date(cert.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {!expired && days !== null && days < 90 && <span className="text-[#b84a00] ml-1">({days}d left)</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(cert)}
                  className="p-1.5 rounded-lg hover:bg-[#fff0f0] text-[#9e9e9e] hover:text-[#ba1a1a] transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <Modal title="Add Certification" onClose={() => setShowAdd(false)} wide>
            <div className="space-y-3">
              <Field label="Certification Name *">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ISO 9001:2015, API 6A" />
              </Field>
              <Field label="Issuing Authority">
                <Input value={form.issued_by} onChange={e => setForm(f => ({ ...f, issued_by: e.target.value }))} placeholder="e.g. Bureau Veritas, TÜV SÜD" />
              </Field>
              <Field label="Certificate Number">
                <Input value={form.cert_number} onChange={e => setForm(f => ({ ...f, cert_number: e.target.value }))} placeholder="e.g. BV-QMS-2024-001" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Issue Date">
                  <Input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
                </Field>
                <Field label="Expiry Date">
                  <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </Field>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Add Certification'}
              </button>
              <button onClick={() => setShowAdd(false)}
                className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 5 — CONTACTS
// ─────────────────────────────────────────────────────────────

function ContactsTab({ contacts, setContacts, supplierAuthId, supplierName, showToast }) {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const emptyForm = { name: '', role: '', email: '', phone: '', whatsapp: '', is_primary: false }
  const [form, setForm] = useState(emptyForm)

  const openAdd  = () => { setForm(emptyForm); setEditItem(null); setShowModal(true) }
  const openEdit = (c) => { setForm({ ...c }); setEditItem(c); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editItem) {
      const { error } = await updateContact(editItem.id, form)
      if (!error) {
        setContacts(prev => prev.map(c => c.id === editItem.id ? { ...c, ...form } : c))
        showToast('Contact updated')
        await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'contact_updated', form.name)
      } else { showToast('Failed to update contact', 'error') }
    } else {
      const { data, error } = await addContact(supplierAuthId, form)
      if (data && !error) {
        setContacts(prev => [...prev, { ...form, id: data.id }])
        showToast('Contact added')
        await notifyAdminProfileUpdate(supplierAuthId, supplierName, 'contact_added', form.name)
      } else { showToast('Failed to add contact', 'error') }
    }
    setSaving(false)
    closeModal()
  }

  const handleDelete = async (contact) => {
    const ok = await deleteContact(contact.id)
    if (ok) {
      setContacts(prev => prev.filter(c => c.id !== contact.id))
      showToast('Contact removed')
    } else { showToast('Failed to remove contact', 'error') }
  }

  const getInitials = (name) => (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const ROLE_PRESETS = ['Owner','CEO','Sales Manager','Export Manager','Operations Head','Finance Manager','Quality Manager','Procurement Manager']

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9e9e9e]">Add key business contacts visible to buyers and admins.</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#0f00da] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white border border-dashed border-[#d0d0d0] rounded-2xl p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#9e9e9e] block mb-2">contacts</span>
          <p className="text-sm text-[#9e9e9e]">No contacts added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map(contact => (
            <motion.div key={contact.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white border rounded-2xl p-4 ${contact.is_primary ? 'border-[#0f00da]' : 'border-[#ebebeb]'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0f00da] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                    {getInitials(contact.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#111111]">{contact.name}</p>
                      {contact.is_primary && (
                        <span className="text-[10px] bg-[#e1e0ff] text-[#0f00da] px-2 py-0.5 rounded-full font-semibold">Primary</span>
                      )}
                    </div>
                    {contact.role && <p className="text-xs text-[#9e9e9e] mt-0.5">{contact.role}</p>}
                    <div className="mt-2 space-y-1">
                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-xs text-[#555555]">
                          <span className="material-symbols-outlined text-[13px] text-[#9e9e9e]">mail</span>
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[#555555]">
                          <span className="material-symbols-outlined text-[13px] text-[#9e9e9e]">call</span>
                          {contact.phone}
                        </div>
                      )}
                      {contact.whatsapp && (
                        <div className="flex items-center gap-1.5 text-xs text-[#555555]">
                          <span className="material-symbols-outlined text-[13px] text-[#27ae60]">chat</span>
                          {contact.whatsapp}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(contact)}
                    className="p-1.5 rounded-lg hover:bg-[#f5f5f5] text-[#9e9e9e] hover:text-[#111111] transition-colors">
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(contact)}
                    className="p-1.5 rounded-lg hover:bg-[#fff0f0] text-[#9e9e9e] hover:text-[#ba1a1a] transition-colors">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal title={editItem ? 'Edit Contact' : 'Add Contact'} onClose={closeModal} wide>
            <div className="space-y-3">
              <Field label="Full Name *">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ahmad Hassan" />
              </Field>
              <Field label="Role / Designation">
                <div className="space-y-2">
                  <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Sales Manager" />
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_PRESETS.map(r => (
                      <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${form.role === r ? 'bg-[#0f00da] text-white border-[#0f00da]' : 'border-[#ebebeb] text-[#555555] hover:bg-[#f5f5f5]'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@company.com" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+971 50 123 4567" />
                </Field>
                <Field label="WhatsApp">
                  <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="Same as phone" />
                </Field>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  onClick={() => setForm(f => ({ ...f, is_primary: !f.is_primary }))}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.is_primary ? 'bg-[#0f00da]' : 'bg-[#d4d4d4]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_primary ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-[#555555]">Set as primary contact</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editItem ? 'Update Contact' : 'Add Contact'}
              </button>
              <button onClick={closeModal}
                className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'company',        label: 'Company Details', icon: 'business'         },
  { key: 'locations',      label: 'Locations',       icon: 'location_on'      },
  { key: 'financials',     label: 'Financials',      icon: 'account_balance'  },
  { key: 'certifications', label: 'Certifications',  icon: 'verified'         },
  { key: 'contacts',       label: 'Contacts',        icon: 'contacts'         },
]

export default function ProfileSettings() {
  const { user } = useAuth()
  const supplierAuthId = getSupplierAuthId(user)
  const supplierName   = user?.company || user?.name || 'Supplier'

  const [activeTab,     setActiveTab]     = useState('company')
  const [profile,       setProfile]       = useState(null)
  const [locations,     setLocations]     = useState([])
  const [certifications,setCertifications]= useState([])
  const [contacts,      setContacts]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  // Load all profile data on mount
  useEffect(() => {
    if (!supplierAuthId) { setLoading(false); return }

    loadFullProfile(supplierAuthId)
      .then(({ profile: p, locations: l, certifications: c, contacts: co }) => {
        setProfile(p)
        setLocations(l)
        setCertifications(c)
        setContacts(co)
        setLoading(false)
      })
      .catch(err => {
        console.error('CompanyProfile: failed to load full profile:', err)
        setLoading(false)
      })
  }, [supplierAuthId])

  // Derive completion from current data
  const completionChecks = [
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
  const completionPct = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100)

  // Skeleton loading state
  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <div className="mb-5">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-16 w-full mb-5 rounded-2xl" />
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => <Skeleton key={t.key} className="h-9 w-28 flex-shrink-0 rounded-full" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#111111]">Company Profile</h1>
        <p className="text-sm text-[#9e9e9e] mt-0.5">
          Manage your company information · Changes sync to admin dashboard in real-time
        </p>
      </div>

      {/* Completion bar */}
      <CompletionBar pct={completionPct} />

      {/* Tab navigation */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${activeTab === tab.key
                ? 'bg-[#0f00da] text-white shadow-sm'
                : 'text-[#555555] hover:bg-[#f5f5f5] hover:text-[#111111]'
              }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${activeTab === tab.key ? 'icon-fill' : ''}`}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {activeTab === 'company' && (
            <CompanyDetailsTab
              profile={profile}
              onSaved={setProfile}
              showToast={showToast}
              supplierAuthId={supplierAuthId}
              supplierName={supplierName}
              locations={locations}
              certifications={certifications}
              contacts={contacts}
            />
          )}
          {activeTab === 'locations' && (
            <LocationsTab
              locations={locations}
              setLocations={setLocations}
              supplierAuthId={supplierAuthId}
              supplierName={supplierName}
              showToast={showToast}
            />
          )}
          {activeTab === 'financials' && (
            <FinancialsTab
              profile={profile}
              onSaved={setProfile}
              showToast={showToast}
              supplierAuthId={supplierAuthId}
              supplierName={supplierName}
              locations={locations}
              certifications={certifications}
              contacts={contacts}
            />
          )}
          {activeTab === 'certifications' && (
            <CertificationsTab
              certifications={certifications}
              setCertifications={setCertifications}
              supplierAuthId={supplierAuthId}
              supplierName={supplierName}
              showToast={showToast}
            />
          )}
          {activeTab === 'contacts' && (
            <ContactsTab
              contacts={contacts}
              setContacts={setContacts}
              supplierAuthId={supplierAuthId}
              supplierName={supplierName}
              showToast={showToast}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
