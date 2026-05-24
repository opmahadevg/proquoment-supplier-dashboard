import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../context/DashboardContext'
import { useAuth } from '../context/AuthContext'
import { getQuotesForRFQ } from '../lib/procurementApi'


const STATIC_BIDS = [
  {
    id: 'BID-2024-001',
    rfqId: 'RFQ-2024-001',
    title: 'Steel Pipes — Grade A',
    buyer: 'Buyer #037092c1',
    buyerLogo: 'B#',
    submitted: 'Nov 28, 2024',
    expires: 'Dec 15, 2024',
    myBid: '$15,500',
    status: 'Pending',
    statusColor: 'bg-[#ffdad6] text-[#ba1a1a]',
    quantity: '500 units',
    deliveryDays: 21,
    rank: 2,
    totalBids: 5,
  },
  {
    id: 'BID-2024-002',
    rfqId: 'RFQ-2024-003',
    title: 'Hydraulic Fittings Assortment',
    buyer: 'Buyer #2e089254',
    buyerLogo: 'B#',
    submitted: 'Nov 25, 2024',
    expires: 'Jan 5, 2025',
    myBid: '$7,200',
    status: 'Under Review',
    statusColor: 'bg-[#e1e0ff] text-[#0f00da]',
    quantity: '1,000 units',
    deliveryDays: 14,
    rank: 1,
    totalBids: 4,
  },
  {
    id: 'BID-2024-003',
    rfqId: 'RFQ-2023-045',
    title: 'Gate Valves DN80',
    buyer: 'Buyer #1c9057b8',
    buyerLogo: 'B#',
    submitted: 'Nov 10, 2024',
    expires: 'Nov 30, 2024',
    myBid: '$22,000',
    status: 'Won',
    statusColor: 'bg-[#e1e0ff] text-[#0f00da]',
    quantity: '150 units',
    deliveryDays: 28,
    rank: 1,
    totalBids: 6,
  },
  {
    id: 'BID-2024-004',
    rfqId: 'RFQ-2023-038',
    title: 'PVC Pipes Bundle',
    buyer: 'Buyer #9e8a7c6b',
    buyerLogo: 'B#',
    submitted: 'Oct 20, 2024',
    expires: 'Nov 10, 2024',
    myBid: '$9,800',
    status: 'Lost',
    statusColor: 'bg-[#e8e8e8] text-[#9e9e9e]',
    quantity: '800 units',
    deliveryDays: 18,
    rank: 3,
    totalBids: 7,
  },
]

const tabs = ['All', 'Active', 'Won', 'Lost', 'Expired']

