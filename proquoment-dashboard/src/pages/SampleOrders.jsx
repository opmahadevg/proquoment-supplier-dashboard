import { useState, useEffect } from 'react'
import { useDashboard } from '../context/DashboardContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  fetchSampleQuotesForSupplier,
  fetchSampleOrdersForSupplier,
  fetchSampleStagesForOrderSupplier,
  upsertSampleStageSupplier,
  uploadSampleDocumentSupplier,
  fetchSampleDocumentsForOrderSupplier
} from '../lib/procurementApi'

const STAGE_CONFIG = {
  process: {
    label: 'Process Design',
    icon: 'architecture',
    docs: ['Process Sheet']
  },
  qa: {
    label: 'Quality Assurance',
    icon: 'verified_user',
    docs: ['QA Certificate', 'AQL Report', 'Test Report']
  },
  manufacturing: {
    label: 'Manufacturing',
    icon: 'precision_manufacturing',
    docs: ['Material Data Sheet']
  },
  packing: {
    label: 'Packing',
    icon: 'package_2',
    docs: ['Packing List', 'Certificate of Conformance']
  },
  shipping: {
    label: 'Shipping & Delivery',
    icon: 'local_shipping',
    docs: ['Bill of Lading', 'Commercial Invoice', 'Shipping Invoice', 'Photos']
  }
}

const ALL_DOC_TYPES = [
  { name: 'Process Sheet', stage: 'process' },
  { name: 'QA Certificate', stage: 'qa' },
  { name: 'AQL Report', stage: 'qa' },
  { name: 'Test Report', stage: 'qa' },
  { name: 'Material Data Sheet', stage: 'manufacturing' },
  { name: 'Packing List', stage: 'packing' },
  { name: 'Certificate of Conformance', stage: 'packing' },
  { name: 'Bill of Lading', stage: 'shipping' },
  { name: 'Commercial Invoice', stage: 'shipping' },
  { name: 'Shipping Invoice', stage: 'shipping' },
  { name: 'Photos', stage: 'shipping' }
]

