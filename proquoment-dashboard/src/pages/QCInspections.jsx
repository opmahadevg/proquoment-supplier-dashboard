import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const STATUS_COLORS = {
  scheduled:   'bg-sky-50 text-sky-700 border-sky-200',
  in_progress: 'bg-indigo-50 text-[#0f00da] border-[#e1e0ff]',
  passed:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  conditional: 'bg-amber-50 text-amber-700 border-amber-200',
  failed:      'bg-rose-50 text-rose-700 border-rose-200',
}

export default function QCInspections() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [inspections, setInspections] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedQC, setSelectedQC] = useState(null)

  const fetchInspectionsAndReports = async () => {
    try {
      if (!user?.company) return

      // Fetch inspections for this supplier
      const { data: inspData, error: inspErr } = await supabase
        .from('qc_inspections')
        .select('*')
        .eq('supplier', user.company)
        .order('scheduled_date', { ascending: false })

      if (inspErr) throw inspErr

      // Fetch reports
      const { data: repData, error: repErr } = await supabase
        .from('qc_reports')
        .select('*')

      if (repErr) throw repErr

      if (inspData) {
        setInspections(inspData.map(r => ({
          id: r.id,
          orderId: r.order_id,
          product: r.product,
          supplier: r.supplier,
          inspector: r.inspector,
          scheduledDate: r.scheduled_date,
          status: r.status,
          photos: r.photos || 0,
          reportUploaded: r.report_uploaded || false,
          category: r.category || 'General'
        })))
      }

      if (repData) {
        setReports(repData)
      }

    } catch (err) {
      console.error('Error loading supplier QC data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInspectionsAndReports()

    if (!user?.company) return

    // Set up real-time postgres listener
    const channel = supabase
      .channel('supplier-qc-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qc_inspections', filter: `supplier=eq.${user.company}` },
        () => {
          fetchInspectionsAndReports()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qc_reports' },
        () => {
          fetchInspectionsAndReports()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.company])

  // Filter logic
  const filtered = inspections.filter(qc => {
    const matchesSearch = qc.product.toLowerCase().includes(search.toLowerCase()) ||
                          qc.orderId.toLowerCase().includes(search.toLowerCase()) ||
                          qc.inspector.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || qc.status === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  // Stats calculation
  const stats = {
    total: inspections.length,
    upcoming: inspections.filter(q => q.status === 'scheduled' || q.status === 'in_progress').length,
    passed: inspections.filter(q => q.status === 'passed').length,
    failed: inspections.filter(q => q.status === 'failed' || q.status === 'conditional').length,
  }

  return (
    <div className="p-4 md:p-6 bg-[#fafafa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] tracking-wider uppercase bg-[#e1e0ff] text-[#0f00da] px-2.5 py-1 rounded-full font-bold">
              Quality Assurance
            </span>
            <span className="text-[10px] tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
              Live Real-Time Sync
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">QC Inspections</h1>
          <p className="text-sm text-[#9e9e9e]">Review quality inspection calendars, monitor buyer audits, and download official compliance reports.</p>
        </div>
        <button onClick={() => navigate('/bulk-orders')} className="flex items-center gap-2 border border-[#ebebeb] bg-white text-[#555555] px-5 py-2.5 rounded-full text-sm font-semibold hover:border-[#0f00da] hover:text-[#0f00da] transition-all shadow-sm">
          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          Bulk Orders
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Audits', value: stats.total, icon: 'fact_check', desc: 'Inspection orders' },
          { label: 'Upcoming', value: stats.upcoming, icon: 'schedule', desc: 'Pending schedule' },
          { label: 'Passed Batches', value: stats.passed, icon: 'verified', desc: 'Approved for export' },
          { label: 'Flags / Fails', value: stats.failed, icon: 'report', desc: 'Rework or warnings' },
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

      {/* Filter and Search controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        {/* Search */}
        <div className="flex items-center gap-2.5 bg-white border border-[#ebebeb] rounded-full px-4 py-2 flex-1 max-w-md shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-gray-400">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID, product, or inspector..."
            className="border-none outline-none bg-transparent text-sm w-full text-[#111111]"
          />
        </div>

        {/* Filter status */}
        <div className="flex gap-1.5 bg-[#f0f0f0] p-1 rounded-full overflow-x-auto no-scrollbar">
          {['All', 'Scheduled', 'In Progress', 'Passed', 'Failed'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab ? 'bg-white text-[#0f00da] shadow-sm' : 'text-[#555555] hover:text-[#000]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table / Cards */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#0f00da] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-[#9e9e9e]">Syncing quality pipeline...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-gray-300">fact_check</span>
            <p className="text-sm font-semibold text-[#111111] mt-2">No inspections found</p>
            <p className="text-xs text-[#9e9e9e] mt-1">There are no inspections matching your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#f3f3f3] bg-[#fafafa]">
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Audit Details</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Scheduled Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Auditor</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f3f3]">
                {filtered.map(qc => {
                  const matchedReport = reports.find(r => r.qc_inspection_id === qc.id)
                  
                  return (
                    <tr
                      key={qc.id}
                      onClick={() => setSelectedQC({ ...qc, report: matchedReport })}
                      className="hover:bg-[#fafafa] cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4.5">
                        <span className="text-[10px] font-bold text-[#0f00da] uppercase tracking-wider">{qc.id}</span>
                        <div className="text-sm font-bold text-[#111111] mt-0.5">{qc.product}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Order Ref: {qc.orderId}</div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-sm font-semibold text-gray-800">{new Date(qc.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-sm text-gray-600">{qc.inspector}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">{qc.category}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${STATUS_COLORS[qc.status] || 'bg-gray-100'}`}>
                          {qc.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4.5" onClick={e => e.stopPropagation()}>
                        {matchedReport && matchedReport.report_url ? (
                          <a
                            href={matchedReport.report_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            Download Report
                          </a>
                        ) : qc.reportUploaded ? (
                          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Report Uploaded
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Report Yet</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QC Detail Panel Drawer */}
      {selectedQC && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50 transition-all duration-300" onClick={() => setSelectedQC(null)}>
          <div className="w-full sm:w-[420px] h-full bg-white overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] bg-[#e1e0ff] text-[#0f00da] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Quality Audit Details</span>
                <h2 className="text-lg font-bold text-[#111111] mt-0.5">{selectedQC.id}</h2>
              </div>
              <button onClick={() => setSelectedQC(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
                <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 space-y-6">
              {/* Product and Order info */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-[10px] text-[#9e9e9e] font-bold uppercase block tracking-wider">PRODUCT IN AUDIT</span>
                  <span className="text-sm font-bold text-[#111111]">{selectedQC.product}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60 text-xs">
                  <div>
                    <span className="text-[#9e9e9e] block font-medium">Order Ref</span>
                    <span className="font-semibold text-gray-800">{selectedQC.orderId}</span>
                  </div>
                  <div>
                    <span className="text-[#9e9e9e] block font-medium">Category</span>
                    <span className="font-semibold text-gray-800">{selectedQC.category}</span>
                  </div>
                </div>
              </div>

              {/* Inspection Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Audit Schedule</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Scheduled Date</span>
                    <span className="font-bold text-gray-800">{new Date(selectedQC.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Auditor Agency</span>
                    <span className="font-semibold text-gray-700">{selectedQC.inspector}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Current Status</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${STATUS_COLORS[selectedQC.status] || 'bg-gray-100'}`}>
                      {selectedQC.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Audited Photos</span>
                    <span className="font-bold text-gray-800">{selectedQC.photos} Photos captured</span>
                  </div>
                </div>
              </div>

              {/* Report summary if available */}
              {selectedQC.report && (
                <div className="space-y-4 bg-emerald-50/40 border border-emerald-100 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">verified</span>
                    Inspector Findings
                  </h3>
                  <div className="text-xs text-gray-700 leading-relaxed font-medium">
                    {selectedQC.report.notes}
                  </div>
                  {selectedQC.report.report_url && (
                    <a
                      href={selectedQC.report.report_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-full transition-all text-center shadow-md hover:translate-y-[-1px]"
                    >
                      <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                      Download Official PDF
                    </a>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedQC(null)
                    navigate('/messages')
                  }}
                  className="w-full border border-[#0f00da] text-[#0f00da] py-2.5 rounded-full text-sm font-semibold hover:bg-blue-50/50 transition-all text-center"
                >
                  Contact Sourcing Manager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
