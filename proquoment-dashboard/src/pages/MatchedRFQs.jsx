import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings, formatAmount } from '../context/SettingsContext'
import { useDashboard } from '../context/DashboardContext'
import { useAuth } from '../context/AuthContext'
import { submitQuotation, submitSampleQuote, fetchSampleRFQsForSupplier } from '../lib/procurementApi'
import { submitBid } from '../lib/supplierApi'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'


const INITIAL_RFQS = [
  {
    id: 'RFQ-2024-001',
    title: 'Steel Pipes — Grade A',
    buyer: 'Sunrise Manufacturing LLC',
    buyerLogo: 'SM',
    category: 'Industrial Metals',
    quantity: '500 units',
    deadline: 'Dec 15, 2024',
    deadlineTs: 20241215,
    budget: '$12,000 – $18,000',
    budgetMin: 12000,
    match: 96,
    status: 'new',
    description: 'High-grade steel pipes required for pipeline infrastructure project. Must meet ASTM A106 Grade A standards. Delivery within 30 days from order confirmation.',
    specs: ['Diameter: 4", 6", 8"', 'Length: 6m per piece', 'Standard: ASTM A106 Grade A', 'Finish: Black painted'],
    location: 'Dubai, UAE',
    postedTime: '2 hours ago',
    savedBy: 0,
    bidsReceived: 4,
    buyerVerified: true,
  },
  {
    id: 'RFQ-2024-002',
    title: 'Industrial Valves DN50',
    buyer: 'Gulf Construction Co.',
    buyerLogo: 'GC',
    category: 'Valves & Fittings',
    quantity: '200 units',
    deadline: 'Dec 20, 2024',
    deadlineTs: 20241220,
    budget: '$8,000 – $14,000',
    budgetMin: 8000,
    match: 88,
    status: 'reviewed',
    description: 'Gate valves DN50 PN16 required for water treatment plant expansion. Must be EN1171 certified.',
    specs: ['Size: DN50 (2")', 'Pressure: PN16', 'Material: Cast Iron', 'Standard: EN 1171'],
    location: 'Abu Dhabi, UAE',
    postedTime: '5 hours ago',
    savedBy: 2,
    bidsReceived: 7,
    buyerVerified: true,
  },
  {
    id: 'RFQ-2024-003',
    title: 'Hydraulic Fittings Assortment',
    buyer: 'Al Futtaim Industries',
    buyerLogo: 'AF',
    category: 'Hydraulics',
    quantity: '1,000 units',
    deadline: 'Jan 5, 2025',
    deadlineTs: 20250105,
    budget: '$5,000 – $9,000',
    budgetMin: 5000,
    match: 82,
    status: 'bid_placed',
    description: 'Various hydraulic fittings including elbows, tees, and reducers for maintenance stock.',
    specs: ['Pressure: up to 350 bar', 'Material: Carbon Steel', 'Thread: BSP'],
    location: 'Sharjah, UAE',
    postedTime: '1 day ago',
    savedBy: 5,
    bidsReceived: 12,
    buyerVerified: false,
  },
  {
    id: 'RFQ-2024-004',
    title: 'Stainless Steel Flanges',
    buyer: 'Emirates Steel Corp',
    buyerLogo: 'ES',
    category: 'Industrial Metals',
    quantity: '300 units',
    deadline: 'Jan 10, 2025',
    deadlineTs: 20250110,
    budget: '$15,000 – $22,000',
    budgetMin: 15000,
    match: 75,
    status: 'new',
    description: 'Weld neck flanges SS316L for offshore application. Must be ASME certified and include mill test reports.',
    specs: ['Material: SS316L', 'Standard: ASME B16.5', 'Class: 150, 300, 600'],
    location: 'Dubai, UAE',
    postedTime: '2 days ago',
    savedBy: 3,
    bidsReceived: 2,
    buyerVerified: true,
  },
  {
    id: 'RFQ-2024-005',
    title: 'HDPE Pipes for Water Supply',
    buyer: 'Qatar Water Authority',
    buyerLogo: 'QW',
    category: 'Plastic Pipes',
    quantity: '2,000 meters',
    deadline: 'Jan 20, 2025',
    deadlineTs: 20250120,
    budget: '$20,000 – $30,000',
    budgetMin: 20000,
    match: 71,
    status: 'new',
    description: 'HDPE SDR11 pipes for municipal water supply network. Must comply with ISO 4427.',
    specs: ['Grade: PE100', 'Standard: ISO 4427', 'SDR: 11', 'Colour: Blue or Black'],
    location: 'Doha, Qatar',
    postedTime: '3 days ago',
    savedBy: 8,
    bidsReceived: 9,
    buyerVerified: true,
  },
  {
    id: 'RFQ-2024-006',
    title: 'Safety Helmets & PPE Kit',
    buyer: 'Arabtec Construction',
    buyerLogo: 'AC',
    category: 'Safety & PPE',
    quantity: '500 kits',
    deadline: 'Dec 30, 2024',
    deadlineTs: 20241230,
    budget: '$6,500 – $10,000',
    budgetMin: 6500,
    match: 68,
    status: 'reviewed',
    description: 'Complete PPE kits including hard hats, gloves, safety vests, and steel-toed boots for construction site workers.',
    specs: ['Helmet: EN 397 certified', 'Vest: Hi-vis class 2', 'Gloves: EN 388', 'Boots: ISO 20345'],
    location: 'Abu Dhabi, UAE',
    postedTime: '4 days ago',
    savedBy: 1,
    bidsReceived: 6,
    buyerVerified: false,
  },
]

