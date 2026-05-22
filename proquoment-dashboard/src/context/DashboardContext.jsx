import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import {
  getRFQs, getBids, getBulkOrders, getSampleOrders, getAlerts, getActivityLog,
  transformRFQ, transformBid, transformBulkOrder, transformSampleOrder
} from '../lib/db'
import * as supplierApi from '../lib/supplierApi'

const DashboardContext = createContext(null)

function fmtTimeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider')
  return ctx
}

export function DashboardProvider({ children }) {
  const { isDemo, user } = useAuth()

  const [rfqList, setRfqList] = useState([])
  const [bids, setBids] = useState([])
  const [bulkOrders, setBulkOrders] = useState([])
  const [sampleOrders, setSampleOrders] = useState([])
  const [alertsList, setAlertsList] = useState([])
  const [activityList, setActivityList] = useState([])
  const [toasts, setToasts] = useState([])
  const [loading, setLoading] = useState(true)
  const toastCounter = useRef(0)

  const addToast = useCallback((text, type = 'info') => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const refreshData = useCallback(async () => {
    try {
      setLoading(true)
      const authUserId = user?.authUserId
      const supplierId = user?.supplierId

      let rfqsVal = []
      let bidsVal = []
      let bulkVal = []
      let sampleVal = []
      let alertsVal = []
      let activityVal = []

      if (isDemo) {
        const [
          rfqsRes, bidsRes, bulkRes, sampleRes, alertsRes, activityRes
        ] = await Promise.allSettled([
          getRFQs(true), getBids(true), getBulkOrders(true),
          getSampleOrders(true), getAlerts(true), getActivityLog(true)
        ])

        if (rfqsRes.status === 'fulfilled') rfqsVal = rfqsRes.value || []
        if (bidsRes.status === 'fulfilled') bidsVal = bidsRes.value || []
        if (bulkRes.status === 'fulfilled') bulkVal = bulkRes.value || []
        if (sampleRes.status === 'fulfilled') sampleVal = sampleRes.value || []
        if (alertsRes.status === 'fulfilled') alertsVal = alertsRes.value || []
        if (activityRes.status === 'fulfilled') activityVal = activityRes.value || []
      } else {
        if (authUserId) {
          const [
            rfqsRes, bidsRes, alertsRes
          ] = await Promise.allSettled([
            supplierApi.getAssignedRFQs(authUserId, false),
            supplierApi.getBids(authUserId, false),
            supplierApi.getSupplierNotifications(authUserId, false)
          ])

          if (rfqsRes.status === 'fulfilled') rfqsVal = rfqsRes.value || []
          if (bidsRes.status === 'fulfilled') bidsVal = bidsRes.value || []
          
          if (alertsRes.status === 'fulfilled' && alertsRes.value) {
            alertsVal = alertsRes.value.map(n => ({
              id: n.id,
              type: n.type || 'rfq',
              icon: n.type === 'bid' ? 'gavel' : n.type === 'message' ? 'mail' : 'info',
              color: n.type === 'bid' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#e1e0ff] text-[#0f00da]',
              title: n.title,
              desc: n.message,
              time: fmtTimeAgo(n.created_at),
              action: n.action_url ? 'View' : null,
              path: n.action_url,
              read: n.read ?? false
            }))
          }

          if (supplierId) {
            const [bulkRes, sampleRes] = await Promise.allSettled([
              supabase.from('bulk_orders').select('*').eq('supplier_id', supplierId).eq('is_demo', false),
              supabase.from('sample_orders').select('*').eq('supplier_id', supplierId).eq('is_demo', false)
            ])
            if (bulkRes.status === 'fulfilled' && bulkRes.value?.data) {
              bulkVal = bulkRes.value.data.map(transformBulkOrder)
            }
            if (sampleRes.status === 'fulfilled' && sampleRes.value?.data) {
              sampleVal = sampleRes.value.data.map(transformSampleOrder)
            }
          }
        }
      }

      setRfqList(rfqsVal)
      setBids(bidsVal)
      setBulkOrders(bulkVal)
      setSampleOrders(sampleVal)
      setAlertsList(alertsVal.filter(a => !a.read))
      setActivityList(activityVal)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [isDemo, user])

  // Initial load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Real-time PostgreSQL subscription
  useEffect(() => {
    const channel = supabase.channel('supplier-dashboard-realtime')

    // RFQs subscriber
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rfqs' },
      (payload) => {
        const rowIsDemo = payload.new?.is_demo ?? payload.old?.is_demo ?? false
        if (rowIsDemo !== isDemo) return

        if (!isDemo) {
          refreshData()
          return
        }

        if (payload.eventType === 'INSERT') {
          const mapped = transformRFQ(payload.new)
          setRfqList(prev => {
            if (prev.some(r => r.id === mapped.id)) return prev
            return [mapped, ...prev]
          })
          addToast(`New RFQ Match: ${mapped.title}`, 'info')
        } else if (payload.eventType === 'UPDATE') {
          const mapped = transformRFQ(payload.new)
          setRfqList(prev => prev.map(r => r.id === mapped.id ? mapped : r))
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          setRfqList(prev => prev.filter(r => r.id !== deletedId))
        }
      }
    )

    // Quotes / Bids subscriber
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quotes' },
      (payload) => {
        const rowIsDemo = payload.new?.is_demo ?? payload.old?.is_demo ?? false
        if (rowIsDemo !== isDemo) return

        if (!isDemo) {
          const quoteUser = payload.new?.auth_supplier_id ?? payload.old?.auth_supplier_id
          if (quoteUser !== user?.authUserId) return
          refreshData()
          return
        }

        if (payload.eventType === 'INSERT') {
          const mapped = transformBid(payload.new)
          setBids(prev => {
            if (prev.some(b => b.id === mapped.id)) return prev
            return [mapped, ...prev]
          })
        } else if (payload.eventType === 'UPDATE') {
          const mapped = transformBid(payload.new)
          setBids(prev => prev.map(b => b.id === mapped.id ? mapped : b))
          addToast(`Bid updated: ${mapped.title} is now ${mapped.status}`, 'success')
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          setBids(prev => prev.filter(b => b.id !== deletedId))
        }
      }
    )

    // Bulk Orders subscriber
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bulk_orders' },
      (payload) => {
        const rowIsDemo = payload.new?.is_demo ?? payload.old?.is_demo ?? false
        if (rowIsDemo !== isDemo) return

        if (!isDemo) {
          refreshData()
          return
        }

        if (payload.eventType === 'INSERT') {
          const mapped = transformBulkOrder(payload.new)
          setBulkOrders(prev => {
            if (prev.some(o => o.id === mapped.id)) return prev
            return [mapped, ...prev]
          })
          addToast(`New Bulk Order: ${mapped.product}`, 'success')
        } else if (payload.eventType === 'UPDATE') {
          const mapped = transformBulkOrder(payload.new)
          setBulkOrders(prev => prev.map(o => o.id === mapped.id ? mapped : o))
          addToast(`Bulk Order ${mapped.id} progress: ${mapped.progress}%`, 'info')
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          setBulkOrders(prev => prev.filter(o => o.id !== deletedId))
        }
      }
    )

    // Sample Orders subscriber
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sample_orders' },
      (payload) => {
        const rowIsDemo = payload.new?.is_demo ?? payload.old?.is_demo ?? false
        if (rowIsDemo !== isDemo) return

        if (!isDemo) {
          refreshData()
          return
        }

        if (payload.eventType === 'INSERT') {
          const mapped = transformSampleOrder(payload.new)
          setSampleOrders(prev => {
            if (prev.some(s => s.id === mapped.id)) return prev
            return [mapped, ...prev]
          })
          addToast(`New Sample Request: ${mapped.product}`, 'info')
        } else if (payload.eventType === 'UPDATE') {
          const mapped = transformSampleOrder(payload.new)
          setSampleOrders(prev => prev.map(s => s.id === mapped.id ? mapped : s))
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          setSampleOrders(prev => prev.filter(s => s.id !== deletedId))
        }
      }
    )

    // Alerts / Notifications subscriber
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        const rowIsDemo = payload.new?.is_demo ?? payload.old?.is_demo ?? false
        if (rowIsDemo !== isDemo) return

        if (!isDemo) {
          const notifUser = payload.new?.supplier_id ?? payload.old?.supplier_id
          const notifDashboard = payload.new?.target_dashboard ?? payload.old?.target_dashboard
          if (notifDashboard === 'supplier' && (notifUser === user?.authUserId || !notifUser)) {
            if (payload.eventType === 'INSERT') {
              addToast(payload.new.title || 'New notification', 'info')
            }
            refreshData()
          }
          return
        }

        getAlerts(isDemo).then(data => { if (data) setAlertsList(data) })
      }
    )

    // Activity Log subscriber
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity_log' },
      (payload) => {
        const rowIsDemo = payload.new?.is_demo ?? payload.old?.is_demo ?? false
        if (rowIsDemo !== isDemo) return
        getActivityLog(isDemo).then(data => { if (data) setActivityList(data) })
      }
    )

    // Subscribe
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [addToast, isDemo, user, refreshData])

  const updateStatus = useCallback((id, status) => {
    setRfqList(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }, [])

  return (
    <DashboardContext.Provider value={{
      rfqList, setRfqList,
      bids, setBids,
      bulkOrders, setBulkOrders,
      sampleOrders, setSampleOrders,
      alertsList, setAlertsList,
      activityList, setActivityList,
      loading, refreshData,
      toasts, addToast, dismissToast,
      updateStatus
    }}>
      {children}

      {/* Toast Overlay */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-200 cursor-pointer hover:translate-y-[-2px] bg-white text-[#111111] ${
              t.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
              t.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' :
              'border-[#e1e0ff] bg-[#f0f1ff] text-[#0f00da]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            <span className="flex-1">{t.text}</span>
            <span className="material-symbols-outlined text-[16px] text-gray-400 hover:text-gray-600">close</span>
          </div>
        ))}
      </div>
    </DashboardContext.Provider>
  )
}
