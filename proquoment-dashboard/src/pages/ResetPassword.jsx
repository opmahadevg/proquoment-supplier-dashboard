import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import logo from '@assets/logo.png'

const STATES = {
  WAITING: 'waiting',
  READY: 'ready',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  EXPIRED: 'expired',
  ERROR: 'error',
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [state, setState] = useState(STATES.WAITING)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setState(STATES.READY)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState(STATES.READY)
      } else {
        setTimeout(() => {
          setState(prev => prev === STATES.WAITING ? STATES.EXPIRED : prev)
        }, 5000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setState(STATES.SUBMITTING)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setState(STATES.READY)
      return
    }

    await supabase.auth.signOut()
    setState(STATES.SUCCESS)

    setTimeout(() => navigate('/login?reset=success', { replace: true }), 2500)
  }

  return (
    <motion.div
      className="min-h-screen flex"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* ── Left panel ── */}
      <div className="hidden md:flex w-[44%] bg-[#0f00da] flex-col relative overflow-hidden p-10 text-white">
        <div className="absolute top-[-100px] right-[-100px] w-[380px] h-[380px] rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute top-[140px] right-[30px] w-[160px] h-[160px] rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-[120px] left-[-70px] w-[280px] h-[280px] rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-40px] w-[220px] h-[220px] rounded-full bg-white/10 pointer-events-none" />

        <div className="flex items-center gap-2.5 relative z-10">
          <img src={logo} alt="Proquoment" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-white font-semibold text-base">Proquoment</span>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[32px] text-white">lock_reset</span>
          </div>
          <h1 className="text-[2.2rem] font-bold leading-tight mb-4">
            Set a strong<br />new password.
          </h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs mb-8">
            Choose something unique and memorable. Your new password will take effect immediately after you save it.
          </p>

          <div className="space-y-4">
            {[
              { icon: 'check_circle', text: 'At least 8 characters long' },
              { icon: 'check_circle', text: 'Mix of letters and numbers recommended' },
              { icon: 'check_circle', text: 'Avoid using your name or email' },
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-white/60">{tip.icon}</span>
                <p className="text-white/75 text-sm">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 bg-white/15 rounded-2xl p-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-white">security</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Secure connection</p>
              <p className="text-white/60 text-xs">Your password is encrypted end-to-end</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-[420px]">

          <div className="flex items-center gap-2 mb-8 md:hidden">
            <img src={logo} alt="Proquoment" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-[#111111] font-semibold text-base">Proquoment</span>
          </div>

          {/* WAITING */}
          {state === STATES.WAITING && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#0f00da] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <h2 className="text-xl font-bold text-[#111111] mb-2">Verifying your link…</h2>
              <p className="text-sm text-[#9e9e9e]">Please wait while we confirm your reset request.</p>
            </div>
          )}

          {/* EXPIRED / INVALID LINK */}
          {state === STATES.EXPIRED && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[#fff4f4] flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-[28px] text-[#ba1a1a]">link_off</span>
              </div>
              <h2 className="text-xl font-bold text-[#111111] mb-2">Link expired or invalid</h2>
              <p className="text-sm text-[#555555] leading-relaxed mb-7 max-w-sm mx-auto">
                This password reset link has expired or already been used. Request a new one from the sign-in page.
              </p>
              <Link
                to="/login"
                className="inline-block w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] transition-colors text-center"
              >
                Back to sign in
              </Link>
            </div>
          )}

          {/* SUCCESS */}
          {state === STATES.SUCCESS && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[#f0f1ff] flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-[28px] text-[#0f00da]">check_circle</span>
              </div>
              <h2 className="text-xl font-bold text-[#111111] mb-2">Password updated!</h2>
              <p className="text-sm text-[#555555] leading-relaxed mb-6">
                Your password has been changed successfully. Redirecting you to sign in…
              </p>
              <div className="w-6 h-6 border-2 border-[#0f00da] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* READY / SUBMITTING — the actual form */}
          {(state === STATES.READY || state === STATES.SUBMITTING) && (
            <>
              <h2 className="text-2xl font-bold text-[#111111] mb-1">Set new password</h2>
              <p className="text-sm text-[#9e9e9e] mb-7">
                Enter and confirm your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#111111] block mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all pr-12 text-[#111111]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#555555] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => {
                          const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
                          return (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                i <= strength
                                  ? strength === 1 ? 'bg-[#ba1a1a]'
                                  : strength === 2 ? 'bg-orange-400'
                                  : strength === 3 ? 'bg-yellow-400'
                                  : 'bg-green-500'
                                  : 'bg-[#ebebeb]'
                              }`}
                            />
                          )
                        })}
                      </div>
                      <p className={`text-[11px] mt-1 ${
                        password.length < 6 ? 'text-[#ba1a1a]'
                        : password.length < 8 ? 'text-orange-500'
                        : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'text-green-600'
                        : 'text-yellow-600'
                      }`}>
                        {password.length < 6 ? 'Too short'
                          : password.length < 8 ? 'Almost there — needs 8+ characters'
                          : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Strong password'
                          : 'Good — add uppercase & numbers for stronger'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-[#111111] block mb-1.5">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all pr-12 text-[#111111] ${
                        confirm && confirm !== password
                          ? 'border-[#ba1a1a] focus:border-[#ba1a1a] focus:ring-[#ba1a1a]/10'
                          : confirm && confirm === password
                          ? 'border-green-400 focus:border-green-400 focus:ring-green-400/10'
                          : 'border-[#ebebeb] focus:border-[#0f00da] focus:ring-[#0f00da]/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#555555] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showConfirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    {confirm && confirm === password && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <span className="material-symbols-outlined text-[18px] text-green-500">check_circle</span>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-[#fff4f4] border border-[#ffdad6] rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[16px] text-[#ba1a1a] flex-shrink-0 mt-0.5">error</span>
                    <p className="text-sm text-[#ba1a1a]">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === STATES.SUBMITTING || !password || !confirm}
                  className="w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-1"
                >
                  {state === STATES.SUBMITTING ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Saving…
                    </>
                  ) : 'Save new password'}
                </button>
              </form>

              <p className="text-sm text-center text-[#9e9e9e] mt-5">
                Remember your password?{' '}
                <Link to="/login" className="text-[#0f00da] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
