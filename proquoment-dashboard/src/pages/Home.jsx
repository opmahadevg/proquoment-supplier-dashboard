import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useSettings, formatAmount } from '../context/SettingsContext'
import { useDashboard } from '../context/DashboardContext'

const STATIC_ALERTS = [
  { id: 1, type: 'rfq', icon: 'request_quote', color: 'bg-[#e1e0ff] text-[#0f00da]', title: 'New RFQ Match', desc: '3 new RFQs match your product catalogue', time: '2 min ago', action: 'View RFQs', path: '/matched-rfqs' },
  { id: 2, type: 'bid', icon: 'gavel', color: 'bg-[#ffdad6] text-[#ba1a1a]', title: 'Bid Expiring Soon', desc: 'Your bid on "Industrial Valves" expires in 2 hours', time: '1 hour ago', action: 'View Bid', path: '/my-bids' },
  { id: 3, type: 'message', icon: 'chat', color: 'bg-[#e1e0ff] text-[#0f00da]', title: 'New Message', desc: 'Buyer #037092c1 sent you a message', time: '3 hours ago', action: 'Reply', path: '/messages' },
]

const recentActivity = [
  { id: 1, type: 'RFQ Match', desc: 'Steel Pipes — Grade A, 500 units', buyer: 'Buyer #037092c1', time: '10 min ago', status: 'New', statusColor: 'bg-[#e1e0ff] text-[#0f00da]' },
  { id: 2, type: 'Bid Submitted', desc: 'Industrial Valves DN50, 200 units', buyer: 'Buyer #b8c77d42', time: '2 hours ago', status: 'Pending', statusColor: 'bg-[#ffdad6] text-[#ba1a1a]' },
  { id: 3, type: 'Order Won', desc: 'Hydraulic Fittings, 1000 units', buyer: 'Buyer #2e089254', time: '1 day ago', status: 'Won', statusColor: 'bg-[#e1e0ff] text-[#0f00da]' },
  { id: 4, type: 'Sample Requested', desc: 'Stainless Steel Flanges', buyer: 'Buyer #1c9057b8', time: '2 days ago', status: 'Delivered', statusColor: 'bg-[#e8e8e8] text-[#555555]' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ── Animated counter hook ─────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0)
  const ref = useRef({ from: 0, to: target, start: null, raf: null })

  useEffect(() => {
    const entry = ref.current
    cancelAnimationFrame(entry.raf)
    entry.from = 0
    entry.to = target
    entry.start = null

    function tick(now) {
      if (!entry.start) entry.start = now
      const elapsed = now - entry.start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(entry.from + (entry.to - entry.from) * eased))
      if (progress < 1) entry.raf = requestAnimationFrame(tick)
    }
    entry.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(entry.raf)
  }, [target, duration])

  return display
}

/* ── Stat card with animated counter ──────────────────────── */
function StatCard({ label, rawValue, prefix, suffix, icon, change, positive, delay = 0 }) {
  const counted = useCountUp(rawValue, 900)
  const displayStr = `${prefix ?? ''}${counted.toLocaleString()}${suffix ?? ''}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white border border-[#ebebeb] rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[18px] text-[#0f00da]">{icon}</span>
        <span className="text-xs text-[#9e9e9e]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#111111] tabular-nums">{displayStr}</p>
      <p className={`text-xs mt-1 ${positive ? 'text-[#0f00da]' : 'text-[#ba1a1a]'}`}>{change}</p>
    </motion.div>
  )
}
export default function Home() {
  const [isNewUser] = useState(false)
  const { alertsList, setAlertsList, activityList, setActivityList, rfqList, bids, bulkOrders, sampleOrders } = useDashboard()
  const navigate = useNavigate()
  const { user, isDemo } = useAuth()
  const { settings } = useSettings()
  const currency = settings.preferences.currency

  const firstName = user?.name?.split(' ')[0] || 'there'

  if (isNewUser) {
    return <NewUserHome navigate={navigate} firstName={firstName} />
  }

  return (
    <ReturningUserHome
      navigate={navigate}
      firstName={firstName}
      currency={currency}
      alerts={alertsList}
      activity={activityList}
      isDemo={isDemo}
      rfqList={rfqList}
      bids={bids}
      bulkOrders={bulkOrders}
      sampleOrders={sampleOrders}
    />
  )
}

function NewUserHome({ navigate, firstName }) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111]">Welcome to Proquoment, {firstName}! 👋</h1>
        <p className="text-[#9e9e9e] mt-1">Let's get your supplier profile set up to start receiving RFQ matches.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#ebebeb] p-6 mb-6">
        <h2 className="text-base font-semibold text-[#111111] mb-4">Complete your setup</h2>
        <div className="space-y-3">
          {[
            { step: 1, title: 'Complete Company Profile', desc: 'Add your company details, certifications, and capabilities', done: false, path: '/company-profile' },
            { step: 2, title: 'Add Products to Catalogue', desc: 'List the products you supply to get matched with relevant RFQs', done: false, path: '/product-catalogue' },
            { step: 3, title: 'Set Your Preferences', desc: 'Configure your preferred order sizes and categories', done: false, path: '/settings' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl border border-[#ebebeb] hover:border-[#2d2dff] transition-colors cursor-pointer" onClick={() => navigate(item.path)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${item.done ? 'bg-[#0f00da] text-white' : 'bg-[#f5f5f5] text-[#9e9e9e]'}`}>
                {item.done ? <span className="material-symbols-outlined text-[16px]">check</span> : item.step}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#111111]">{item.title}</p>
                <p className="text-xs text-[#9e9e9e] mt-0.5">{item.desc}</p>
              </div>
              <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">chevron_right</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/matched-rfqs')} className="bg-[#0f00da] text-white rounded-2xl p-5 text-left hover:bg-[#2d2dff] transition-colors">
          <span className="material-symbols-outlined text-[28px] mb-2">request_quote</span>
          <p className="font-semibold">Browse RFQs</p>
          <p className="text-xs text-[#bfc1ff] mt-1">Find and bid on relevant requests</p>
        </button>
        <button onClick={() => navigate('/product-catalogue')} className="bg-white border border-[#ebebeb] rounded-2xl p-5 text-left hover:border-[#2d2dff] transition-colors">
          <span className="material-symbols-outlined text-[28px] mb-2 text-[#0f00da]">inventory_2</span>
          <p className="font-semibold text-[#111111]">Add Products</p>
          <p className="text-xs text-[#9e9e9e] mt-1">Build your product catalogue</p>
        </button>
      </div>
    </div>
  )
}

