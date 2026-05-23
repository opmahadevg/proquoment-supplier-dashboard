import { useState } from 'react'
import { useNavigate, Navigate, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import logo from '@assets/logo.png'
import loginBg from '@assets/login-bg.jpg'

const ROLE_CONFIG = {
  Supplier: {
    headline: 'Sell smarter.\nGrow your business.',
    sub: 'Respond to live RFQs, submit quotes instantly, and manage your orders — all from one powerful supplier dashboard.',
    features: [
      { icon: 'request_quote', text: 'Receive live RFQs from 500+ verified buyers' },
      { icon: 'bolt', text: 'Submit competitive quotes in under 2 minutes' },
      { icon: 'local_shipping', text: 'Manage bulk orders & sample requests end-to-end' },
      { icon: 'payments', text: 'Get paid faster with transparent invoicing' },
    ],
    testimonial: {
      quote: '"Proquoment connected us with 3x more buyers in the first month. Our quote-to-order conversion jumped from 12% to 34%."',
      name: 'Ahmad Hassan',
      title: 'Owner, Hassan Industrial Supplies',
      initials: 'AH',
    },
    formSub: 'Access your supplier portal to respond to RFQs and win more orders.',
    placeholder: 'e.g. ahmad@supplier.com',
  },
  Manufacturer: {
    headline: 'Showcase products.\nWin more contracts.',
    sub: 'List your manufacturing capabilities, get matched with high-value contracts, and scale production with verified procurement teams.',
    features: [
      { icon: 'factory', text: 'Showcase your production capabilities & certifications' },
      { icon: 'handshake', text: 'Get matched with long-term manufacturing contracts' },
      { icon: 'inventory_2', text: 'Manage your product catalogue with HSN & specs' },
      { icon: 'verified', text: 'Build credibility with buyer reviews & ratings' },
    ],
    testimonial: {
      quote: '"Within 6 weeks on Proquoment, our factory secured 4 recurring bulk contracts worth ₹2.4 Cr. The RFQ matching is incredibly precise."',
      name: 'Li Wei',
      title: 'Owner, Precision Manufacturing Co.',
      initials: 'LW',
    },
    formSub: 'Access your manufacturer portal to manage capabilities and win contracts.',
    placeholder: 'e.g. li.wei@precisionmfg.com',
  },
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="text-[#9e9e9e] hover:text-[#555555] transition-colors ml-0.5 flex-shrink-0"
      title={copied ? 'Copied!' : 'Copy'}
    >
      <span className="material-symbols-outlined text-[13px]">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  )
}

