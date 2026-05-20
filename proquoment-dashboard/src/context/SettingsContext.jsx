import { createContext, useContext, useState, useCallback } from 'react'

export const CURRENCY_CONFIG = {
  USD: { symbol: '$', rate: 1, label: 'USD ($)' },
  AED: { symbol: 'AED ', rate: 3.67, label: 'AED (د.إ)' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP (£)' },
}

export function formatAmount(usdAmount, currency = 'USD') {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  const converted = Math.round(usdAmount * cfg.rate)
  return cfg.symbol + converted.toLocaleString()
}

const DEFAULTS = {
  notifications: {
    newRFQ: true,
    bidUpdates: true,
    messages: true,
    orderStatus: true,
    weeklyDigest: false,
    marketing: false,
  },
  preferences: {
    minOrderValue: '5000',
    maxDeliveryDays: '30',
    currency: 'USD',
    language: 'English',
    timezone: 'Asia/Dubai',
  },
  security: {
    twoFactor: false,
    loginAlerts: true,
  },
  companyProfile: {
    companyName: '',
    founded: '2015',
    employees: '50–200',
    website: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    categories: ['Industrial Metals', 'Valves & Fittings', 'Hydraulics'],
    certifications: ['ISO 9001:2015', 'ISO 14001', 'API 6A', 'ADNOC Approved Vendor'],
    countries: ['UAE', 'Saudi Arabia', 'Kuwait', 'Qatar'],
  },
}

function load() {
  try {
    const raw = localStorage.getItem('proquoment_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        notifications: { ...DEFAULTS.notifications, ...parsed.notifications },
        preferences: { ...DEFAULTS.preferences, ...parsed.preferences },
        security: { ...DEFAULTS.security, ...parsed.security },
        companyProfile: { ...DEFAULTS.companyProfile, ...parsed.companyProfile },
      }
    }
  } catch {}
  return structuredClone(DEFAULTS)
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  const updateSettings = useCallback((section, updates) => {
    setSettings(prev => {
      const next = { ...prev, [section]: { ...prev[section], ...updates } }
      localStorage.setItem('proquoment_settings', JSON.stringify(next))
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem('proquoment_settings')
    setSettings(structuredClone(DEFAULTS))
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetAll }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