const STATUS_TABS = [
  { key: 'all', label: 'All RFQs', icon: 'list' },
  { key: 'new', label: 'New', icon: 'fiber_new' },
  { key: 'reviewed', label: 'Reviewed', icon: 'visibility' },
  { key: 'bid_placed', label: 'Bid Placed', icon: 'gavel' },
  { key: 'saved', label: 'Saved', icon: 'bookmark' },
  { key: 'sample', label: 'Sample RFQs', icon: 'science' },
]

const SORT_OPTIONS = [
  { key: 'match', label: 'Match %' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'budget', label: 'Budget (High→Low)' },
  { key: 'recent', label: 'Most Recent' },
]

const STATUS_META = {
  new: { label: 'New', color: 'bg-[#e1e0ff] text-[#0f00da]' },
  reviewed: { label: 'Reviewed', color: 'bg-[#e8f5e9] text-[#2e7d32]' },
  bid_placed: { label: 'Bid Placed', color: 'bg-[#fff3e0] text-[#e65100]' },
  declined: { label: 'Declined', color: 'bg-[#e8e8e8] text-[#9e9e9e]' },
}

function MatchBadge({ score }) {
  const color = score >= 90 ? 'bg-[#e1e0ff] text-[#0f00da]' : score >= 75 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#fff3e0] text-[#e65100]'
  return <span className={`${color} text-xs font-bold px-2 py-1 rounded-full`}>{score}% match</span>
}
export default function MatchedRFQs() {
  const { rfqList, setRfqList, updateStatus, addToast } = useDashboard()
  const { user, isDemo } = useAuth()
  const [savedIds, setSavedIds] = useState(new Set(['RFQ-2024-003']))
  const [placedBids, setPlacedBids] = useState({}) // id → bid data
  const [selectedId, setSelectedId] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('match')
  const [declineTarget, setDeclineTarget] = useState(null)
  const navigate = useNavigate()
  const { settings } = useSettings()
  const minOrderValue = parseInt(settings.preferences.minOrderValue) || 0
  const currency = settings.preferences.currency

  const [sampleRfqs, setSampleRfqs] = useState([])
  const [loadingSamples, setLoadingSamples] = useState(false)

  const loadSampleRfqs = async () => {
    if (!user) return
    try {
      setLoadingSamples(true)
      const supplierName = user.company || user.name || 'Supplier'
      const data = await fetchSampleRFQsForSupplier(supplierName)
      setSampleRfqs(data)
    } catch (err) {
      console.error('Failed to load sample RFQs:', err)
    } finally {
      setLoadingSamples(false)
    }
  }

  useEffect(() => {
    loadSampleRfqs()
    const channel = supabase.channel('supplier-sample-rfqs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_rfqs' }, () => { loadSampleRfqs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_quotes' }, () => { loadSampleRfqs(); })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const selectedRFQ = selectedId?.startsWith('SRFQ-')
    ? sampleRfqs.find(r => r.id === selectedId)
      ? {
          id: sampleRfqs.find(r => r.id === selectedId).id,
          title: sampleRfqs.find(r => r.id === selectedId).product,
          buyer: sampleRfqs.find(r => r.id === selectedId).buyer,
          buyerLogo: sampleRfqs.find(r => r.id === selectedId).buyer.slice(0,2).toUpperCase(),
          category: 'Samples & Prototypes',
          quantity: sampleRfqs.find(r => r.id === selectedId).sample_qty || '1 unit',
          deadline: sampleRfqs.find(r => r.id === selectedId).deadline || 'N/A',
          budget: 'N/A',
          budgetMin: 0,
          match: 100,
          status: sampleRfqs.find(r => r.id === selectedId).status === 'open' ? 'new' : sampleRfqs.find(r => r.id === selectedId).status === 'bids_received' ? 'bid_placed' : sampleRfqs.find(r => r.id === selectedId).status,
          description: sampleRfqs.find(r => r.id === selectedId).requirements || '',
          specs: [],
          location: 'Contact Admin',
          postedTime: new Date(sampleRfqs.find(r => r.id === selectedId).created_at).toLocaleDateString(),
          bidsReceived: 0,
          buyerVerified: true,
          isSample: true,
          rawSampleRFQ: sampleRfqs.find(r => r.id === selectedId)
        }
      : null
    : rfqList.find(r => r.id === selectedId) || null

  const toggleSave = (id) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDecline = (rfq) => setDeclineTarget(rfq)

  const confirmDecline = () => {
    if (!declineTarget) return
    updateStatus(declineTarget.id, 'declined')
    if (selectedId === declineTarget.id) setSelectedId(null)
    setDeclineTarget(null)
  }

  const handleBidPlaced = (rfqId, bidData) => {
    setPlacedBids(prev => ({ ...prev, [rfqId]: bidData }))
    updateStatus(rfqId, 'bid_placed')
    setTimeout(() => {
      setSelectedId(null)
      if (rfqId.startsWith('SRFQ-')) {
        loadSampleRfqs()
        navigate('/sample-orders')
      } else {
        navigate('/my-bids')
      }
    }, 2000)
  }

  const tabCounts = useMemo(() => {
    const counts = { all: 0, new: 0, reviewed: 0, bid_placed: 0, saved: 0, sample: sampleRfqs.length }
    rfqList.forEach(r => {
      if (r.status !== 'declined') counts.all++
      if (r.status === 'new') counts.new++
      if (r.status === 'reviewed') counts.reviewed++
      if (r.status === 'bid_placed') counts.bid_placed++
      if (savedIds.has(r.id)) counts.saved++
    })
    return counts
  }, [rfqList, savedIds, sampleRfqs])

  const filteredByMinOrder = useMemo(() => {
    if (!minOrderValue) return rfqList
    return rfqList.filter(r => r.budgetMin >= minOrderValue)
  }, [rfqList, minOrderValue])

  const hiddenByMinOrder = rfqList.filter(r => r.status !== 'declined' && r.budgetMin < minOrderValue).length

  const filtered = useMemo(() => {
    if (activeTab === 'sample') {
      const mapped = sampleRfqs.map(s => ({
        id: s.id,
        title: s.product,
        buyer: s.buyer,
        buyerLogo: s.buyer.slice(0,2).toUpperCase(),
        category: 'Samples & Prototypes',
        quantity: s.sample_qty || '1 unit',
        deadline: s.deadline || 'N/A',
        deadlineTs: 20261231,
        budget: 'N/A',
        budgetMin: 0,
        match: 100,
        status: s.status === 'open' ? 'new' : s.status === 'bids_received' ? 'bid_placed' : s.status,
        description: s.requirements || '',
        specs: [],
        location: 'Contact Admin',
        postedTime: new Date(s.created_at).toLocaleDateString(),
        bidsReceived: 0,
        buyerVerified: true,
        isSample: true
      }))
      if (search.trim()) {
        const q = search.toLowerCase()
        return mapped.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.buyer.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        )
      }
      return mapped
    }

    let list = filteredByMinOrder.filter(r => r.status !== 'declined')
    if (activeTab === 'saved') list = list.filter(r => savedIds.has(r.id))
    else if (activeTab !== 'all') list = list.filter(r => r.status === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (sort === 'match') return b.match - a.match
      if (sort === 'deadline') return a.deadlineTs - b.deadlineTs
      if (sort === 'budget') return b.budgetMin - a.budgetMin
      return 0
    })
  }, [filteredByMinOrder, activeTab, search, sort, savedIds, sampleRfqs])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left: List Panel ── */}
      <div className={`${selectedRFQ ? 'hidden md:flex md:w-[46%]' : 'flex w-full'} flex-col border-r border-[#ebebeb] overflow-hidden transition-all duration-200`}>

        {/* Header */}
        <div className="px-5 pt-5 pb-0 border-b border-[#ebebeb] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-[#111111]">Matched RFQs</h1>
              <p className="text-sm text-[#9e9e9e] mt-0.5">
                {tabCounts.all} active match{tabCounts.all !== 1 ? 'es' : ''} for your catalogue
              </p>
            </div>
            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-xs border border-[#ebebeb] rounded-full px-3 py-1.5 outline-none bg-white text-[#555555] cursor-pointer hover:border-[#0f00da] transition-colors"
            >
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#f7f7f7] rounded-full px-3 py-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-[#9e9e9e]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, buyer, category, ID..."
              className="bg-transparent text-sm outline-none flex-1 text-[#111111] placeholder-[#767589]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#9e9e9e] hover:text-[#111111]">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-[#0f00da] text-[#0f00da]'
                    : 'border-transparent text-[#9e9e9e] hover:text-[#555555]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.key ? 'bg-[#e1e0ff] text-[#0f00da]' : 'bg-[#f5f5f5] text-[#9e9e9e]'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* RFQ list */}
        <div className="flex-1 overflow-y-auto py-3 px-3">
          {/* Min order value filter notice */}
          {hiddenByMinOrder > 0 && (
            <div className="mb-3 flex items-center gap-2 bg-[#f0f1ff] border border-[#bfc1ff] rounded-xl px-3 py-2.5">
              <span className="material-symbols-outlined text-[16px] text-[#0f00da]">filter_list</span>
              <p className="text-xs text-[#0f00da] flex-1">
                <span className="font-semibold">{hiddenByMinOrder} RFQ{hiddenByMinOrder !== 1 ? 's' : ''}</span> below your min. order value ({formatAmount(minOrderValue, currency)}) are hidden.
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="text-[10px] text-[#0f00da] font-semibold hover:underline flex-shrink-0"
              >
                Change in Settings
              </button>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[28px] text-[#9e9e9e]">search_off</span>
              </div>
              <p className="text-sm font-medium text-[#111111]">No RFQs found</p>
              <p className="text-xs text-[#9e9e9e] mt-1">
                {search ? 'Try different keywords' : 'No RFQs in this category yet'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-3 text-xs text-[#0f00da] hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(rfq => (
                <RFQCard
                  key={rfq.id}
                  rfq={rfq}
                  isSelected={selectedId === rfq.id}
                  isSaved={savedIds.has(rfq.id)}
                  bid={placedBids[rfq.id]}
                  onSelect={() => setSelectedId(selectedId === rfq.id ? null : rfq.id)}
                  onToggleSave={() => toggleSave(rfq.id)}
                  onDecline={() => handleDecline(rfq)}
                  onMarkReviewed={() => updateStatus(rfq.id, 'reviewed')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Detail Drawer ── */}
      {selectedRFQ && (
        <div className="fixed inset-0 md:static md:flex-1 overflow-y-auto bg-white z-50 md:z-auto">
          <BidDrawer
            rfq={selectedRFQ}
            isSaved={savedIds.has(selectedRFQ.id)}
            bid={placedBids[selectedRFQ.id]}
            onClose={() => setSelectedId(null)}
            onToggleSave={() => toggleSave(selectedRFQ.id)}
            onDecline={() => handleDecline(selectedRFQ)}
            onMarkReviewed={() => updateStatus(selectedRFQ.id, 'reviewed')}
            onBidPlaced={(data) => handleBidPlaced(selectedRFQ.id, data)}
            onToast={addToast}
            user={user}
            isDemo={isDemo}
            navigate={navigate}
          />
        </div>
      )}

      {/* ── Decline Confirmation ── */}
      {declineTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeclineTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">block</span>
              </div>
              <h2 className="text-base font-semibold text-[#111111]">Decline RFQ</h2>
            </div>
            <p className="text-sm text-[#555555] mb-5">
              Are you sure you want to decline{' '}
              <span className="font-semibold text-[#111111]">"{declineTarget.title}"</span>?
              It will be removed from your active list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeclineTarget(null)}
                className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDecline}
                className="flex-1 bg-[#ba1a1a] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#93000a] transition-colors"
              >
                Decline RFQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RFQCard({ rfq, isSelected, isSaved, bid, onSelect, onToggleSave, onDecline, onMarkReviewed }) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white border rounded-xl p-4 cursor-pointer transition-all group ${
        isSelected ? 'border-[#2d2dff] shadow-sm ring-1 ring-[#2d2dff]/20' : 'border-[#ebebeb] hover:border-[#2d2dff] hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {rfq.buyerLogo}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-[#111111] truncate">{rfq.title}</p>
              {rfq.buyerVerified && (
                <span className="material-symbols-outlined text-[14px] text-[#0f00da] flex-shrink-0" title="Verified Buyer">verified</span>
              )}
            </div>
            <p className="text-xs text-[#9e9e9e]">{rfq.buyer}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <MatchBadge score={rfq.match} />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#9e9e9e] flex-wrap mb-2">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">inventory_2</span>
          {rfq.quantity}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          Due {rfq.deadline}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">payments</span>
          {rfq.budget}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {rfq.location}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-[#f7f7f7] text-[#555555] text-xs px-2 py-0.5 rounded-full">{rfq.category}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_META[rfq.status]?.color}`}>
            {STATUS_META[rfq.status]?.label}
          </span>
          <span className="text-xs text-[#9e9e9e]">{rfq.bidsReceived} bids</span>
        </div>
        <span className="text-xs text-[#9e9e9e]">{rfq.postedTime}</span>
      </div>

      {/* Quick actions — visible on hover */}
      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button
          onClick={onToggleSave}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
            isSaved
              ? 'bg-[#e1e0ff] border-[#0f00da] text-[#0f00da]'
              : 'border-[#ebebeb] text-[#9e9e9e] hover:border-[#0f00da] hover:text-[#0f00da]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">{isSaved ? 'bookmark' : 'bookmark_border'}</span>
          {isSaved ? 'Saved' : 'Save'}
        </button>
        {rfq.status === 'new' && (
          <button
            onClick={onMarkReviewed}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-[#ebebeb] text-[#9e9e9e] hover:border-[#2e7d32] hover:text-[#2e7d32] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">visibility</span>
            Mark Reviewed
          </button>
        )}
        <button
          onClick={onDecline}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-[#ebebeb] text-[#9e9e9e] hover:border-[#ba1a1a] hover:text-[#ba1a1a] transition-colors ml-auto"
        >
          <span className="material-symbols-outlined text-[14px]">block</span>
          Decline
        </button>
      </div>

      {/* Existing bid preview */}
      {rfq.status === 'bid_placed' && bid && (
        <div className="mt-3 bg-[#fff3e0] border border-[#ffe0b2] rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-[#e65100] font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">gavel</span>
            Your bid: ${bid.amount}
          </span>
          <span className="text-xs text-[#e65100]">{bid.days} days delivery</span>
        </div>
      )}
    </div>
  )
}

function BidDrawer({ rfq, isSaved, bid, onClose, onToggleSave, onDecline, onMarkReviewed, onBidPlaced, onToast, user, isDemo, navigate }) {
  const [tab, setTab] = useState(rfq.status === 'bid_placed' ? 'details' : 'bid')

  // ── Phase 2: Full quotation fields ──
  const [unitPrice, setUnitPrice]       = useState(bid?.unitPrice || '')
  const [moq, setMoq]                   = useState(bid?.moq || '')
  const [leadTimeDays, setLeadTimeDays] = useState(bid?.leadTimeDays || bid?.days || '')
  const [paymentTerms, setPaymentTerms] = useState(bid?.paymentTerms || 'Net 30')
  const [note, setNote]                 = useState(bid?.note || '')
  const [validUntil, setValidUntil]     = useState('')
  const [quoteType, setQuoteType]       = useState('bulk')

  const [errors, setErrors]     = useState({})

  useEffect(() => {
    if (rfq?.isSample) {
      setQuoteType('sample')
      const qtyNum = parseInt(rfq.quantity, 10)
      setMoq(isNaN(qtyNum) ? '1' : qtyNum.toString())
    } else {
      setQuoteType('bulk')
    }
  }, [rfq])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  const alreadyBid = rfq.status === 'bid_placed'

  const validate = () => {
    const e = {}
    if (!unitPrice || isNaN(Number(unitPrice)) || Number(unitPrice) <= 0)
      e.unitPrice = 'Enter a valid unit price'
    if (!moq || isNaN(Number(moq)) || Number(moq) < 1)
      e.moq = 'Enter minimum order quantity'
    if (!leadTimeDays || isNaN(Number(leadTimeDays)) || Number(leadTimeDays) <= 0)
      e.leadTimeDays = 'Enter lead time in days'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      let quoteId
      if (rfq.isSample) {
        quoteId = await submitSampleQuote(rfq.id, {
          supplierId: user?.supplierId || user?.id,
          supplierName: user?.company || user?.name || 'Supplier',
          unitPrice: Number(unitPrice),
          sampleQty: Number(moq),
          leadTimeDays: Number(leadTimeDays),
          paymentTerms,
          notes: note,
          validUntil: validUntil || undefined
        })
      } else if (isDemo) {
        quoteId = await submitQuotation({
          rfqId:        rfq.id,
          unitPrice:    Number(unitPrice),
          moq:          Number(moq),
          leadTimeDays: Number(leadTimeDays),
          paymentTerms,
          notes:        note,
          validUntil:   validUntil || undefined,
          supplierId:   user?.id,
          supplierName: user?.company || user?.name,
          supplierEmail: user?.email,
          quoteType,
        })
      } else {
        const quoteObj = await submitBid(
          rfq.id,
          user?.authUserId,
          user?.supplierId,
          user?.company || user?.name || 'Supplier',
          {
            qty: Number(moq),
            unitPrice: Number(unitPrice),
            moq: Number(moq),
            leadTime: Number(leadTimeDays),
            paymentTerms,
            notes: note
          },
          false
        )
        quoteId = quoteObj?.id
      }
      setSubmitted(true)
      onBidPlaced({
        quoteId,
        unitPrice,
        moq,
        leadTimeDays,
        paymentTerms,
        note,
        // Legacy compat fields for existing MyBids display
        amount: (Number(unitPrice) * Number(moq)).toFixed(2),
        days:   leadTimeDays,
      })
      onToast?.(`Quote submitted for ${rfq.title}`, 'success')
    } catch (err) {
      console.error('submitQuotation/submitBid failed:', err)
      setSubmitError(err.message || 'Submission failed — check connection and retry')
      onToast?.('Quote submission failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const total = (Number(unitPrice) * Number(moq)).toFixed(2)
    return (
      <div className="h-full flex items-center justify-center p-8 min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#e1e0ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] text-[#0f00da]">check_circle</span>
          </div>
          <h2 className="text-xl font-semibold text-[#111111] mb-2">Quotation Submitted!</h2>
          <p className="text-sm text-[#9e9e9e] mb-1">
            <strong>${Number(unitPrice).toLocaleString(undefined,{minimumFractionDigits:2})}/unit</strong>
            {' '}× MOQ <strong>{Number(moq).toLocaleString()} pcs</strong>
            {' '}= <strong>${Number(total).toLocaleString(undefined,{minimumFractionDigits:2})}</strong>
          </p>
          <p className="text-xs text-[#9e9e9e] mb-0.5">Lead time: {leadTimeDays} days · {paymentTerms}</p>
          <p className="text-xs text-[#9e9e9e]">Redirecting to My Bids...</p>
        </div>
      </div>
    )
  }

  const matchColor = rfq.match >= 90 ? 'bg-[#0f00da]' : rfq.match >= 75 ? 'bg-[#2e7d32]' : 'bg-[#e65100]'

  return (
    <div className="flex flex-col h-full">
      {/* Drawer header */}
      <div className="px-5 py-4 border-b border-[#ebebeb] flex-shrink-0 sticky top-0 bg-white z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center font-bold flex-shrink-0">
              {rfq.buyerLogo}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-semibold text-[#111111]">{rfq.title}</h2>
                {rfq.buyerVerified && (
                  <span className="material-symbols-outlined text-[15px] text-[#0f00da]" title="Verified Buyer">verified</span>
                )}
              </div>
              <p className="text-xs text-[#9e9e9e]">{rfq.buyer} · {rfq.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onToggleSave}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isSaved ? 'bg-[#e1e0ff] text-[#0f00da]' : 'hover:bg-[#f5f5f5] text-[#9e9e9e]'
              }`}
              title={isSaved ? 'Unsave' : 'Save'}
            >
              <span className="material-symbols-outlined text-[18px]">{isSaved ? 'bookmark' : 'bookmark_border'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
            </button>
          </div>
        </div>

        {/* Match bar + status */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#f5f5f5] rounded-full overflow-hidden">
              <div className={`h-full ${matchColor} rounded-full transition-all`} style={{ width: `${rfq.match}%` }} />
            </div>
            <span className="text-xs font-semibold text-[#0f00da]">{rfq.match}% match</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_META[rfq.status]?.color}`}>
            {STATUS_META[rfq.status]?.label}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border border-[#ebebeb] rounded-full p-0.5 w-fit">
          {[
            { key: 'details', label: 'RFQ Details', icon: 'description' },
            { key: 'bid', label: alreadyBid ? 'Your Bid' : 'Submit Bid', icon: alreadyBid ? 'gavel' : 'send' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                tab === t.key ? 'bg-[#0f00da] text-white' : 'text-[#9e9e9e] hover:text-[#555555]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'details' ? (
          <DetailsPanel rfq={rfq} onMarkReviewed={onMarkReviewed} onDecline={onDecline} onSwitchToBid={() => setTab('bid')} alreadyBid={alreadyBid} bid={bid} />
        ) : (
          <BidPanel
            rfq={rfq}
            unitPrice={unitPrice}           setUnitPrice={setUnitPrice}
            moq={moq}                       setMoq={setMoq}
            leadTimeDays={leadTimeDays}     setLeadTimeDays={setLeadTimeDays}
            paymentTerms={paymentTerms}     setPaymentTerms={setPaymentTerms}
            note={note}                     setNote={setNote}
            validUntil={validUntil}         setValidUntil={setValidUntil}
            quoteType={quoteType}           setQuoteType={setQuoteType}
            errors={errors}                 setErrors={setErrors}
            submitting={submitting}
            submitError={submitError}
            alreadyBid={alreadyBid}
            bid={bid}
            onSubmit={handleSubmit}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  )
}

function DetailsPanel({ rfq, onMarkReviewed, onDecline, onSwitchToBid, alreadyBid, bid }) {
  return (
    <div className="space-y-5">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: 'inventory_2', label: 'Quantity', value: rfq.quantity },
          { icon: 'schedule', label: 'Deadline', value: rfq.deadline },
          { icon: 'payments', label: 'Budget', value: rfq.budget },
          { icon: 'location_on', label: 'Delivery To', value: rfq.location },
          { icon: 'category', label: 'Category', value: rfq.category },
          { icon: 'groups', label: 'Bids Received', value: `${rfq.bidsReceived} suppliers` },
        ].map(m => (
          <div key={m.label} className="flex items-start gap-2.5 bg-white rounded-xl p-3">
            <span className="material-symbols-outlined text-[18px] text-[#0f00da] flex-shrink-0 mt-0.5">{m.icon}</span>
            <div>
              <p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide font-medium">{m.label}</p>
              <p className="text-sm font-semibold text-[#111111] mt-0.5">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-semibold text-[#111111] mb-2">Description</h4>
        <p className="text-sm text-[#555555] leading-relaxed bg-white rounded-xl p-4">{rfq.description}</p>
      </div>

      {/* Specifications */}
      <div>
        <h4 className="text-sm font-semibold text-[#111111] mb-2">Specifications</h4>
        <div className="border border-[#ebebeb] rounded-xl overflow-hidden">
          {rfq.specs.map((spec, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i !== rfq.specs.length - 1 ? 'border-b border-[#f3f3f3]' : ''}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0f00da] flex-shrink-0" />
              <span className="text-sm text-[#555555]">{spec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buyer info */}
      <div className="bg-white border border-[#ebebeb] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center font-bold">
            {rfq.buyerLogo}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-[#111111]">{rfq.buyer}</p>
              {rfq.buyerVerified && (
                <span className="text-[10px] bg-[#e1e0ff] text-[#0f00da] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[11px]">verified</span>
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-[#9e9e9e] mt-0.5">{rfq.location} · Posted {rfq.postedTime}</p>
          </div>
        </div>
      </div>

      {/* Already placed bid preview */}
      {alreadyBid && bid && (
        <div className="bg-[#fff3e0] border border-[#ffe0b2] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#e65100] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">gavel</span>
            Your Submitted Bid
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide">Quote</p><p className="font-semibold text-[#111111]">${bid.amount}</p></div>
            <div><p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide">Delivery</p><p className="font-semibold text-[#111111]">{bid.days} days</p></div>
            {bid.note && <div className="col-span-2"><p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide">Notes</p><p className="text-sm text-[#555555] mt-0.5">{bid.note}</p></div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        {rfq.status === 'new' && (
          <button
            onClick={onMarkReviewed}
            className="flex-1 flex items-center justify-center gap-1.5 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:border-[#2e7d32] hover:text-[#2e7d32] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Mark Reviewed
          </button>
        )}
        {!alreadyBid && (
          <button
            onClick={onSwitchToBid}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            Submit a Bid
          </button>
        )}
        <button
          onClick={onDecline}
          className="flex items-center justify-center gap-1.5 border border-[#ebebeb] text-[#9e9e9e] px-4 py-2.5 rounded-full text-sm font-medium hover:border-[#ba1a1a] hover:text-[#ba1a1a] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">block</span>
          Decline
        </button>
      </div>
    </div>
  )
}

function BidPanel({ rfq, unitPrice, setUnitPrice, moq, setMoq, leadTimeDays, setLeadTimeDays, paymentTerms, setPaymentTerms, note, setNote, validUntil, setValidUntil, quoteType, setQuoteType, errors, setErrors, submitting, submitError, alreadyBid, bid, onSubmit, navigate }) {
  const totalValue   = (unitPrice && moq && !isNaN(unitPrice) && !isNaN(moq))
    ? (Number(unitPrice) * Number(moq)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'
  const withinBudget = totalValue !== '—' && Number(unitPrice) * Number(moq) >= rfq.budgetMin && Number(unitPrice) * Number(moq) <= rfq.budgetMin * 1.5

  if (alreadyBid && bid) {
    return (
      <div className="space-y-4">
        <div className="bg-[#fff3e0] border border-[#ffe0b2] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-[#e65100]">gavel</span>
            <h4 className="text-sm font-semibold text-[#e65100]">Bid Already Submitted</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide mb-1">Your Quote</p><p className="text-lg font-bold text-[#111111]">${bid.amount}</p></div>
            <div><p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide mb-1">Delivery Time</p><p className="text-lg font-bold text-[#111111]">{bid.days} days</p></div>
            {bid.note && (
              <div className="col-span-2">
                <p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide mb-1">Your Notes</p>
                <p className="text-sm text-[#555555]">{bid.note}</p>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/my-bids')}
          className="w-full flex items-center justify-center gap-2 bg-[#0f00da] text-white py-3 rounded-full text-sm font-semibold hover:bg-[#2d2dff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">gavel</span>
          View in My Bids
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">

      {/* ── Bid Type ── */}
      {!rfq?.isSample ? (
        <div>
          <label className="text-xs font-medium text-[#555555] block mb-1.5">Bid Type</label>
          <div className="flex gap-2">
            {[
              { key: 'bulk', label: 'Bulk Production Bid', icon: 'inventory_2' },
              { key: 'sample', label: 'Sample Bid', icon: 'deployed_code' },
            ].map(type => (
              <button
                key={type.key}
                type="button"
                onClick={() => {
                  setQuoteType(type.key);
                  if (type.key === 'sample' && (!moq || Number(moq) > 5)) {
                    setMoq('1');
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                  quoteType === type.key
                    ? 'bg-[#0f00da] text-white border-[#0f00da]'
                    : 'border-[#ebebeb] text-[#555555] hover:border-[#0f00da] hover:text-[#0f00da]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#f0f1ff] border border-[#bfc1ff] rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#0f00da]">science</span>
          <div>
            <p className="text-xs font-semibold text-[#0f00da]">Sample Request Bid</p>
            <p className="text-[10px] text-[#767589]">This bid is specifically for providing prototypes/samples.</p>
          </div>
        </div>
      )}

      {/* ── Reference bar ── */}
      <div className="bg-white border border-[#ebebeb] rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide">Buyer Budget Range</p>
          <p className="text-sm font-semibold text-[#111111] mt-0.5">{rfq.budget}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#9e9e9e] uppercase tracking-wide">Bids so far</p>
          <p className="text-sm font-semibold text-[#111111] mt-0.5">{rfq.bidsReceived} suppliers</p>
        </div>
      </div>

      {/* ── Row 1: Unit Price + MOQ ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Unit Price */}
        <div>
          <label className="text-xs font-medium text-[#555555] block mb-1.5">
            Unit Price (USD) <span className="text-[#ba1a1a]">*</span>
          </label>
          <div className={`flex items-center border rounded-xl overflow-hidden focus-within:border-[#0f00da] transition-colors ${errors.unitPrice ? 'border-[#ba1a1a]' : 'border-[#ebebeb]'}`}>
            <span className="px-3 text-[#9e9e9e] text-sm bg-[#f7f7f7] h-11 flex items-center border-r border-[#ebebeb]">$</span>
            <input
              type="number"
              value={unitPrice}
              onChange={e => { setUnitPrice(e.target.value); setErrors(er => ({ ...er, unitPrice: '' })) }}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
            />
          </div>
          {errors.unitPrice && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.unitPrice}</p>}
        </div>

        {/* MOQ */}
        <div>
          <label className="text-xs font-medium text-[#555555] block mb-1.5">
            {rfq?.isSample ? 'Sample Quantity' : 'Min. Order Qty (MOQ)'} <span className="text-[#ba1a1a]">*</span>
          </label>
          <div className={`flex items-center border rounded-xl overflow-hidden focus-within:border-[#0f00da] transition-colors ${errors.moq ? 'border-[#ba1a1a]' : 'border-[#ebebeb]'}`}>
            <input
              type="number"
              value={moq}
              onChange={e => { if (!rfq?.isSample) { setMoq(e.target.value); setErrors(er => ({ ...er, moq: '' })) } }}
              placeholder={rfq?.isSample ? '' : "e.g. 50"}
              readOnly={rfq?.isSample}
              min="1"
              step="1"
              className={`flex-1 px-3 py-2.5 text-sm outline-none bg-white ${rfq?.isSample ? 'bg-[#f7f7f7] text-[#9e9e9e] cursor-not-allowed' : ''}`}
            />
            <span className="px-3 text-[#9e9e9e] text-sm bg-[#f7f7f7] h-11 flex items-center border-l border-[#ebebeb]">pcs</span>
          </div>
          {errors.moq && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.moq}</p>}
        </div>
      </div>

      {/* Budget fit indicator */}
      {unitPrice && moq && (
        rfq?.isSample ? (
          <p className="text-xs -mt-2 flex items-center gap-1 text-[#0f00da]">
            <span className="material-symbols-outlined text-[12px]">info</span>
            Total Sample Quote Value: <strong>${totalValue}</strong>
          </p>
        ) : (
          <p className={`text-xs -mt-2 flex items-center gap-1 ${withinBudget ? 'text-[#2e7d32]' : 'text-[#e65100]'}`}>
            <span className="material-symbols-outlined text-[12px]">{withinBudget ? 'check_circle' : 'info'}</span>
            Total: <strong>${totalValue}</strong> — {withinBudget ? 'within buyer budget ✓' : 'outside buyer budget — justify in notes'}
          </p>
        )
      )}

      {/* ── Row 2: Lead Time + Valid Until ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Lead Time */}
        <div>
          <label className="text-xs font-medium text-[#555555] block mb-1.5">
            Lead Time (days) <span className="text-[#ba1a1a]">*</span>
          </label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {['7', '14', '21', '30'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { setLeadTimeDays(d); setErrors(er => ({ ...er, leadTimeDays: '' })) }}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${leadTimeDays === d ? 'bg-[#0f00da] text-white border-[#0f00da]' : 'border-[#ebebeb] text-[#555555] hover:border-[#0f00da]'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <input
            type="number"
            value={leadTimeDays}
            onChange={e => { setLeadTimeDays(e.target.value); setErrors(er => ({ ...er, leadTimeDays: '' })) }}
            placeholder="Custom days"
            min="1"
            className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f00da] transition-colors ${errors.leadTimeDays ? 'border-[#ba1a1a]' : 'border-[#ebebeb]'}`}
          />
          {errors.leadTimeDays && <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">error</span>{errors.leadTimeDays}</p>}
        </div>

        {/* Quote Valid Until */}
        <div>
          <label className="text-xs font-medium text-[#555555] block mb-1.5">Quote Valid Until</label>
          <input
            type="date"
            value={validUntil}
            onChange={e => setValidUntil(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full border border-[#ebebeb] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0f00da] transition-colors"
            style={{ marginTop: 'calc(1.25rem + 8px)' }}
          />
        </div>
      </div>

      {/* ── Payment Terms ── */}
      <div>
        <label className="text-xs font-medium text-[#555555] block mb-1.5">Payment Terms</label>
        <div className="flex flex-wrap gap-2">
          {['Net 30', 'Net 60', '50% Advance', 'LC at Sight', 'Cash on Delivery'].map(term => (
            <button
              key={term}
              type="button"
              onClick={() => setPaymentTerms(term)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                paymentTerms === term
                  ? 'bg-[#0f00da] text-white border-[#0f00da]'
                  : 'border-[#ebebeb] text-[#555555] hover:border-[#0f00da] hover:text-[#0f00da]'
              }`}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <label className="text-xs font-medium text-[#555555] flex items-center justify-between mb-1.5">
          <span>Additional Notes & Terms</span>
          <span className="text-[#9e9e9e] font-normal">{note.length}/400</span>
        </label>
        <textarea
          value={note}
          onChange={e => e.target.value.length <= 400 && setNote(e.target.value)}
          rows={3}
          placeholder="Certifications, packing standards, special conditions, or why you're the best fit..."
          className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] resize-none transition-colors"
        />
      </div>

      {/* ── Live Summary ── */}
      {unitPrice && moq && leadTimeDays && (
        <div className="bg-[#e1e0ff] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#0f00da] mb-3">Quote Summary</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="text-[#555555] opacity-70">Unit Price</p>
              <p className="font-bold text-[#0f00da]">${Number(unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[#555555] opacity-70">MOQ</p>
              <p className="font-bold text-[#0f00da]">{Number(moq).toLocaleString()} pcs</p>
            </div>
            <div>
              <p className="text-[#555555] opacity-70">Total Value</p>
              <p className="font-bold text-[#0f00da]">${totalValue}</p>
            </div>
            <div>
              <p className="text-[#555555] opacity-70">Lead Time</p>
              <p className="font-bold text-[#0f00da]">{leadTimeDays} days</p>
            </div>
            <div className="col-span-2">
              <p className="text-[#555555] opacity-70">Payment Terms</p>
              <p className="font-bold text-[#0f00da]">{paymentTerms}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit error ── */}
      {submitError && (
        <div className="flex items-center gap-2 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl px-3 py-2.5">
          <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">error</span>
          <p className="text-xs text-[#ba1a1a] flex-1">{submitError}</p>
        </div>
      )}

      {/* ── CTA ── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate('/quote-submission')}
          className="flex-1 flex items-center justify-center gap-1.5 border border-[#0f00da] text-[#0f00da] py-2.5 rounded-full text-sm font-medium hover:bg-[#e1e0ff] transition-colors"
        >
          <span className="text-base">✦</span>
          AI Quote Assistant
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-semibold hover:bg-[#2d2dff] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Submitting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">send</span>
              Submit Quotation
            </>
          )}
        </button>
      </div>
    </form>
  )
}
