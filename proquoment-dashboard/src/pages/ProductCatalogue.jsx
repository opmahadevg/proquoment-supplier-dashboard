import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../lib/procurementApi'
import { useAuth } from '../context/AuthContext'

const initialProducts = [
  { id: 1, name: 'Steel Pipes Grade A', category: 'Industrial Metals', sku: 'SP-GRA-001', price: '$32/meter', moq: '50 meters', stock: 'In Stock', lead: '14 days', description: 'High-grade steel pipes for industrial and construction use.', image: null },
  { id: 2, name: 'Gate Valves DN50–DN200', category: 'Valves & Fittings', sku: 'GV-DN-002', price: '$85–$340/unit', moq: '10 units', stock: 'In Stock', lead: '21 days', description: 'Cast iron gate valves for pipeline systems.', image: null },
  { id: 3, name: 'Hydraulic Fittings Set', category: 'Hydraulics', sku: 'HF-SET-003', price: '$12/unit', moq: '100 units', stock: 'In Stock', lead: '7 days', description: 'Assorted hydraulic fittings up to 350 bar pressure rating.', image: null },
  { id: 4, name: 'Stainless Steel Flanges 316L', category: 'Industrial Metals', sku: 'SSF-316-004', price: '$45/unit', moq: '20 units', stock: 'Low Stock', lead: '28 days', description: 'Weld neck flanges SS316L for offshore applications.', image: null },
  { id: 5, name: 'Butterfly Valves PN10', category: 'Valves & Fittings', sku: 'BV-PN10-005', price: '$120/unit', moq: '5 units', stock: 'In Stock', lead: '14 days', description: 'Wafer-type butterfly valves for water treatment plants.', image: null },
  { id: 6, name: 'HDPE Pipes SDR11', category: 'Plastic Pipes', sku: 'HP-SDR11-006', price: '$18/meter', moq: '100 meters', stock: 'In Stock', lead: '10 days', description: 'High density polyethylene pipes for underground applications.', image: null },
]

const BASE_CATEGORIES = [
  'Industrial Metals',
  'Valves & Fittings',
  'Hydraulics',
  'Plastic Pipes',
  'Electrical & Electronics',
  'Pumps & Motors',
  'Safety & PPE',
  'Fasteners & Hardware',
  'Construction Materials',
  'Chemicals & Lubricants',
  'Bearings & Power Transmission',
  'Tools & Equipment',
  'Instrumentation & Control',
  'Rubber & Seals',
  'Hoses & Tubing',
  'Filtration',
  'HVAC & Ventilation',
  'Oil & Gas Equipment',
  'Packaging Materials',
  'Welding & Cutting',
]