export default function SampleOrders() {
  const { user } = useAuth()
  const { addToast } = useDashboard()
  const supplierName = user?.company || user?.name || 'Supplier'

  const [activeTab, setActiveTab] = useState('quotes') // 'quotes', 'active_orders', 'completed'
  const [quotes, setQuotes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Drawer states
  const [stages, setStages] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedStageName, setSelectedStageName] = useState('process')
  const [stageStatus, setStageStatus] = useState('pending')
  const [stageNotes, setStageNotes] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedDocType, setSelectedDocType] = useState('Process Sheet')
  const [updatingStage, setUpdatingStage] = useState(false)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const sName = user.company || user.name || 'Supplier'
      const [quotesData, ordersData] = await Promise.all([
        fetchSampleQuotesForSupplier(sName),
        fetchSampleOrdersForSupplier(sName)
      ])
      setQuotes(quotesData)
      setOrders(ordersData)
    } catch (err) {
      console.error('Failed to load sample quotes/orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const channel = supabase.channel('supplier-sample-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_orders' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_quotes' }, () => { loadData(); })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Fetch stages and docs when selecting an order
  useEffect(() => {
    if (!selectedOrder) {
      setStages([])
      setDocuments([])
      return
    }

    const fetchOrderDetails = async () => {
      try {
        const [stagesData, docsData] = await Promise.all([
          fetchSampleStagesForOrderSupplier(selectedOrder.id),
          fetchSampleDocumentsForOrderSupplier(selectedOrder.id)
        ])
        setStages(stagesData)
        setDocuments(docsData)

        // Set default values for stage updater
        const currentStageObj = stagesData.find(s => s.stage_name === selectedStageName)
        setStageStatus(currentStageObj?.status || 'pending')
        setStageNotes(currentStageObj?.notes || '')
      } catch (err) {
        console.error('Failed to fetch stages/docs:', err)
      }
    }

    fetchOrderDetails()

    const channel = supabase.channel(`order-details-${selectedOrder.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_stages', filter: `sample_order_id=eq.${selectedOrder.id}` }, () => { fetchOrderDetails(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_documents', filter: `sample_order_id=eq.${selectedOrder.id}` }, () => { fetchOrderDetails(); })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedOrder])

  // Handle stage selection in the updater panel
  const handleStageSelect = (stageName) => {
    setSelectedStageName(stageName)
    const existing = stages.find(s => s.stage_name === stageName)
    setStageStatus(existing?.status || 'pending')
    setStageNotes(existing?.notes || '')
    setSelectedDocType(STAGE_CONFIG[stageName].docs[0])
    setSelectedFile(null)
  }

  // Save stage progress
  const handleSaveStage = async (e) => {
    e.preventDefault()
    if (!selectedOrder) return
    setUpdatingStage(true)
    try {
      await upsertSampleStageSupplier(
        selectedOrder.id,
        selectedStageName,
        stageStatus,
        stageNotes,
        supplierName
      )
      addToast?.(`Stage "${STAGE_CONFIG[selectedStageName].label}" updated to ${stageStatus.toUpperCase()}`, 'success')
      // Refetch locally
      const updatedStages = await fetchSampleStagesForOrderSupplier(selectedOrder.id)
      setStages(updatedStages)
    } catch (err) {
      console.error(err)
      alert('Failed to save stage progress: ' + err.message)
    } finally {
      setUpdatingStage(false)
    }
  }

  // Upload compliance document
  const handleUploadDocument = async (e) => {
    e.preventDefault()
    if (!selectedOrder || !selectedFile) {
      alert('Please select a file to upload')
      return
    }
    setUploadingDoc(true)
    try {
      await uploadSampleDocumentSupplier(
        selectedOrder.id,
        selectedStageName,
        selectedDocType,
        selectedFile,
        supplierName
      )
      addToast?.(`Document "${selectedDocType}" uploaded successfully!`, 'success')
      setSelectedFile(null)
      // Refetch docs
      const updatedDocs = await fetchSampleDocumentsForOrderSupplier(selectedOrder.id)
      setDocuments(updatedDocs)
    } catch (err) {
      console.error(err)
      alert('Failed to upload document: ' + err.message)
    } finally {
      setUploadingDoc(false)
    }
  }

  // Stats derivation
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'completed')
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed')

  const stats = {
    totalQuotes: quotes.length,
    pendingQuotes: quotes.filter(q => q.status === 'pending').length,
    activeOrdersCount: activeOrders.length,
    completedCount: completedOrders.length
  }

  // Document checklist calculation
  const getDocumentChecklist = () => {
    return ALL_DOC_TYPES.map(type => {
      const doc = documents.find(d => d.doc_type === type.name)
      return {
        ...type,
        uploaded: !!doc,
        url: doc?.file_url || null,
        fileName: doc?.file_name || null
      }
    })
  }

  const checklist = getDocumentChecklist()
  const uploadedCount = checklist.filter(c => c.uploaded).length
  const checklistProgress = Math.round((uploadedCount / ALL_DOC_TYPES.length) * 100)

  return (
    <div className="p-4 md:p-6 bg-[#fafafa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] tracking-wider uppercase bg-[#ffdad6] text-[#ba1a1a] px-2.5 py-1 rounded-full font-bold">
              R&D SPECIMEN EVALUATION
            </span>
            <span className="text-[10px] tracking-wider uppercase bg-[#e1e0ff] text-[#0f00da] px-2.5 py-1 rounded-full font-bold">
              SAMPLES PIPELINE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Samples & Quotes</h1>
          <p className="text-sm text-[#9e9e9e]">Submit sample bids, update manufacturing stages, and upload compliance documents for engineering approvals.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'My Sample Quotes', value: stats.totalQuotes, icon: 'gavel', desc: 'Total bids submitted' },
          { label: 'Pending Review', value: stats.pendingQuotes, icon: 'hourglass_empty', desc: 'Awaiting buyer selection' },
          { label: 'Active Orders', value: stats.activeOrdersCount, icon: 'science', desc: 'Samples in production/transit' },
          { label: 'Completed Orders', value: stats.completedCount, icon: 'check_circle', desc: 'Delivered prototype sets' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#ebebeb] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-full bg-[#f0f1ff] flex items-center justify-center flex-shrink-0 text-[#0f00da]">
                <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
              </div>
              <span className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#111111]">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 bg-[#f0f0f0] p-1 rounded-full w-fit mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: 'quotes', label: 'My Sample Quotes', icon: 'gavel' },
          { key: 'active_orders', label: 'Active Sample Orders', icon: 'pending_actions' },
          { key: 'completed', label: 'Completed', icon: 'task_alt' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === t.key ? 'bg-white text-[#0f00da] shadow-sm' : 'text-[#555555] hover:text-[#000]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-8 h-8 text-[#0f00da] mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm">Syncing with Supabase...</p>
          </div>
        ) : activeTab === 'quotes' ? (
          /* Quotes Table */
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#f3f3f3] bg-[#fafafa]">
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Quote ID</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Sample RFQ</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Sample Qty</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Unit Price</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Total Value</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Lead Time</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">
                    <span className="material-symbols-outlined text-[48px] text-gray-300 block mb-2">gavel</span>
                    No sample quotes submitted yet
                  </td>
                </tr>
              ) : (
                quotes.map(q => (
                  <tr key={q.id} className="border-t border-[#f3f3f3] hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#0f00da]">{q.id}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 font-semibold">{q.sample_rfq_id}</td>
                    <td className="px-5 py-4 text-sm text-gray-800 font-semibold">{q.sample_rfqs?.product || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{q.sample_qty} pcs</td>
                    <td className="px-5 py-4 text-sm text-gray-600">${Number(q.unit_price).toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-gray-800 font-bold">${Number(q.total_value).toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{q.lead_time_days} days</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        q.status === 'buyer_accepted' || q.status === 'order_placed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        q.status === 'forwarded' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        q.status === 'buyer_rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {q.status === 'forwarded' ? 'Forwarded to Buyer' : q.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : activeTab === 'active_orders' ? (
          /* Active Orders Table */
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#f3f3f3] bg-[#fafafa]">
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Buyer</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Date</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">
                    <span className="material-symbols-outlined text-[48px] text-gray-300 block mb-2">science</span>
                    No active sample orders
                  </td>
                </tr>
              ) : (
                activeOrders.map(order => (
                  <tr key={order.id} className="border-t border-[#f3f3f3] hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#0f00da]">{order.id}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{order.product}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{order.buyer}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{order.quantity}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        order.status === 'qa_check' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>{order.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-[#0f00da] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#2d2dff] transition-colors"
                      >
                        Manage Stages
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* Completed Orders Table */
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#f3f3f3] bg-[#fafafa]">
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Buyer</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Finished Date</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {completedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm font-semibold text-gray-400">
                    <span className="material-symbols-outlined text-[48px] text-gray-300 block mb-2">task_alt</span>
                    No completed sample orders yet
                  </td>
                </tr>
              ) : (
                completedOrders.map(order => (
                  <tr key={order.id} className="border-t border-[#f3f3f3] hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-[#0f00da]">{order.id}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{order.product}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{order.buyer}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{order.quantity}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">{new Date(order.updated_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="border border-[#ebebeb] text-[#0f00da] px-4 py-1.5 rounded-full text-xs font-semibold hover:border-[#0f00da] transition-colors"
                      >
                        View Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Manage Stages & Compliance Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50 transition-all duration-300" onClick={() => setSelectedOrder(null)}>
          <div className="w-full md:w-[850px] h-full bg-white shadow-2xl flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* Left Side: Stage Timeline Controls & File Uploads (Main Area) */}
            <div className="flex-1 flex flex-col h-full border-r border-[#ebebeb] overflow-y-auto">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <span className="text-[10px] bg-[#ffdad6] text-[#ba1a1a] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    SAMPLE STAGE TRACKER
                  </span>
                  <h2 className="text-lg font-bold text-[#111111] mt-1">{selectedOrder.id} Details</h2>
                  <p className="text-xs text-[#9e9e9e] mt-0.5">{selectedOrder.product} for {selectedOrder.buyer}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="md:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 5-Stage Stepper Selectors */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Production Stage</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(STAGE_CONFIG).map(([name, conf]) => {
                      const stageObj = stages.find(s => s.stage_name === name)
                      const isSelected = selectedStageName === name
                      let statusColor = 'border-gray-200 text-gray-400'
                      if (stageObj?.status === 'completed') statusColor = 'bg-emerald-50 border-emerald-500 text-emerald-600'
                      else if (stageObj?.status === 'in_progress') statusColor = 'bg-blue-50 border-blue-500 text-blue-600'
                      else if (stageObj?.status === 'flagged') statusColor = 'bg-red-50 border-red-500 text-red-600'

                      return (
                        <button
                          key={name}
                          onClick={() => handleStageSelect(name)}
                          className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                            isSelected ? 'ring-2 ring-[#0f00da] border-[#0f00da]' : ''
                          } ${statusColor}`}
                        >
                          <span className="material-symbols-outlined text-[20px] mb-1">{conf.icon}</span>
                          <span className="text-[10px] font-bold tracking-tight leading-tight block">{conf.label}</span>
                          <span className="text-[9px] uppercase font-bold mt-1 opacity-70">
                            {stageObj?.status || 'pending'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Stage Info & Form */}
                <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#0f00da]">
                        {STAGE_CONFIG[selectedStageName].icon}
                      </span>
                      {STAGE_CONFIG[selectedStageName].label} Stage
                    </span>
                    <span className="text-xs text-gray-400 uppercase font-bold">UPDATED BY SUPPLIER</span>
                  </div>

                  <form onSubmit={handleSaveStage} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Stage Status</label>
                        <select
                          value={stageStatus}
                          onChange={e => setStageStatus(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="flagged">Flagged / Issue</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Progress Notes / Remarks</label>
                      <textarea
                        value={stageNotes}
                        onChange={e => setStageNotes(e.target.value)}
                        placeholder="State technical metrics, processing details, QA pass criteria..."
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingStage}
                      className="bg-[#0f00da] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#2d2dff] transition-all shadow-md flex items-center justify-center gap-1 disabled:bg-gray-300"
                    >
                      {updatingStage ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Save Stage Progress</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Stage Compliance Document Upload */}
                <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-gray-200/60 pb-3">
                    <span className="material-symbols-outlined text-[18px] text-[#0f00da]">upload_file</span>
                    <span className="text-sm font-bold text-gray-800">Upload Stage Documents</span>
                  </div>

                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Document Type</label>
                      <select
                        value={selectedDocType}
                        onChange={e => setSelectedDocType(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm"
                      >
                        {STAGE_CONFIG[selectedStageName].docs.map(docName => (
                          <option key={docName} value={docName}>{docName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border border-dashed border-gray-300 hover:border-[#0f00da] transition-all rounded-xl p-4 text-center relative cursor-pointer group shadow-sm bg-white">
                      <span className="material-symbols-outlined text-[32px] text-gray-400 group-hover:text-[#0f00da] transition-all">cloud_upload</span>
                      <p className="text-xs font-bold text-gray-700 mt-1.5">Select document file</p>
                      <p className="text-[10px] text-[#9e9e9e] mt-0.5">PDF, PNG, JPG, CSV up to 10MB</p>
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={e => setSelectedFile(e.target.files[0])}
                      />

                      {selectedFile && (
                        <div className="mt-3 flex items-center justify-center gap-1.5 bg-[#f0f1ff] border border-[#e1e0ff] rounded-lg px-2.5 py-1.5 text-xs text-[#0f00da] font-semibold">
                          <span className="material-symbols-outlined text-[14px]">description</span>
                          <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-gray-400 hover:text-gray-600 flex items-center"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingDoc || !selectedFile}
                      className="bg-[#0f00da] text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-[#2d2dff] transition-all shadow-md flex items-center justify-center gap-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {uploadingDoc ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Uploading File...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">publish</span>
                          <span>Upload compliance Document</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Side: Document Checklist Sidebar (Large Screens) */}
            <div className="w-full md:w-[320px] bg-gray-50/50 border-t md:border-t-0 border-[#ebebeb] flex flex-col h-full overflow-y-auto">
              <div className="px-6 py-5 border-b border-[#ebebeb] bg-white flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Compliance Checklist</h3>
                <button onClick={() => setSelectedOrder(null)} className="hidden md:flex w-8 h-8 rounded-full hover:bg-gray-100 items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Progress bar */}
                <div className="bg-white border border-[#ebebeb] rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1.5">
                    <span>DOCUMENT COMPLIANCE</span>
                    <span className="text-[#0f00da]">{checklistProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0f00da] transition-all duration-300" style={{ width: `${checklistProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">{uploadedCount} of {ALL_DOC_TYPES.length} docs uploaded</p>
                </div>

                {/* Checklist items */}
                <div className="space-y-2">
                  {checklist.map(item => (
                    <div
                      key={item.name}
                      className="bg-white border border-[#ebebeb] rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate" title={item.name}>{item.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">{item.stage}</p>
                      </div>

                      {item.uploaded ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center flex-shrink-0"
                          title="Download document"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </a>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0" title="Missing">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