function ReturningUserHome({ navigate, firstName, currency, alerts, activity, isDemo, rfqList, bids, bulkOrders, sampleOrders }) {
  // Calculate dynamic stats for live supplier
  const activeBidsCount = bids.filter(b => ['pending', 'under_review'].includes((b.status || '').toLowerCase())).length
  const matchedRfqsCount = rfqList.length
  const wonOrdersCount = bids.filter(b => ['won', 'accepted'].includes((b.status || '').toLowerCase())).length
  const revenueSum = bids.filter(b => ['won', 'accepted'].includes((b.status || '').toLowerCase())).reduce((acc, curr) => acc + Number(curr.total_value || curr.unit_price * curr.moq || 0), 0)

  const statCards = isDemo
    ? [
        { label: 'Active Bids',   rawValue: 12,    prefix: '',  suffix: '',  icon: 'gavel',         change: '+3 this week',      positive: true },
        { label: 'Matched RFQs', rawValue: 28,    prefix: '',  suffix: '',  icon: 'request_quote', change: '+8 today',          positive: true },
        { label: 'Won Orders',   rawValue: 5,     prefix: '',  suffix: '',  icon: 'check_circle',  change: '+1 this month',     positive: true },
        { label: 'Revenue',      rawValue: 48200, prefix: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '', suffix: '', icon: 'payments', change: '+12% vs last month', positive: true },
      ]
    : [
        { label: 'Active Bids',   rawValue: activeBidsCount,  prefix: '',  suffix: '',  icon: 'gavel',         change: 'Live',              positive: true },
        { label: 'Matched RFQs', rawValue: matchedRfqsCount, prefix: '',  suffix: '',  icon: 'request_quote', change: 'Live',              positive: true },
        { label: 'Won Orders',   rawValue: wonOrdersCount,   prefix: '',  suffix: '',  icon: 'check_circle',  change: 'Live',              positive: true },
        { label: 'Revenue',      rawValue: revenueSum,       prefix: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '', suffix: '', icon: 'payments', change: 'Live',              positive: true },
      ]

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-3 flex-wrap mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">{getGreeting()}, {firstName} 👋</h1>
          <p className="text-[#9e9e9e] text-sm mt-0.5">Here's what's happening with your account today</p>
        </div>
        <button
          onClick={() => navigate('/quote-submission')}
          className="flex items-center gap-2 bg-[#0f00da] text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Quote
        </button>
      </motion.div>

      {/* Alerts */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">notifications</span>
          <h2 className="text-sm font-semibold text-[#111111]">Alerts</h2>
          <span className="bg-[#ba1a1a] text-white text-xs px-1.5 py-0.5 rounded-full">{alerts.length}</span>
        </div>
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.08 + i * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white border border-[#ebebeb] rounded-xl p-4 flex items-start gap-3"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${alert.color}`}>
                <span className="material-symbols-outlined text-[18px]">{alert.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111111]">{alert.title}</p>
                <p className="text-xs text-[#9e9e9e] mt-0.5 truncate">{alert.desc}</p>
                <p className="text-xs text-[#9e9e9e] mt-1">{alert.time}</p>
              </div>
              <button
                onClick={() => navigate(alert.path)}
                className="flex-shrink-0 text-xs text-[#0f00da] font-medium hover:underline"
              >
                {alert.action}
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stat cards with animated counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} delay={0.12 + i * 0.06} />
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        className="bg-white border border-[#ebebeb] rounded-2xl overflow-x-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="px-5 py-4 border-b border-[#ebebeb] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111111]">Recent Activity</h2>
          <button onClick={() => navigate('/matched-rfqs')} className="text-xs text-[#0f00da] font-medium hover:underline">View all</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="px-5 py-3 text-xs font-medium text-[#9e9e9e]">Type</th>
              <th className="px-5 py-3 text-xs font-medium text-[#9e9e9e]">Description</th>
              <th className="px-5 py-3 text-xs font-medium text-[#9e9e9e]">Buyer</th>
              <th className="px-5 py-3 text-xs font-medium text-[#9e9e9e]">Time</th>
              <th className="px-5 py-3 text-xs font-medium text-[#9e9e9e]">Status</th>
            </tr>
          </thead>
          <tbody>
            {(activity || recentActivity).map((item, i) => (
              <motion.tr
                key={item.id}
                className="border-t border-[#f5f5f5] hover:bg-[#fafafa] transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, delay: 0.42 + i * 0.05 }}
              >
                <td className="px-5 py-3 text-sm text-[#555555]">{item.type}</td>
                <td className="px-5 py-3 text-sm text-[#111111]">{item.desc}</td>
                <td className="px-5 py-3 text-sm text-[#555555]">{item.buyer}</td>
                <td className="px-5 py-3 text-xs text-[#9e9e9e]">{item.time}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.statusColor}`}>{item.status}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
