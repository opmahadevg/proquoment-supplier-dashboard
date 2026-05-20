import { useState } from 'react'
import { useDashboard } from '../context/DashboardContext'
import { confirmQCReady, uploadOrderDocument, updateSampleOrderStatus } from '../lib/procurementApi'

export default function SampleOrders() {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Upload/Status Form states
  const [isUpdating, setIsUpdating] = useState(false)
  const [statusSelect, setStatusSelect] = useState('Pending')
  const [selectedFile, setSelectedFile] = useState(null)
  const [docType, setDocType] = useState('Certificate of Conformance')

  // Global upload modal states
  const [globalOrderId, setGlobalOrderId] = useState('')
  const [globalFile, setGlobalFile] = useState(null)
  const [globalDocType, setGlobalDocType] = useState('Certificate of Conformance')

  const { sampleOrders, addToast } = useDashboard()
  const tabs = ['All', 'Pending', 'In Transit', 'Delivered']

  const filtered = sampleOrders.filter(o =>
    activeTab === 'All' || o.status === activeTab
  )

  // Handle single order detail status and doc update
  const handleUpdateOrder = async (e) => {
    e.preventDefault()
    if (!selectedOrder) return
    setIsUpdating(true)

    try {
      let attachment = null
      if (selectedFile) {
        attachment = await uploadOrderDocument(selectedOrder.id, selectedFile)
      }

      await updateSampleOrderStatus(
        selectedOrder.id, 
        statusSelect, 
        attachment ? attachment.url : selectedOrder.docUrl, 
        attachment ? `${docType}: ${attachment.name}` : selectedOrder.docName
      )

      if (addToast) {
        addToast(`Sample order ${selectedOrder.id} status updated to ${statusSelect}`, 'success')
      } else {
        alert(`Status updated successfully to ${statusSelect}`)
      }

      // Sync local drawer view state
      setSelectedOrder(prev => ({
        ...prev,
        status: statusSelect,
        docUrl: attachment ? attachment.url : prev.docUrl,
        docName: attachment ? `${docType}: ${attachment.name}` : prev.docName,
        delivered: statusSelect === 'Delivered' ? new Date().toLocaleDateString() : prev.delivered
      }))

      // Reset form file
      setSelectedFile(null)
    } catch (err) {
      console.error(err)
      alert('Failed to update sample order: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle global modal doc upload
  const handleGlobalUpload = async (e) => {
    e.preventDefault()
    const targetId = globalOrderId || (sampleOrders[0]?.id)
    if (!targetId) {
      alert('No sample order selected')
      return
    }
    if (!globalFile) {
      alert('Please select a file to upload')
      return
    }

    setIsUpdating(true)
    try {
      const order = sampleOrders.find(o => o.id === targetId)
      const attachment = await uploadOrderDocument(targetId, globalFile)

      await updateSampleOrderStatus(
        targetId,
        order.status,
        attachment.url,
        `${globalDocType}: ${attachment.name}`
      )

      if (addToast) {
        addToast(`Document uploaded successfully for Sample Order ${targetId}`, 'success')
      } else {
        alert('Document uploaded successfully!')
      }

      // Reset
      setGlobalFile(null)
      setShowUploadModal(false)
    } catch (err) {
      console.error(err)
      alert('Failed to upload document: ' + err.message)
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
            <span className="text-[10px] tracking-wider uppercase bg-[#ffdad6] text-[#ba1a1a] px-2.5 py-1 rounded-full font-bold">
              R&D SPECIMEN EVALUATION
            </span>
            <span className="text-[10px] tracking-wider uppercase bg-[#e1e0ff] text-[#0f00da] px-2.5 py-1 rounded-full font-bold">
              SAMPLE FLOW
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Sample Orders</h1>
          <p className="text-sm text-[#9e9e9e]">Process prototype requests, manage fast-tracked shipping, and log feedback from buyer engineers.</p>
        </div>
        <button onClick={() => {
          if (sampleOrders.length > 0) {
            setGlobalOrderId(sampleOrders[0].id)
          }
          setShowUploadModal(true)
        }} className="flex items-center gap-2 bg-[#0f00da] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#2d2dff] transition-all shadow-md hover:translate-y-[-1px]">
          <span className="material-symbols-outlined text-[18px]">upload</span>
          Upload Compliance Docs
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Prototypes', value: sampleOrders.length, icon: 'science', desc: 'R&D requests' },
          { label: 'Awaiting Ship', value: sampleOrders.filter(o => o.status === 'Pending').length, icon: 'hourglass_empty', desc: 'Pending courier' },
          { label: 'In Transit', value: sampleOrders.filter(o => o.status === 'In Transit').length, icon: 'local_shipping', desc: 'Out for delivery' },
          { label: 'Inspected', value: sampleOrders.filter(o => o.status === 'Delivered').length, icon: 'check_circle', desc: 'Delivered to buyers' },
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
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-[#0f00da] shadow-sm' : 'text-[#555555] hover:text-[#000]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[#f3f3f3] bg-[#fafafa]">
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Buyer</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Requested</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Delivered/ETA</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance docs</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-sm font-semibold text-gray-400 bg-white">
                  <span className="material-symbols-outlined text-[48px] text-gray-300 block mb-2">science</span>
                  No sample orders found
                </td>
              </tr>
            ) : (
              filtered.map(order => (
                <tr key={order.id} className="border-t border-[#f3f3f3] hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm font-bold text-[#0f00da]">{order.id}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-800">{order.product}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#f0f1ff] text-[#0f00da] text-xs font-bold flex items-center justify-center border border-[#e1e0ff]">
                        {order.buyerLogo || 'B'}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{order.buyer}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-600">{order.quantity}</td>
                  <td className="px-5 py-4 text-sm text-gray-400">{order.requested}</td>
                  <td className="px-5 py-4 text-sm text-gray-400">{order.delivered || '—'}</td>
                  <td className="px-5 py-4">
                    {order.docUrl ? (
                      <a href={order.docUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#0f00da] font-bold hover:underline bg-[#f0f1ff] border border-[#e1e0ff] px-2.5 py-1 rounded-lg">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        View Report
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      order.status === 'In Transit' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>{order.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => {
                        setSelectedOrder(order)
                        setStatusSelect(order.status)
                      }}
                      className="border border-[#ebebeb] text-[#0f00da] px-3.5 py-1.5 rounded-full text-xs font-semibold hover:border-[#0f00da] hover:bg-blue-50/40 transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Drawer with Status Updater Form */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50 transition-all duration-300" onClick={() => setSelectedOrder(null)}>
          <div className="w-full sm:w-[400px] h-full bg-white overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] bg-[#ffdad6] text-[#ba1a1a] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Prototype Evaluator
                </span>
                <h2 className="text-lg font-bold text-[#111111] mt-1">{selectedOrder.id} Details</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
                <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6 overflow-y-auto">
              {/* Info panel */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">R&D Product</span>
                  <span className="text-sm font-semibold text-[#111111]">{selectedOrder.product}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-200/60 pt-2.5">
                  <div>
                    <span className="text-gray-400 block font-medium">Buyer Client</span>
                    <span className="font-semibold text-gray-800">{selectedOrder.buyer}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Requested Qty</span>
                    <span className="font-semibold text-gray-800">{selectedOrder.quantity}</span>
                  </div>
                </div>
              </div>

              {/* Status Updater Form */}
              <form onSubmit={handleUpdateOrder} className="space-y-4 bg-gray-50/70 border border-gray-200/60 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-gray-200/60 pb-3 mb-1">
                  <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">settings_backup_restore</span>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Update Sample Status</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Courier Status</label>
                  <select value={statusSelect} onChange={e => setStatusSelect(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm">
                    <option value="Pending">Pending Shipment</option>
                    <option value="In Transit">In Transit / Shipped</option>
                    <option value="Delivered">Delivered & Ready</option>
                  </select>
                </div>

                {/* Document Type Dropdown */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Document Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm">
                    <option value="Certificate of Conformance">Certificate of Conformance</option>
                    <option value="Test Report">Test Report</option>
                    <option value="Material Data Sheet">Material Data Sheet</option>
                    <option value="Shipping Invoice">Shipping Invoice</option>
                  </select>
                </div>

                {/* Document attachment slot */}
                <div className="bg-white border border-dashed border-gray-300 hover:border-[#0f00da] transition-all rounded-xl p-4 text-center relative cursor-pointer group shadow-sm">
                  <span className="material-symbols-outlined text-[32px] text-gray-400 group-hover:text-[#ba1a1a] transition-all">cloud_upload</span>
                  <p className="text-xs font-bold text-gray-700 mt-1.5">Upload new certificate/receipt</p>
                  <p className="text-[10px] text-[#9e9e9e] mt-0.5">Attach PDF, PNG, JPG up to 10MB</p>
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

                <button type="submit" disabled={isUpdating} className="w-full bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-bold hover:bg-[#2d2dff] transition-all shadow-md flex items-center justify-center gap-1.5 disabled:bg-gray-300">
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">publish</span>
                      <span>Update Status & Docs</span>
                    </>
                  )}
                </button>
              </form>

              {/* Active Compliance Doc View */}
              {selectedOrder.docUrl && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-[20px] text-[#0f00da]">description</span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">ACTIVE DOCUMENT</span>
                      <span className="text-xs font-semibold text-gray-800 truncate block">{selectedOrder.docName || 'Certificate'}</span>
                    </div>
                  </div>
                  <a href={selectedOrder.docUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-blue-200 text-[#0f00da] hover:bg-[#f0f1ff] transition-all shadow-sm flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </a>
                </div>
              )}

              {/* Trigger QC Ready Notification */}
              {selectedOrder.status === 'Delivered' && (
                <div className="pt-2">
                  <button onClick={() => {
                    confirmQCReady(selectedOrder.id, `Sample prototype ${selectedOrder.product} delivered and ready for engineering QC.`)
                      .then(() => alert(`Admin notified that QC is ready for Sample Order ${selectedOrder.id}`))
                      .catch(() => alert('Failed to dispatch notification'))
                  }} className="w-full bg-emerald-600 text-white py-2.5 rounded-full text-sm font-bold hover:bg-emerald-700 transition-all text-center shadow-md">
                    Trigger QC Ready Notification
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Upload Docs Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#ebebeb]">
              <h2 className="text-base font-bold text-[#111111] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0f00da]">cloud_upload</span>
                Upload Compliance Docs
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
              </button>
            </div>
            <form onSubmit={handleGlobalUpload} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Related Sample Order</label>
                <select value={globalOrderId} onChange={e => setGlobalOrderId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm">
                  {sampleOrders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.product}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Document Type</label>
                <select value={globalDocType} onChange={e => setGlobalDocType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white font-medium text-gray-800 shadow-sm">
                  <option value="Certificate of Conformance">Certificate of Conformance</option>
                  <option value="Test Report">Test Report</option>
                  <option value="Material Data Sheet">Material Data Sheet</option>
                  <option value="Shipping Invoice">Shipping Invoice</option>
                </select>
              </div>

              {/* Drag/Drop area */}
              <div className="bg-gray-50 border border-dashed border-gray-300 hover:border-[#0f00da] transition-all rounded-xl p-6 text-center relative cursor-pointer group shadow-inner">
                <span className="material-symbols-outlined text-[36px] text-gray-400 group-hover:text-[#0f00da]">cloud_upload</span>
                <p className="text-xs font-bold text-gray-700 mt-1">Select or drop file here</p>
                <p className="text-[10px] text-[#9e9e9e] mt-0.5">PDF, PNG, JPG up to 10MB</p>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setGlobalFile(e.target.files[0])} />

                {globalFile && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 bg-[#f0f1ff] border border-[#e1e0ff] rounded-lg px-2.5 py-1.5 text-xs text-[#0f00da] font-semibold">
                    <span className="material-symbols-outlined text-[14px]">description</span>
                    <span className="truncate max-w-[200px]">{globalFile.name}</span>
                    <button type="button" onClick={() => setGlobalFile(null)} className="text-gray-400 hover:text-gray-600 flex items-center">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 border border-[#ebebeb] text-gray-500 py-2.5 rounded-full text-xs font-bold hover:bg-[#f5f5f5]">Cancel</button>
                <button type="submit" disabled={isUpdating} className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-xs font-bold hover:bg-[#2d2dff] shadow-md flex items-center justify-center gap-1">
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload Documents</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
