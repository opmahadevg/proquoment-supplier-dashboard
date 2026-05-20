import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../context/DashboardContext'
import { confirmQCReady, updateMilestone, uploadOrderDocument, updateBulkOrderMilestones } from '../lib/procurementApi'

export default function BulkOrders() {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const { bulkOrders } = useDashboard()
  const navigate = useNavigate()

  // Form states for milestone updating
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [predefinedSelect, setPredefinedSelect] = useState('Raw Materials Sourced')

  const tabs = ['All', 'Pending Confirmation', 'In Production', 'Shipped', 'Delivered']
  const filtered = bulkOrders.filter(o => activeTab === 'All' || o.status === activeTab)

  const PREDEFINED_MILESTONES = [
    'Raw Materials Sourced',
    'Production Started',
    'QC Ready',
    'QC Approved',
    'Shipped',
    'Delivered',
    'Custom Milestone...'
  ]

  // Toggle existing milestones
  const handleToggleMilestone = async (index) => {
    try {
      const updatedMilestones = [...selectedOrder.milestones]
      const wasDone = updatedMilestones[index].done
      updatedMilestones[index] = {
        ...updatedMilestones[index],
        done: !wasDone,
        completedAt: !wasDone ? new Date().toISOString() : null
      }

      // Calculate progress based on done count
      const completedCount = updatedMilestones.filter(m => m.done).length
      const progress = Math.round((completedCount / updatedMilestones.length) * 100)
      
      let overallStatus = selectedOrder.status
      if (progress === 100) {
        overallStatus = 'Delivered'
      } else if (progress > 70) {
        overallStatus = 'Shipped'
      } else if (progress > 10) {
        overallStatus = 'In Production'
      }

      await updateBulkOrderMilestones(selectedOrder.id, updatedMilestones, progress, overallStatus)
      
      // Post to unified milestones history & notify admin
      await updateMilestone({
        orderId: selectedOrder.id,
        title: `${updatedMilestones[index].label}: ${!wasDone ? 'Completed' : 'Reopened'}`,
        description: `Supplier updated progress. Total progress: ${progress}%`,
        status: !wasDone ? 'completed' : 'pending'
      })

      // Update selectedOrder local state
      setSelectedOrder(prev => ({
        ...prev,
        milestones: updatedMilestones,
        progress,
        status: overallStatus
      }))

    } catch (err) {
      console.error(err)
      alert('Failed to toggle milestone state: ' + err.message)
    }
  }

  // Add custom milestone + upload attachment
  const handleAddMilestoneSubmit = async (e) => {
    e.preventDefault()
    const finalTitle = predefinedSelect === 'Custom Milestone...' ? newTitle : predefinedSelect
    if (!finalTitle.trim()) {
      alert('Please enter a milestone title')
      return
    }

    setIsUpdating(true)
    try {
      let attachment = null
      if (selectedFile) {
        attachment = await uploadOrderDocument(selectedOrder.id, selectedFile)
      }

      const newMilestone = {
        label: finalTitle.trim(),
        done: true,
        completedAt: new Date().toISOString(),
        description: newDesc.trim(),
        ...(attachment && { docUrl: attachment.url, docName: attachment.name })
      }

      const updatedMilestones = [...selectedOrder.milestones, newMilestone]
      const completedCount = updatedMilestones.filter(m => m.done).length
      const progress = Math.round((completedCount / updatedMilestones.length) * 100)

      let overallStatus = selectedOrder.status
      if (progress === 100) {
        overallStatus = 'Delivered'
      } else if (progress > 70) {
        overallStatus = 'Shipped'
      } else if (progress > 10) {
        overallStatus = 'In Production'
      }

      await updateBulkOrderMilestones(selectedOrder.id, updatedMilestones, progress, overallStatus)

      // Post unified milestone update for admin notification
      await updateMilestone({
        orderId: selectedOrder.id,
        title: finalTitle.trim(),
        description: `${newDesc.trim()}${attachment ? ` (Document: ${attachment.name})` : ''}`,
        status: 'completed'
      })

      // Sync local drawer view state
      setSelectedOrder(prev => ({
        ...prev,
        milestones: updatedMilestones,
        progress,
        status: overallStatus
      }))

      // Reset form states
      setNewTitle('')
      setNewDesc('')
      setSelectedFile(null)
      setShowAddForm(false)

    } catch (err) {
      console.error(err)
      alert('Failed to post milestone update: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 bg-[#fafafa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] tracking-wider uppercase bg-[#e1e0ff] text-[#0f00da] px-2.5 py-1 rounded-full font-bold">
              Bulk Production Dashboard
            </span>
            <span className="text-[10px] tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
              QC Managed Flow
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Bulk Orders</h1>
          <p className="text-sm text-[#9e9e9e]">Oversee full-scale production batches, track milestone events, and submit compliance paperwork.</p>
        </div>
        <button onClick={() => navigate('/matched-rfqs')} className="flex items-center gap-2 bg-[#0f00da] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#2d2dff] transition-all shadow-md hover:translate-y-[-1px]">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Browse RFQs
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: bulkOrders.length, icon: 'local_shipping', desc: 'Active batches' },
          { label: 'In Production', value: bulkOrders.filter(o => o.status === 'In Production').length, icon: 'autorenew', desc: 'Live assembly' },
          { label: 'Completed', value: bulkOrders.filter(o => o.status === 'Delivered').length, icon: 'check_circle', desc: 'Fully delivered' },
          { label: 'Pipeline Value', value: `$${(bulkOrders.reduce((sum, o) => sum + (parseFloat(o.orderValue?.replace(/[^0-9.]/g, '')) || 0), 0) / 1000).toFixed(1)}k`, icon: 'payments', desc: 'Total contract value' },
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

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#f0f0f0] p-1 rounded-full w-fit mb-6 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-[#0f00da] shadow-sm' : 'text-[#555555] hover:text-[#000]'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#ebebeb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-gray-300">local_shipping</span>
            <p className="text-sm font-semibold text-[#111111] mt-2">No bulk orders found</p>
            <p className="text-xs text-[#9e9e9e] mt-1">There are no orders matching the selected status.</p>
          </div>
        ) : (
          filtered.map(order => (
            <div key={order.id} className="bg-white border border-[#ebebeb] rounded-2xl overflow-hidden hover:border-[#0f00da] transition-all duration-200 shadow-sm hover:shadow-md">
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#f0f1ff] text-[#0f00da] text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-sm border border-[#e1e0ff]">
                      {order.buyerLogo || 'B'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 tracking-wider">BULK ASSEMBLY</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-semibold text-[#0f00da]">{order.id}</span>
                      </div>
                      <p className="text-base font-bold text-[#111111] mt-0.5">{order.product}</p>
                      <p className="text-xs text-[#555555] mt-0.5">{order.buyer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                      order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      order.status === 'Shipped' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                      'bg-indigo-50 text-[#0f00da] border-[#e1e0ff]'
                    }`}>{order.status}</span>
                    <span className="text-base font-bold text-gray-900">{order.orderValue}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Production Completion</span>
                    <span className="text-xs font-bold text-[#0f00da]">{order.progress}% Complete</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#3d30ff] to-[#0f00da] rounded-full transition-all duration-300" style={{ width: `${order.progress}%` }}></div>
                  </div>
                </div>

                {/* Milestones Horizontal Row */}
                <div className="grid grid-cols-5 gap-2 mb-5">
                  {order.milestones.map((m, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                        m.done ? 'bg-[#0f00da] border-[#0f00da] text-white shadow-sm' : 'bg-white border-gray-200 text-gray-300'
                      }`}>
                        {m.done ? (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        ) : (
                          <span className="text-[11px] font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-[10px] text-center font-medium leading-tight max-w-[70px] truncate ${
                        m.done ? 'text-gray-900 font-semibold' : 'text-[#9e9e9e]'
                      }`} title={m.label}>{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Details */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-3">
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Placed: {order.placed}</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">local_shipping</span> Target: {order.delivery}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate('/messages')} className="border border-[#ebebeb] text-[#555555] px-4 py-2 rounded-full text-xs font-semibold hover:border-[#0f00da] hover:text-[#0f00da] transition-all bg-white">Message Buyer</button>
                    <button onClick={() => {
                      setSelectedOrder(order)
                      setShowAddForm(false)
                    }} className="bg-[#0f00da] text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-[#2d2dff] transition-all shadow-sm">Manage Timeline</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details & Milestone Manager Slide Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50 transition-all duration-300" onClick={() => setSelectedOrder(null)}>
          <div className="w-full sm:w-[420px] h-full bg-white overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] bg-[#e1e0ff] text-[#0f00da] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Timeline Manager</span>
                <h2 className="text-lg font-bold text-[#111111] mt-0.5">Order {selectedOrder.id}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
                <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 space-y-6 overflow-y-auto">
              {/* Product Info Card */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-[#9e9e9e] font-bold uppercase block tracking-wider">PRODUCT</span>
                    <span className="text-sm font-semibold text-[#111111]">{selectedOrder.product}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#9e9e9e] font-bold uppercase block tracking-wider">VALUE</span>
                    <span className="text-sm font-bold text-gray-900">{selectedOrder.orderValue}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60 text-xs">
                  <div>
                    <span className="text-[#9e9e9e] block font-medium">Buyer</span>
                    <span className="font-semibold text-gray-800">{selectedOrder.buyer}</span>
                  </div>
                  <div>
                    <span className="text-[#9e9e9e] block font-medium">Expected Arrival</span>
                    <span className="font-semibold text-gray-800">{selectedOrder.delivery}</span>
                  </div>
                </div>
              </div>

              {/* Progress Panel */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Status</span>
                  <span className="text-xs font-bold text-[#0f00da]">{selectedOrder.progress}% Completed</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-[#0f00da] rounded-full transition-all duration-300" style={{ width: `${selectedOrder.progress}%` }}></div>
                </div>
              </div>

              {/* Active Milestone Form Toggle */}
              {!showAddForm ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Milestone Checklist</h3>
                    <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 text-xs text-[#0f00da] font-bold hover:underline">
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      New Milestone
                    </button>
                  </div>

                  {/* Interactive Checklist list */}
                  <div className="space-y-3 bg-white border border-gray-100 rounded-xl p-3 shadow-inner">
                    {selectedOrder.milestones.map((m, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100">
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleToggleMilestone(i)} className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all mt-0.5 ${
                            m.done ? 'bg-[#0f00da] border-[#0f00da] text-white' : 'bg-white border-gray-300 hover:border-[#0f00da]'
                          }`}>
                            {m.done && <span className="material-symbols-outlined text-[14px]">check</span>}
                          </button>
                          <div>
                            <p className={`text-sm font-semibold leading-tight ${m.done ? 'text-gray-900' : 'text-gray-400 line-through decoration-gray-300'}`}>{m.label}</p>
                            {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                            {m.completedAt && (
                              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                Completed: {new Date(m.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Document Link Badge */}
                        {m.docUrl && (
                          <a href={m.docUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-md text-[10px] font-bold text-[#0f00da] hover:bg-blue-100/60 transition-colors">
                            <span className="material-symbols-outlined text-[12px]">description</span>
                            {m.docName || 'Document'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* New Milestone Form */
                <form onSubmit={handleAddMilestoneSubmit} className="space-y-4 bg-gray-50/70 border border-gray-200/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-3 mb-1">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#0f00da]">assignment_turned_in</span>
                      Post Milestone update
                    </span>
                    <button type="button" onClick={() => setShowAddForm(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Select Status Milestone</label>
                    <select value={predefinedSelect} onChange={e => setPredefinedSelect(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm">
                      {PREDEFINED_MILESTONES.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                  </div>

                  {predefinedSelect === 'Custom Milestone...' && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Custom Title</label>
                      <input type="text" placeholder="e.g. Raw Materials Sourced" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] shadow-sm font-medium" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Brief Description / Update Notes</label>
                    <textarea placeholder="e.g. SGS team inspected batch, reports uploaded." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] shadow-sm font-medium" />
                  </div>

                  {/* Document Uploader */}
                  <div className="bg-white border border-dashed border-gray-300 hover:border-[#0f00da] transition-all rounded-xl p-4 text-center relative cursor-pointer group shadow-sm">
                    <span className="material-symbols-outlined text-[32px] text-gray-400 group-hover:text-[#0f00da] transition-all">cloud_upload</span>
                    <p className="text-xs font-bold text-gray-700 mt-1.5">Upload QC Certification or shipping slip</p>
                    <p className="text-[10px] text-[#9e9e9e] mt-0.5">Attach PNG, JPG, or PDF up to 10MB</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSelectedFile(e.target.files[0])} />
                    
                    {selectedFile && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 bg-[#f0f1ff] border border-[#e1e0ff] rounded-lg px-2.5 py-1.5 text-xs text-[#0f00da] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600 flex items-center">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isUpdating} className="w-full bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-bold hover:bg-[#2d2dff] transition-all shadow-md hover:translate-y-[-1px] disabled:bg-gray-300 disabled:translate-y-0 flex items-center justify-center gap-1.5">
                    {isUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Uploading & Syncing...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">publish</span>
                        <span>Post Milestone Update</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => navigate('/messages')} className="flex-1 border border-[#0f00da] text-[#0f00da] py-2.5 rounded-full text-sm font-semibold hover:bg-blue-50/50 transition-all text-center">Message Buyer</button>
                <button onClick={() => {
                  confirmQCReady(selectedOrder.id, 'Production complete — Goods ready for inspections')
                    .then(() => alert(`QC Ready notification dispatched to Admin for order ${selectedOrder.id}`))
                    .catch(() => alert('Failed to trigger QC update'))
                }} className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-semibold hover:bg-[#2d2dff] transition-all text-center shadow-sm">Trigger QC Inspection</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
