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
    try {
      const queryPromise = supabase.from('suppliers').select('*').eq('auth_user_id', userId).maybeSingle()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timed out')), 4000)
      )
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      if (error) throw error
      setProfile(data || null)
      return data
    } catch (err) {
      console.error('AuthContext: fetchProfile failed:', err)
      setProfile(null)
      return null
    }
  }

  useEffect(() => {
    if (demoSession) return

    let mounted = true

    // Safety net: force resolve loading if anything takes longer than 5 seconds
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn('AuthContext: Safety timer triggered (5s timeout)')
        setLoading(false)
      }
    }, 5000)

    const resolveLoading = () => {
      if (mounted) {
        setLoading(false)
        clearTimeout(safetyTimer)
      }
    }

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return
        try {
          const su = session?.user ?? null
          setSupabaseUser(su)
          if (su) {
            await fetchProfile(su.id)
          }
        } catch (err) {
          console.error('AuthContext: getSession handler error:', err)
        } finally {
          resolveLoading()
        }
      })
      .catch((err) => {
        console.error('AuthContext: getSession failed:', err)
        resolveLoading()
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      try {
        const su = session?.user ?? null
        setSupabaseUser(su)
        if (su) {
          await fetchProfile(su.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('AuthContext: onAuthStateChange handler error:', err)
      } finally {
        resolveLoading()
      }
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimer)
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
      const DEMO_UUIDS = {
        'ahmad@supplier.com': 'e1e0ff1a-0000-0000-0000-000000000018',
        'priya@valvetech.in': 'e1e0ff1a-0000-0000-0000-000000000019',
        'li.wei@precisionmfg.com': 'e1e0ff1a-0000-0000-0000-000000000020',
        'raj@hydrocast.in': 'e1e0ff1a-0000-0000-0000-000000000021'
      }
      const mappedUuid = DEMO_UUIDS[normalizedEmail] || `demo-${safeUser.email}`
      setDemoSession({ ...safeUser, id: mappedUuid, authUserId: mappedUuid })
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
