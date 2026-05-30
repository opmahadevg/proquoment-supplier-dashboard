import { useState, useEffect } from 'react'
import { useSettings, formatAmount } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { getAnalyticsMonthly } from '../lib/db'

const PERIOD_DATA = {
  '1M': {
    months: ['W1', 'W2', 'W3', 'W4'],
    revenue: [9200, 11400, 8700, 13100],
    bids: [3, 5, 4, 6],
    bidsWon: [1, 2, 1, 2],
    topProducts: [
      { name: 'Steel Pipes Grade A', revenueUsd: 6200, orders: 4, pct: 90 },
      { name: 'Gate Valves DN80', revenueUsd: 4100, orders: 3, pct: 60 },
      { name: 'Hydraulic Fittings', revenueUsd: 3200, orders: 5, pct: 46 },
      { name: 'SS Flanges 316L', revenueUsd: 2400, orders: 2, pct: 34 },
    ],
    categories: [
      { name: 'Industrial Metals', pct: 47, color: '#0f00da' },
      { name: 'Valves & Fittings', pct: 26, color: '#2d2dff' },
      { name: 'Hydraulics', pct: 18, color: '#959afd' },
      { name: 'Others', pct: 9, color: '#e1e0ff' },
    ],
    changeLabels: { revenue: '+8%', bids: '+2 vs last month', winRate: '+3%', deal: '+6%' },
  },
  '3M': {
    months: ['Oct', 'Nov', 'Dec'],
    revenue: [32000, 28000, 48200],
    bids: [15, 11, 18],
    bidsWon: [5, 4, 7],
    topProducts: [
      { name: 'Steel Pipes Grade A', revenueUsd: 12800, orders: 8, pct: 88 },
      { name: 'Gate Valves DN80', revenueUsd: 8600, orders: 6, pct: 62 },
      { name: 'Hydraulic Fittings', revenueUsd: 6900, orders: 10, pct: 50 },
      { name: 'SS Flanges 316L', revenueUsd: 5300, orders: 4, pct: 36 },
    ],
    categories: [
      { name: 'Industrial Metals', pct: 46, color: '#0f00da' },
      { name: 'Valves & Fittings', pct: 27, color: '#2d2dff' },
      { name: 'Hydraulics', pct: 17, color: '#959afd' },
      { name: 'Others', pct: 10, color: '#e1e0ff' },
    ],
    changeLabels: { revenue: '+14%', bids: '+5 vs last quarter', winRate: '+4%', deal: '+9%' },
  },
  '6M': {
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenue: [18000, 24000, 21000, 32000, 28000, 48200],
    bids: [8, 12, 10, 15, 11, 18],
    bidsWon: [2, 4, 3, 5, 4, 7],
    topProducts: [
      { name: 'Steel Pipes Grade A', revenueUsd: 18500, orders: 12, pct: 85 },
      { name: 'Gate Valves DN80', revenueUsd: 12200, orders: 8, pct: 60 },
      { name: 'Hydraulic Fittings', revenueUsd: 9800, orders: 15, pct: 48 },
      { name: 'SS Flanges 316L', revenueUsd: 7700, orders: 5, pct: 38 },
    ],
    categories: [
      { name: 'Industrial Metals', pct: 45, color: '#0f00da' },
      { name: 'Valves & Fittings', pct: 28, color: '#2d2dff' },
      { name: 'Hydraulics', pct: 17, color: '#959afd' },
      { name: 'Others', pct: 10, color: '#e1e0ff' },
    ],
    changeLabels: { revenue: '+12%', bids: '+6 vs last period', winRate: '+5%', deal: '+8%' },
  },
  '1Y': {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenue: [12000, 15500, 14200, 19000, 17800, 22000, 18000, 24000, 21000, 32000, 28000, 48200],
    bids: [5, 7, 6, 9, 8, 11, 8, 12, 10, 15, 11, 18],
    bidsWon: [1, 2, 2, 3, 3, 4, 2, 4, 3, 5, 4, 7],
    topProducts: [
      { name: 'Steel Pipes Grade A', revenueUsd: 72400, orders: 48, pct: 85 },
      { name: 'Gate Valves DN80', revenueUsd: 49800, orders: 32, pct: 60 },
      { name: 'Hydraulic Fittings', revenueUsd: 38200, orders: 58, pct: 48 },
      { name: 'SS Flanges 316L', revenueUsd: 31100, orders: 19, pct: 38 },
    ],
    categories: [
      { name: 'Industrial Metals', pct: 44, color: '#0f00da' },
      { name: 'Valves & Fittings', pct: 29, color: '#2d2dff' },
      { name: 'Hydraulics', pct: 18, color: '#959afd' },
      { name: 'Others', pct: 9, color: '#e1e0ff' },
    ],
    changeLabels: { revenue: '+31%', bids: '+24 vs last year', winRate: '+7%', deal: '+15%' },
  },
}