// HSN code suggestions by category
const HSN_SUGGESTIONS = {
  'Industrial Metals':            [{ code: '7304', desc: 'Steel Pipes & Tubes' }, { code: '7307', desc: 'Pipe Fittings (Steel)' }, { code: '7208', desc: 'Flat-rolled Steel Products' }, { code: '7318', desc: 'Screws, Bolts, Nuts (Steel)' }],
  'Valves & Fittings':            [{ code: '8481', desc: 'Taps, Cocks, Valves' }, { code: '7307', desc: 'Pipe Fittings' }, { code: '8484', desc: 'Gaskets & Sealing Devices' }],
  'Hydraulics':                   [{ code: '8412', desc: 'Hydraulic Engines & Motors' }, { code: '8413', desc: 'Pumps for Liquids' }, { code: '8483', desc: 'Hydraulic Cylinders' }],
  'Plastic Pipes':                [{ code: '3917', desc: 'Plastic Pipes & Fittings' }, { code: '3926', desc: 'Other Plastic Articles' }],
  'Electrical & Electronics':     [{ code: '8544', desc: 'Insulated Wire & Cable' }, { code: '8536', desc: 'Electrical Apparatus ≤1000V' }, { code: '8537', desc: 'Boards, Panels, Switchgear' }],
  'Pumps & Motors':               [{ code: '8413', desc: 'Pumps for Liquids' }, { code: '8501', desc: 'Electric Motors & Generators' }, { code: '8414', desc: 'Air/Vacuum Pumps' }],
  'Safety & PPE':                 [{ code: '6211', desc: 'Protective Clothing' }, { code: '9020', desc: 'Breathing Apparatus' }, { code: '6217', desc: 'Safety Helmets & Accessories' }],
  'Fasteners & Hardware':         [{ code: '7318', desc: 'Screws, Bolts, Nuts' }, { code: '7320', desc: 'Springs' }, { code: '8302', desc: 'Hardware, Brackets, Locks' }],
  'Construction Materials':       [{ code: '6810', desc: 'Cement & Concrete Products' }, { code: '7214', desc: 'Bars & Rods (Iron/Steel)' }, { code: '3824', desc: 'Chemical Products & Preparations' }],
  'Chemicals & Lubricants':       [{ code: '2710', desc: 'Petroleum Oils & Lubricants' }, { code: '3403', desc: 'Lubricating Preparations' }, { code: '2815', desc: 'Industrial Chemicals' }],
  'Bearings & Power Transmission':[{ code: '8482', desc: 'Ball & Roller Bearings' }, { code: '8483', desc: 'Transmission Shafts & Gears' }, { code: '4010', desc: 'Conveyor / Drive Belts' }],
  'Tools & Equipment':            [{ code: '8205', desc: 'Hand Tools' }, { code: '8467', desc: 'Power Tools' }, { code: '8466', desc: 'Parts for Machine Tools' }],
  'Instrumentation & Control':    [{ code: '9026', desc: 'Flow / Level Measuring' }, { code: '9032', desc: 'Automatic Regulating Instruments' }, { code: '9031', desc: 'Measuring & Checking Instruments' }],
  'Rubber & Seals':               [{ code: '4016', desc: 'Rubber Articles (O-rings, Seals)' }, { code: '4009', desc: 'Rubber Pipes & Hoses' }, { code: '8484', desc: 'Gaskets' }],
  'Hoses & Tubing':               [{ code: '3917', desc: 'Plastic Tubes & Hoses' }, { code: '4009', desc: 'Rubber Hoses' }, { code: '7304', desc: 'Metal Tubes' }],
  'Filtration':                   [{ code: '8421', desc: 'Centrifuges & Filters' }, { code: '8422', desc: 'Filtration Machinery' }, { code: '8708', desc: 'Filter Elements' }],
  'HVAC & Ventilation':           [{ code: '8415', desc: 'Air Conditioning Machines' }, { code: '8414', desc: 'Fans & Blowers' }, { code: '8419', desc: 'Heat Exchange Equipment' }],
  'Oil & Gas Equipment':          [{ code: '8430', desc: 'Drilling Machinery' }, { code: '8481', desc: 'Valves for Pipelines' }, { code: '7304', desc: 'Seamless Steel Tubes (Oil Country)' }],
  'Packaging Materials':          [{ code: '3923', desc: 'Plastic Packaging Articles' }, { code: '4819', desc: 'Cartons & Boxes' }, { code: '6305', desc: 'Sacks & Bags' }],
  'Welding & Cutting':            [{ code: '8468', desc: 'Welding/Soldering Machines' }, { code: '8515', desc: 'Electric Welding Apparatus' }, { code: '3810', desc: 'Fluxes & Welding Compounds' }],
}

const EMPTY_FORM = { name: '', category: '', sku: '', hsn: '', price: '', moq: '', lead: '', description: '', stock: 'In Stock', image: null, imagePreview: null }

const STOCK_OPTIONS = ['In Stock', 'Low Stock', 'Out of Stock']