export default function MyBids() {
  const [activeTab, setActiveTab]     = useState('All')
  const [selectedBid, setSelectedBid] = useState(null)
  const [submittedQuotes, setSubmittedQuotes] = useState([]) // Phase 2: quotes from DB
  const { bids, rfqList } = useDashboard()
  const { isDemo } = useAuth()
  const navigate  = useNavigate()

  // Fetch recently submitted quotes on mount
  useEffect(() => {
    if (!isDemo) return
    const rfqIds = [...new Set(STATIC_BIDS.map(b => b.rfqId))]
    Promise.allSettled(rfqIds.map(id => getQuotesForRFQ(id))).then(results => {
      const allQuotes = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
      if (allQuotes.length) setSubmittedQuotes(allQuotes)
    })
  }, [isDemo])

  // Merge DB bids with any live-submitted quotes (quotes take precedence for same rfqId)
  const quotedRfqIds = new Set(submittedQuotes.map(q => q.rfqId))
  const mergedBids = isDemo
    ? [
        ...submittedQuotes.map(q => ({
          id:           q.id,
          rfqId:        q.rfqId,
          title:        q.rfqId,   // will be enriched below if title known
          buyer:        q.supplierName || '—',
          buyerLogo:    '??',
          submitted:    q.createdAt ? new Date(q.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—',
          expires:      q.validUntil || '—',
          myBid:        `$${Number(q.totalValue || q.unitPrice * q.moq).toLocaleString(undefined,{minimumFractionDigits:2})}`,
          status:       'Pending',
          statusColor:  'bg-[#ffdad6] text-[#ba1a1a]',
          quantity:     `${(q.moq || 0).toLocaleString()} pcs`,
          deliveryDays: q.leadTimeDays,
          rank: null, totalBids: null,
          // Phase 2 extra fields
          unitPrice:    q.unitPrice,
          moq:          q.moq,
          leadTimeDays: q.leadTimeDays,
          paymentTerms: q.paymentTerms,
          isQuote:      true,
        })),
        ...bids.filter(b => !quotedRfqIds.has(b.rfqId)),
      ]
    : bids.map(q => {
        const matchingRFQ = rfqList.find(r => r.id === q.rfq_id)
        const displayTitle = matchingRFQ ? matchingRFQ.title : `RFQ (${q.rfq_id})`
        const displayQty = matchingRFQ ? matchingRFQ.quantity : `${q.moq} units`
        
        let displayStatus = 'Pending'
        let color = 'bg-[#ffdad6] text-[#ba1a1a]'
        if (q.status === 'won' || q.status === 'accepted') {
          displayStatus = 'Won'
          color = 'bg-[#e8f5e9] text-[#2e7d32]'
        } else if (q.status === 'lost' || q.status === 'rejected') {
          displayStatus = 'Lost'
          color = 'bg-[#e8e8e8] text-[#9e9e9e]'
        } else if (q.status === 'under_review') {
          displayStatus = 'Under Review'
          color = 'bg-[#e1e0ff] text-[#0f00da]'
        }

        return {
          id:           q.id,
          rfqId:        q.rfq_id,
          title:        displayTitle,
          buyer:        matchingRFQ ? matchingRFQ.buyer : 'Verified Buyer',
          buyerLogo:    matchingRFQ ? matchingRFQ.buyerLogo : 'VB',
          submitted:    q.created_at ? new Date(q.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—',
          expires:      q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—',
          myBid:        `$${Number(q.total_value || q.unit_price * q.moq).toLocaleString(undefined,{minimumFractionDigits:2})}`,
          status:       displayStatus,
          statusColor:  color,
          quantity:     displayQty,
          deliveryDays: q.lead_time_days || 30,
          rank: 1, 
          totalBids: 1,
          unitPrice:    q.unit_price,
          moq:          q.moq,
          leadTimeDays: q.lead_time_days,
          paymentTerms: q.payment_terms,
          isQuote:      true,
        }
      })

  const filteredBids = mergedBids.filter(b => {
    if (activeTab === 'All')    return true
    if (activeTab === 'Active') return ['Pending', 'Under Review'].includes(b.status)
    return b.status === activeTab
  })

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">My Bids</h1>
          <p className="text-sm text-[#9e9e9e] mt-0.5">Track and manage all your submitted bids</p>
        </div>
        <button onClick={() => navigate('/matched-rfqs')} className="flex items-center gap-2 bg-[#0f00da] text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Bid
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Total Bids', value: '12', icon: 'gavel', color: 'text-[#0f00da]' },
          { label: 'Active', value: '5', icon: 'pending', color: 'text-[#0f00da]' },
          { label: 'Won', value: '4', icon: 'emoji_events', color: 'text-[#0f00da]' },
          { label: 'Win Rate', value: '33%', icon: 'trending_up', color: 'text-[#0f00da]' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-[#ebebeb] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-[18px] ${c.color}`}>{c.icon}</span>
              <span className="text-xs text-[#9e9e9e]">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#111111]">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f5f5f5] p-1 rounded-full w-fit mb-5">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === tab ? 'bg-white text-[#0f00da] shadow-sm' : 'text-[#9e9e9e] hover:text-[#555555]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bids Table */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#f3f3f3] bg-white">
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">RFQ / Product</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">Buyer</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">My Bid</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">Submitted</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">Ranking</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[#9e9e9e]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBids.map(bid => (
              <tr key={bid.id} className="border-t border-[#f3f3f3] hover:bg-white cursor-pointer" onClick={() => setSelectedBid(bid === selectedBid ? null : bid)}>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-[#111111]">{bid.title}</p>
                  <p className="text-xs text-[#9e9e9e] mt-0.5">{bid.quantity}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#e1e0ff] text-[#0f00da] text-xs font-bold flex items-center justify-center">{bid.buyerLogo}</div>
                    <span className="text-sm text-[#555555]">{bid.buyer}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm font-semibold text-[#111111]">{bid.myBid}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-[#9e9e9e]">{bid.submitted}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-[#555555]">#{bid.rank} of {bid.totalBids}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${bid.statusColor}`}>{bid.status}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-[#0f00da] hover:underline font-medium" onClick={e => { e.stopPropagation(); navigate('/messages') }}>Message</button>
                    {['Pending', 'Under Review'].includes(bid.status) && (
                      <button className="text-xs text-[#ba1a1a] hover:underline font-medium" onClick={e => e.stopPropagation()}>Withdraw</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bid Detail Panel */}
      {selectedBid && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-end z-50" onClick={() => setSelectedBid(null)}>
          <div className="w-full sm:w-[420px] h-full bg-white overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#111111]">Bid Details</h2>
                <button onClick={() => setSelectedBid(null)} className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#9e9e9e] mb-1">Product / RFQ</p>
                  <p className="font-semibold text-[#111111]">{selectedBid.title}</p>
                  <p className="text-sm text-[#9e9e9e]">{selectedBid.rfqId}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#9e9e9e] mb-1">Buyer</p>
                    <p className="text-sm font-medium text-[#111111]">{selectedBid.buyer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9e9e9e] mb-1">Status</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${selectedBid.statusColor}`}>{selectedBid.status}</span>
                  </div>
                  <div>
                    <p className="text-xs text-[#9e9e9e] mb-1">Total Bid Value</p>
                    <p className="text-sm font-bold text-[#111111]">{selectedBid.myBid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9e9e9e] mb-1">Lead Time</p>
                    <p className="text-sm text-[#111111]">{selectedBid.deliveryDays} days</p>
                  </div>
                  {selectedBid.isQuote && (
                    <>
                      <div>
                        <p className="text-xs text-[#9e9e9e] mb-1">Unit Price</p>
                        <p className="text-sm font-semibold text-[#111111]">${Number(selectedBid.unitPrice).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9e9e9e] mb-1">MOQ</p>
                        <p className="text-sm text-[#111111]">{Number(selectedBid.moq).toLocaleString()} pcs</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-[#9e9e9e] mb-1">Payment Terms</p>
                        <p className="text-sm text-[#111111]">{selectedBid.paymentTerms}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-[#9e9e9e] mb-1">Submitted</p>
                    <p className="text-sm text-[#111111]">{selectedBid.submitted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9e9e9e] mb-1">Expires</p>
                    <p className="text-sm text-[#111111]">{selectedBid.expires || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#9e9e9e] mb-1">Ranking</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#f5f5f5] rounded-full h-2">
                      <div className="bg-[#0f00da] h-2 rounded-full" style={{ width: `${((selectedBid.totalBids - selectedBid.rank + 1) / selectedBid.totalBids) * 100}%` }}></div>
                    </div>
                    <span className="text-sm text-[#555555]">#{selectedBid.rank} of {selectedBid.totalBids}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => navigate('/messages')} className="flex-1 border border-[#0f00da] text-[#0f00da] py-2.5 rounded-full text-sm font-medium hover:bg-[#e1e0ff]">
                    Message Buyer
                  </button>
                  <button onClick={() => navigate('/quote-submission')} className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff]">
                    Revise Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
