import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEMO_ACCOUNTS = [
  {
    type: 'Supplier',
    role: 'Owner',
    name: 'Ahmad Hassan',
    email: 'ahmad@supplier.com',
    password: 'supplier123',
    company: 'Hassan Industrial Supplies',
    industry: 'Industrial Metals & Pipes',
    phone: '+971 50 123 4567',
    supplierId: 18,
  },
  {
    type: 'Supplier',
    role: 'Sales Manager',
    name: 'Priya Sharma',
    email: 'priya@valvetech.in',
    password: 'valvetech123',
    company: 'ValveTech India Pvt. Ltd.',
    industry: 'Valves & Fittings',
    phone: '+91 98765 43210',
    supplierId: 19,
  },
  {
    type: 'Manufacturer',
    role: 'Owner',
    name: 'Li Wei',
    email: 'li.wei@precisionmfg.com',
    password: 'precision123',
    company: 'Precision Manufacturing Co.',
    industry: 'CNC Machined Parts',
    phone: '+86 138 0000 1234',
    supplierId: 20,
  },
  {
    type: 'Manufacturer',
    role: 'Export Manager',
    name: 'Raj Patel',
    email: 'raj@hydrocast.in',
    password: 'hydrocast123',
    company: 'HydroCast Industries',
    industry: 'Hydraulic Components',
    phone: '+91 99999 88888',
    supplierId: 21,
  },
]

const DEMO_SESSION_KEY = 'proquoment_demo_session'

const AuthContext = createContext(null)

function buildUserObject(supabaseUser, profile) {
  if (!supabaseUser) return null
  const meta = supabaseUser.user_metadata || {}
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: profile?.name || meta.name || supabaseUser.email,
    company: profile?.name || meta.company || '',
    type: 'Supplier',
    role: meta.role || 'Owner',
    industry: profile?.categories ? profile.categories.join(', ') : (meta.industry || ''),
    phone: profile?.contact || meta.phone || '',
    supplierId: profile?.id || meta.supplier_id || null,
    authUserId: supabaseUser.id,
  }
}

function loadDemoSession() {
  try {
    const stored = localStorage.getItem(DEMO_SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [demoSession, setDemoSessionState] = useState(loadDemoSession)
  const [supabaseUser, setSupabaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(() => !loadDemoSession())

  const setDemoSession = (data) => {
    setDemoSessionState(data)
    if (data) {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(DEMO_SESSION_KEY)
    }
  }

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('suppliers').select('*').eq('auth_user_id', userId).maybeSingle()
    setProfile(data || null)
    return data
  }

  useEffect(() => {
    if (demoSession) return

    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      const su = session?.user ?? null
      setSupabaseUser(su)
      if (su) await fetchProfile(su.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      const su = session?.user ?? null
      setSupabaseUser(su)
      if (su) {
        await fetchProfile(su.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    const normalizedEmail = email.toLowerCase().trim()

    const demoMatch = DEMO_ACCOUNTS.find(
      a => a.email.toLowerCase() === normalizedEmail && a.password === password
    )

    if (demoMatch) {
      const { password: _p, ...safeUser } = demoMatch
      setDemoSession({ ...safeUser, id: `demo-${safeUser.email}`, authUserId: `demo-${safeUser.email}` })
      return { ok: true }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? 'Invalid email or password. Try a demo account below.'
        : error.message
      return { ok: false, error: msg }
    }
    return { ok: true, user: data.user }
  }

  const register = async ({ email, password, name, company, type, role, industry, phone }) => {
    const redirectTo = `${window.location.origin}/home`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company, type: type || 'Supplier', role: role || 'Owner', industry, phone },
        emailRedirectTo: redirectTo,
      },
    })
    if (error) return { ok: false, error: error.message }
    const needsConfirmation = !data.session
    return { ok: true, user: data.user, needsConfirmation }
  }

  const logout = async () => {
    if (demoSession) {
      setDemoSession(null)
      return
    }
    await supabase.auth.signOut()
    setSupabaseUser(null)
    setProfile(null)
  }

  const updateProfile = useCallback(async (updates) => {
    if (demoSession) {
      setDemoSession({ ...demoSession, ...updates })
      return
    }
    if (!supabaseUser) return
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', supabaseUser.id)
      .select()
      .single()
    if (data) setProfile(data)
  }, [demoSession, supabaseUser])

  const user = demoSession ?? buildUserObject(supabaseUser, profile)

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      logout,
      register,
      updateProfile,
      demoAccounts: DEMO_ACCOUNTS,
      isDemo: !!demoSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