function generateSKU(name, category) {
  const namePart = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3)
  const catPart = category.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2)
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${namePart}-${catPart}-${num}`
}

function Toast({ message, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-[#1a1c1c] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 min-w-[280px]">
        <div className="w-7 h-7 bg-[#0f00da] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[16px] text-white">check</span>
        </div>
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  )
}

function DeleteConfirm({ product, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">delete</span>
          </div>
          <h2 className="text-base font-semibold text-[#111111]">Delete Product</h2>
        </div>
        <p className="text-sm text-[#555555] mb-5">
          Are you sure you want to delete <span className="font-semibold text-[#111111]">"{product.name}"</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 bg-[#ba1a1a] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#93000a] transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductModal({ mode, form, setForm, onSubmit, onClose, categories, submitting, errors }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setForm(f => ({ ...f, image: file, imagePreview: e.target.result }))
    }
    reader.readAsDataURL(file)
  }, [setForm])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleNameChange = (val) => {
    setForm(f => {
      const newForm = { ...f, name: val }
      if (!f.skuManuallyEdited && val && f.category) {
        newForm.sku = generateSKU(val, f.category)
      }
      return newForm
    })
  }

  const handleCategoryChange = (val) => {
    setForm(f => {
      const newForm = { ...f, category: val }
      if (!f.skuManuallyEdited && f.name && val) {
        newForm.sku = generateSKU(f.name, val)
      }
      return newForm
    })
  }

  const isEdit = mode === 'edit'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#111111]">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-[#9e9e9e] mt-0.5">{isEdit ? 'Update your product details' : 'Fill in the details to list your product'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Image Upload */}
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">Product Image</label>
              {form.imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-[#ebebeb] group">
                  <img src={form.imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-[#111111] text-xs px-3 py-1.5 rounded-full font-medium hover:bg-[#f5f5f5] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image: null, imagePreview: null }))}
                      className="bg-white text-[#ba1a1a] text-xs px-3 py-1.5 rounded-full font-medium hover:bg-[#ffdad6] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragOver ? 'border-[#0f00da] bg-[#e1e0ff]' : 'border-[#c6c4da] hover:border-[#0f00da] hover:bg-white'}`}
                >
                  <span className="material-symbols-outlined text-[36px] text-[#c6c4da] block mb-1">add_photo_alternate</span>
                  <p className="text-sm font-medium text-[#555555]">Click or drag & drop to upload</p>
                  <p className="text-xs text-[#9e9e9e] mt-0.5">PNG, JPG, WebP — max 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Product Name */}
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">
                Product Name <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Steel Pipes Grade A"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${errors.name ? 'border-[#ba1a1a] bg-[#fff4f4]' : 'border-[#ebebeb] focus:border-[#0f00da]'}`}
              />
              {errors.name && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.name}</p>}
            </div>

            {/* Category + Stock row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#555555] block mb-1.5">
                  Category <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors bg-white ${errors.category ? 'border-[#ba1a1a] bg-[#fff4f4]' : 'border-[#ebebeb] focus:border-[#0f00da]'}`}
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.category}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-[#555555] block mb-1.5">Stock Status</label>
                <div className="flex gap-1">
                  {STOCK_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, stock: opt }))}
                      className={`flex-1 py-2 text-[10px] font-medium rounded-lg border transition-all ${form.stock === opt
                        ? opt === 'In Stock' ? 'bg-[#e1e0ff] border-[#0f00da] text-[#0f00da]'
                          : opt === 'Low Stock' ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]'
                          : 'bg-[#e8e8e8] border-[#767589] text-[#9e9e9e]'
                        : 'bg-white border-[#ebebeb] text-[#9e9e9e] hover:bg-[#f7f7f7]'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SKU + HSN row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#555555] flex items-center justify-between mb-1.5">
                  <span>SKU / Product Code</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (form.name && form.category) {
                        setForm(f => ({ ...f, sku: generateSKU(f.name, f.category), skuManuallyEdited: false }))
                      }
                    }}
                    className="text-[#0f00da] hover:underline font-normal text-[10px] flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[12px]">autorenew</span>
                    Auto-generate
                  </button>
                </label>
                <input
                  value={form.sku}
                  onChange={e => setForm(f => ({ ...f, sku: e.target.value, skuManuallyEdited: true }))}
                  placeholder="e.g. SP-GRA-001"
                  className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#555555] flex items-center justify-between mb-1.5">
                  <span>HSN Code</span>
                  <a
                    href="https://www.cbic.gov.in/resources//htdocs-cbec/gst/hsn-sac.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0f00da] hover:underline font-normal text-[10px] flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                    HSN lookup
                  </a>
                </label>
                <input
                  value={form.hsn}
                  onChange={e => setForm(f => ({ ...f, hsn: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="e.g. 7304"
                  maxLength={8}
                  className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] font-mono"
                />
                {/* Smart suggestions based on category */}
                {form.category && HSN_SUGGESTIONS[form.category] && !form.hsn && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {HSN_SUGGESTIONS[form.category].slice(0, 3).map(s => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, hsn: s.code }))}
                        title={s.desc}
                        className="text-[10px] bg-[#e1e0ff] text-[#0f00da] px-2 py-0.5 rounded-full hover:bg-[#bfc1ff] transition-colors font-mono"
                      >
                        {s.code}
                      </button>
                    ))}
                    <span className="text-[10px] text-[#9e9e9e] self-center">suggested</span>
                  </div>
                )}
                {form.hsn && form.category && HSN_SUGGESTIONS[form.category] && (
                  <p className="text-[10px] text-[#9e9e9e] mt-1">
                    {HSN_SUGGESTIONS[form.category].find(s => s.code === form.hsn)?.desc || ''}
                  </p>
                )}
              </div>
            </div>

            {/* Price + MOQ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#555555] block mb-1.5">
                  Unit Price <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-colors ${errors.price ? 'border-[#ba1a1a]' : 'border-[#ebebeb] focus-within:border-[#0f00da]'}`}>
                  <span className="px-3 h-10 flex items-center text-xs text-[#9e9e9e] bg-[#f7f7f7] border-r border-[#ebebeb] flex-shrink-0">$</span>
                  <input
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="e.g. 32/meter"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                  />
                </div>
                {errors.price && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.price}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-[#555555] block mb-1.5">
                  Min. Order Qty <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  value={form.moq}
                  onChange={e => setForm(f => ({ ...f, moq: e.target.value }))}
                  placeholder="e.g. 50 meters"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${errors.moq ? 'border-[#ba1a1a] bg-[#fff4f4]' : 'border-[#ebebeb] focus:border-[#0f00da]'}`}
                />
                {errors.moq && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.moq}</p>}
              </div>
            </div>

            {/* Lead Time */}
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">Lead Time</label>
              <div className="flex gap-2">
                {['7 days', '14 days', '21 days', '28 days', '45 days'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, lead: opt }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.lead === opt ? 'bg-[#0f00da] text-white border-[#0f00da]' : 'bg-white border-[#ebebeb] text-[#555555] hover:border-[#0f00da] hover:text-[#0f00da]'}`}
                  >
                    {opt}
                  </button>
                ))}
                <input
                  value={['7 days', '14 days', '21 days', '28 days', '45 days'].includes(form.lead) ? '' : form.lead}
                  onChange={e => setForm(f => ({ ...f, lead: e.target.value }))}
                  placeholder="Custom"
                  className="flex-1 min-w-0 border border-[#ebebeb] rounded-full px-3 py-1.5 text-xs outline-none focus:border-[#0f00da] text-center"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-[#555555] flex items-center justify-between mb-1.5">
                <span>Description</span>
                <span className="text-[#9e9e9e] font-normal">{form.description.length}/500</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => e.target.value.length <= 500 && setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe your product — specifications, grades, standards, applications..."
                className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {isEdit ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductCatalogue() {
  const { isDemo, user } = useAuth()
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [productList, setProductList] = useState(initialProducts)
  const [categories, setCategories] = useState(BASE_CATEGORIES)

  useEffect(() => {
    fetchProducts(user?.id, isDemo).then(data => {
      if (data && data.length > 0) {
        setProductList(data)
      } else {
        setProductList(initialProducts)
      }
    })
  }, [user?.id, isDemo])

  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const openAddModal = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setModalMode('add')
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setForm({ ...product, imagePreview: product.image || null, skuManuallyEdited: true })
    setErrors({})
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    else if (form.name.trim().length < 3) e.name = 'Name must be at least 3 characters'
    if (!form.category) e.category = 'Please select a category'
    if (!form.price.trim()) e.price = 'Price is required'
    if (!form.moq.trim()) e.moq = 'Minimum order quantity is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSubmitting(true)

    if (form.category && !categories.includes(form.category)) {
      setCategories(prev => [...prev, form.category])
    }

    const payload = { ...form, sku: form.sku || generateSKU(form.name, form.category) }

    try {
      if (modalMode === 'edit') {
        const data = await updateProduct(editingProduct.id, payload, user?.id)
        if (data) {
          setProductList(prev => prev.map(p => p.id === editingProduct.id ? data : p))
        } else {
          setProductList(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p))
        }
        showToast(`"${form.name}" updated successfully`)
      } else {
        const data = await createProduct(payload, user?.id, isDemo)
        if (data) {
          setProductList(prev => [...prev, data])
        } else {
          setProductList(prev => [...prev, { ...payload, id: Date.now(), image: form.imagePreview || null }])
        }
        showToast(`"${form.name}" added to your catalogue`)
      }
    } catch (err) {
      console.error('Error submitting product:', err)
      showToast('Error saving product')
    } finally {
      setSubmitting(false)
      closeModal()
    }
  }

  const handleDelete = async () => {
    const name = deleteTarget.name
    const id = deleteTarget.id
    setProductList(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
    showToast(`"${name}" removed from catalogue`)
    try {
      await deleteProduct(id, user?.id)
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  const filtered = productList.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.category.toLowerCase().includes(search.toLowerCase()) ||
     (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  )

  const allCategories = ['All', ...categories]

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">My Products</h1>
          <p className="text-sm text-[#9e9e9e] mt-0.5">
            {productList.length} product{productList.length !== 1 ? 's' : ''} in your catalogue
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#0f00da] text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Product
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#ebebeb] rounded-full px-3 py-2 flex-1 max-w-xs">
          <span className="material-symbols-outlined text-[18px] text-[#9e9e9e]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, category, SKU..."
            className="bg-transparent text-sm outline-none flex-1 text-[#111111] placeholder-[#767589]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#9e9e9e] hover:text-[#111111]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-[#0f00da] text-white' : 'bg-[#f5f5f5] text-[#555555] hover:bg-[#ebebeb]'}`}
            >
              {cat}
              {cat !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({productList.filter(p => p.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[28px] text-[#9e9e9e]">search_off</span>
          </div>
          <p className="text-sm font-medium text-[#111111]">No products found</p>
          <p className="text-xs text-[#9e9e9e] mt-1">Try a different search term or category</p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-xs text-[#0f00da] hover:underline">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div
              key={product.id}
              className="bg-white border border-[#ebebeb] rounded-2xl overflow-hidden hover:border-[#c6c4da] hover:shadow-sm transition-all group"
            >
              {/* Image */}
              <div className="h-36 bg-[#f7f7f7] flex items-center justify-center border-b border-[#ebebeb] relative overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[48px] text-[#c6c4da]">inventory_2</span>
                )}
                {/* Hover actions overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openEditModal(product)}
                    className="bg-white text-[#111111] text-xs px-3 py-1.5 rounded-full font-medium hover:bg-[#f5f5f5] flex items-center gap-1 shadow"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(product)}
                    className="bg-white text-[#ba1a1a] text-xs px-3 py-1.5 rounded-full font-medium hover:bg-[#ffdad6] flex items-center gap-1 shadow"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111111] leading-snug truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-[#9e9e9e] font-mono">{product.sku || '—'}</p>
                      {product.hsn && (
                        <span className="text-[10px] bg-[#f7f7f7] border border-[#ebebeb] text-[#555555] px-1.5 py-0.5 rounded font-mono">HSN {product.hsn}</span>
                      )}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                    product.stock === 'In Stock' ? 'bg-[#e1e0ff] text-[#0f00da]'
                    : product.stock === 'Low Stock' ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-[#e8e8e8] text-[#9e9e9e]'
                  }`}>
                    {product.stock}
                  </span>
                </div>

                <span className="inline-block bg-[#f5f5f5] text-[#555555] text-xs px-2 py-0.5 rounded-full mb-3">
                  {product.category}
                </span>

                {product.description && (
                  <p className="text-xs text-[#9e9e9e] mb-3 line-clamp-2">{product.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div>
                    <p className="text-[10px] font-medium text-[#9e9e9e] uppercase tracking-wide">Price</p>
                    <p className="text-[#111111] font-semibold mt-0.5">
                      {product.price.startsWith('$') ? product.price : `$${product.price}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#9e9e9e] uppercase tracking-wide">MOQ</p>
                    <p className="text-[#111111] font-semibold mt-0.5">{product.moq}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#9e9e9e] uppercase tracking-wide">Lead</p>
                    <p className="text-[#111111] font-semibold mt-0.5">{product.lead || '—'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 border border-[#ebebeb] text-[#555555] py-1.5 rounded-full text-xs font-medium hover:border-[#0f00da] hover:text-[#0f00da] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(product)}
                    className="flex-1 border border-[#ebebeb] text-[#555555] py-1.5 rounded-full text-xs font-medium hover:border-[#ba1a1a] hover:text-[#ba1a1a] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Product Card */}
          <button
            onClick={openAddModal}
            className="bg-white border-2 border-dashed border-[#c6c4da] rounded-2xl min-h-[300px] flex flex-col items-center justify-center gap-3 hover:border-[#0f00da] hover:bg-[#f7f7f7] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-[#e1e0ff] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-[#0f00da]">add</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#555555]">Add New Product</p>
              <p className="text-xs text-[#9e9e9e] mt-0.5">List a product to get RFQ matches</p>
            </div>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <ProductModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
          categories={categories}
          submitting={submitting}
          errors={errors}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteConfirm
          product={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