export default function Login() {
  const { user, loading: authLoading, login, demoAccounts } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const [accountType, setAccountType] = useState('Supplier')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotState, setForgotState] = useState('idle')

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotState('sending')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setForgotState(error ? 'error' : 'sent')
    } catch {
      setForgotState('error')
    }
  }

  const closeForgot = () => {
    setForgotOpen(false)
    setForgotEmail('')
    setForgotState('idle')
  }

  if (authLoading) return null
  if (user) return <Navigate to="/home" replace />

  const config = ROLE_CONFIG[accountType]
  const filteredDemos = demoAccounts.filter(a => a.type === accountType)

  const handleTypeSwitch = (type) => {
    setAccountType(type)
    setEmail('')
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email address is required.'); return }
    if (!password) { setError('Password is required.'); return }
    setLoading(true)
    const result = await login(email.trim(), password)
    if (result.ok) {
      navigate('/home', { replace: true })
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  const useDemo = (account) => {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  const headlineLines = config.headline.split('\n')

  return (
    <>
    <motion.div
      className="min-h-screen flex"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* ── Left panel ── */}
      <div
        className="hidden md:flex w-[44%] flex-col relative overflow-hidden p-10 text-white bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        {/* Dark overlay for contrast and text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75 z-0" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <img src={logo} alt="Proquoment" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-white font-semibold text-base">Proquoment</span>
          <span className="ml-1 text-[10px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-medium">
            {accountType} Portal
          </span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center relative z-10 mt-8">
          <h1 className="text-[2.4rem] font-bold leading-tight mb-4">
            {headlineLines.map((line, i) => (
              <span key={i}>{line}{i < headlineLines.length - 1 && <br />}</span>
            ))}
          </h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs mb-8">
            {config.sub}
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {config.features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-white">{f.icon}</span>
                </div>
                <p className="text-white/85 text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 bg-white/15 rounded-2xl p-5 mt-auto">
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="material-symbols-outlined text-[14px] text-yellow-300">star</span>
            ))}
          </div>
          <p className="text-white/90 text-sm leading-relaxed mb-4 italic">
            {config.testimonial.quote}
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{config.testimonial.initials}</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{config.testimonial.name}</p>
              <p className="text-white/60 text-xs">{config.testimonial.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <img src={logo} alt="Proquoment" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-[#111111] font-semibold text-base">Proquoment</span>
          </div>

          {/* Role toggle */}
          <div className="flex bg-[#f5f5f5] rounded-full p-1 mb-7 gap-1">
            {['Supplier', 'Manufacturer'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeSwitch(type)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  accountType === type
                    ? 'bg-[#0f00da] text-white shadow-sm'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {type === 'Supplier' ? 'storefront' : 'factory'}
                </span>
                {type}
              </button>
            ))}
          </div>

          {/* Password reset success banner */}
          {resetSuccess && (
            <div className="flex items-start gap-2.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 mb-6">
              <span className="material-symbols-outlined text-[18px] text-green-600 flex-shrink-0 mt-0.5">check_circle</span>
              <p className="text-sm text-green-800 font-medium">
                Password updated successfully — sign in with your new password.
              </p>
            </div>
          )}

          {/* Heading */}
          <h2 className="text-2xl font-bold text-[#111111] mb-1">
            Sign in as {accountType}
          </h2>
          <p className="text-sm text-[#9e9e9e] mb-7">{config.formSub}</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#111111] block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder={config.placeholder}
                autoComplete="email"
                className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[#111111]">Password</label>
                <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true) }} className="text-sm text-[#0f00da] hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[#fff4f4] border border-[#ffdad6] rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-[16px] text-[#ba1a1a] flex-shrink-0 mt-0.5">error</span>
                <p className="text-sm text-[#ba1a1a]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in...
                </>
              ) : `Sign in as ${accountType}`}
            </button>
          </form>

          <div className="mt-5 p-3 rounded-xl bg-[#f8f9fa] border border-[#ebebeb] text-center text-xs text-[#555555] flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#0f00da]">info</span>
            <span>Account created by Proquoment admin. Contact support if you need credentials.</span>
          </div>

          {/* Demo accounts */}
          <div className="mt-7 border border-[#ebebeb] rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-white border-b border-[#ebebeb] flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#9e9e9e] uppercase tracking-wider">
                Demo {accountType} Accounts
              </p>
              <span className="text-[10px] bg-[#e1e0ff] text-[#0f00da] px-2 py-0.5 rounded-full font-medium">
                Click Use → to auto-fill
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#f3f3f3]">
                  <th className="text-left px-4 py-2 text-[#9e9e9e] font-medium">Name / Company</th>
                  <th className="text-left px-4 py-2 text-[#9e9e9e] font-medium">Password</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredDemos.map((acc) => (
                  <tr key={acc.email} className="border-b border-[#f3f3f3] last:border-0 hover:bg-white transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#111111]">{acc.name}</p>
                      <p className="text-[#9e9e9e] text-[10px] mt-0.5">{acc.company}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-[#555555] font-mono truncate max-w-[130px]">{acc.email}</span>
                        <CopyButton text={acc.email} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#555555]">
                      <span className="flex items-center gap-0.5">
                        <span>{acc.password}</span>
                        <CopyButton text={acc.password} />
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => useDemo(acc)}
                        className="text-[#0f00da] font-bold hover:underline whitespace-nowrap text-xs"
                      >
                        Use →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-5">
            {[
              { icon: 'lock', label: 'Secure login' },
              { icon: 'verified_user', label: 'GDPR compliant' },
              { icon: 'support_agent', label: '24/7 support' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[#9e9e9e]">
                <span className="material-symbols-outlined text-[14px]">{b.icon}</span>
                <span className="text-[11px]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>

    {/* ── Forgot Password Modal ── */}
    {forgotOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden">
          {forgotState === 'sent' ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f0f1ff] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[28px] text-[#0f00da]">mark_email_read</span>
              </div>
              <h3 className="text-lg font-semibold text-[#111111] mb-2">Check your inbox</h3>
              <p className="text-sm text-[#555555] mb-6 leading-relaxed">
                We sent a password reset link to <strong>{forgotEmail}</strong>. It may take a minute to arrive.
              </p>
              <button onClick={closeForgot} className="w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0]">
                <h3 className="text-base font-semibold text-[#111111]">Reset your password</h3>
                <button onClick={closeForgot} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors">
                  <span className="material-symbols-outlined text-[18px] text-[#9e9e9e]">close</span>
                </button>
              </div>
              <form onSubmit={handleForgotSubmit} className="p-6">
                <p className="text-sm text-[#555555] mb-5 leading-relaxed">
                  Enter the email address linked to your account and we'll send you a reset link.
                </p>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all mb-4 text-[#111111] placeholder-[#c6c4da]"
                />
                {forgotState === 'error' && (
                  <p className="text-xs text-red-500 mb-3">Something went wrong. Please try again.</p>
                )}
                <button
                  type="submit"
                  disabled={forgotState === 'sending' || !forgotEmail.trim()}
                  className="w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotState === 'sending' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )}
    </>
  )
}