const PERIODS = ['1M', '3M', '6M', '1Y']

// Empty period data for fresh real accounts — all zeros, no fake revenue
const EMPTY_MONTHS_MAP = {
  '1M': ['W1', 'W2', 'W3', 'W4'],
  '3M': ['Month 1', 'Month 2', 'Month 3'],
  '6M': ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
  '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const getEmptyPeriodData = (p) => ({
  months: EMPTY_MONTHS_MAP[p],
  revenue: EMPTY_MONTHS_MAP[p].map(() => 0),
  bids: EMPTY_MONTHS_MAP[p].map(() => 0),
  bidsWon: EMPTY_MONTHS_MAP[p].map(() => 0),
  topProducts: [],
  categories: [{ name: 'No data yet', pct: 100, color: '#e1e0ff' }],
  changeLabels: { revenue: '—', bids: '—', winRate: '—', deal: '—' },
})

export default function Analytics() {
  const { settings } = useSettings()
  const { isDemo } = useAuth()
  const currency = settings?.preferences?.currency ?? 'USD'
  const [period, setPeriod] = useState('6M')
  const [monthlyData, setMonthlyData] = useState(null)

  useEffect(() => {
    // Only attempt Supabase analytics fetch for real accounts
    if (!isDemo) {
      getAnalyticsMonthly().then(data => { if (data) setMonthlyData(data) })
    }
  }, [isDemo])

  // Real accounts use zero-based empty data; demo accounts use PERIOD_DATA
  const fallback = isDemo ? PERIOD_DATA[period] : getEmptyPeriodData(period)
  const useSupabase = !isDemo && !!monthlyData && period === '6M'
  const displayMonths  = useSupabase ? monthlyData.map(d => d.month)           : fallback.months
  const displayRevenue = useSupabase ? monthlyData.map(d => d.revenue)         : fallback.revenue
  const displayBids    = useSupabase ? monthlyData.map(d => d.bids_submitted)  : fallback.bids
  const totalWon       = useSupabase ? monthlyData.reduce((s, d) => s + d.bids_won, 0) : fallback.bidsWon.reduce((s, v) => s + v, 0)
  const displayMaxRev  = Math.max(...displayRevenue, 1)  // min 1 to avoid div-by-zero in SVG
  const topProducts    = fallback.topProducts
  const categories     = fallback.categories
  const changeLabels   = fallback.changeLabels

  const totalRevenue   = displayRevenue.reduce((s, v) => s + v, 0)
  const totalBids      = displayBids.reduce((s, v) => s + v, 0)
  // For real accounts with no data, show 0% and $0 (not 33% demo fallback)
  const computedWinRate = totalBids > 0 ? Math.round((totalWon / totalBids) * 100) : (isDemo ? 33 : 0)
  const avgDeal        = totalBids > 0 ? Math.round(totalRevenue / totalBids) : (isDemo ? 9640 : 0)

  const kpis = [
    { label: 'Total Revenue',  value: formatAmount(totalRevenue, currency), change: changeLabels.revenue,  icon: 'payments' },
    { label: 'Bids Submitted', value: String(totalBids),                    change: changeLabels.bids,     icon: 'gavel' },
    { label: 'Win Rate',       value: `${computedWinRate}%`,                change: changeLabels.winRate,  icon: 'emoji_events' },
    { label: 'Avg Deal Size',  value: formatAmount(avgDeal, currency),      change: changeLabels.deal,     icon: 'trending_up' },
  ]

  const points = displayRevenue.map((v, i) => {
    const x = displayRevenue.length === 1 ? 200 : (i / (displayRevenue.length - 1)) * 400
    const y = 180 - (v / displayMaxRev) * 160
    return { x, y, v }
  })
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L 400 180 L 0 180 Z`

  let cumulative = 0
  const donutStops = categories.map(c => {
    const start = cumulative
    cumulative += c.pct
    return `${c.color} ${start}% ${cumulative}%`
  }).join(', ')

  return (
    <div className="p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">Analytics</h1>
          <p className="text-sm text-[#9e9e9e] mt-0.5">
            Performance overview · Amounts in {currency}
          </p>
        </div>
        <div className="flex gap-1.5 bg-[#f5f5f5] p-1 rounded-full">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                p === period
                  ? 'bg-[#0f00da] text-white'
                  : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* No-data CTA banner for fresh real accounts */}
      {!isDemo && totalRevenue === 0 && totalBids === 0 && (
        <div className="flex items-start gap-3 bg-[#f0f0ff] border border-[#c6c4da] rounded-2xl px-4 py-3 mb-6">
          <span className="material-symbols-outlined text-[20px] text-[#0f00da] flex-shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-sm font-semibold text-[#0f00da]">No analytics data yet</p>
            <p className="text-xs text-[#555555] mt-0.5">
              Revenue, bids, and win rate will appear here automatically after you start bidding on matched RFQs.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[#ebebeb] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-[#0f00da]">{k.icon}</span>
              <span className="text-xs text-[#9e9e9e]">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#111111] tabular-nums">{k.value}</p>
            <p className="text-xs text-[#0f00da] mt-1">{k.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Revenue Chart */}
        <div className="md:col-span-2 bg-white border border-[#ebebeb] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#111111]">Revenue Trend</h2>
            <span className="text-xs text-[#9e9e9e]">{currency}</span>
          </div>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-[#9e9e9e] w-14">
              {[displayMaxRev, displayMaxRev * 0.75, displayMaxRev * 0.5, displayMaxRev * 0.25, 0].map((v, i) => (
                <span key={i}>{formatAmount(Math.round(v), currency)}</span>
              ))}
            </div>
            <div className="ml-14">
              <svg viewBox="0 0 400 180" className="w-full" preserveAspectRatio="none">
                {[0, 45, 90, 135, 180].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="400" y2={y} stroke="#f0f0f0" strokeWidth="1" />
                ))}
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f00da" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0f00da" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path fill="url(#revGrad)" stroke="none" d={areaD} />
                <path
                  fill="none"
                  stroke="#0f00da"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  d={pathD}
                />
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#0f00da" strokeWidth="2" />
                ))}
              </svg>
              <div className="flex justify-between mt-1">
                {displayMonths.map(m => (
                  <span key={m} className="text-xs text-[#9e9e9e]">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Donut */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#111111] mb-4">Revenue by Category</h2>
          <div className="flex items-center justify-center mb-4">
            <div
              className="w-32 h-32 rounded-full relative"
              style={{ background: `conic-gradient(${donutStops})` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center">
                  <p className="text-base font-bold text-[#111111]">{categories[0].pct}%</p>
                  <p className="text-[9px] text-[#9e9e9e] text-center leading-tight">Top Cat.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-[#555555] flex-1 truncate">{cat.name}</span>
                <span className="text-xs font-semibold text-[#111111]">{cat.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Products */}
        <div className="md:col-span-2 bg-white border border-[#ebebeb] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#111111] mb-4">Top Products by Revenue</h2>
          <div className="space-y-4">
            {topProducts.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#111111]">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#9e9e9e]">{p.orders} orders</span>
                    <span className="text-sm font-semibold text-[#111111]">{formatAmount(p.revenueUsd, currency)}</span>
                  </div>
                </div>
                <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0f00da] rounded-full" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Win Rate Gauge */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#111111] mb-4">Bid Win Rate</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-16 overflow-hidden">
              <div
                className="w-32 h-32 rounded-full absolute top-0"
                style={{
                  background: `conic-gradient(from 180deg, #0f00da 0deg ${computedWinRate * 1.8}deg, #f0f0f0 ${computedWinRate * 1.8}deg 180deg, transparent 180deg 360deg)`,
                }}
              />
              <div className="absolute inset-0 top-8 flex items-end justify-center">
                <p className="text-2xl font-bold text-[#111111] tabular-nums">{computedWinRate}%</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {[
              { label: 'Bids Won',  value: String(totalWon),                          color: 'bg-[#0f00da]' },
              { label: 'Bids Lost', value: String(Math.max(0, totalBids - totalWon)), color: 'bg-[#f0f0f0]' },
              { label: 'Pending',   value: String(totalBids),                         color: 'bg-[#bfc1ff]' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                <span className="text-xs text-[#555555] flex-1">{s.label}</span>
                <span className="text-xs font-semibold text-[#111111] tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
