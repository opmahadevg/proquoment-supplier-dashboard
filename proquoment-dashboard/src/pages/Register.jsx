import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logo from '@assets/logo.png'

const ROLE_CONFIG = {
  Supplier: {
    headline: 'Join 5,000+\nactive suppliers.',
    sub: 'Create your account and start responding to live RFQs from verified buyers across the region.',
    features: [
      { icon: 'request_quote', text: 'Access live RFQs from 500+ verified buyers' },
      { icon: 'bolt', text: 'Submit quotes and win orders in minutes' },
      { icon: 'local_shipping', text: 'Manage bulk & sample orders end-to-end' },
      { icon: 'trending_up', text: 'Grow revenue with real-time procurement data' },
    ],
    formSub: 'Set up your supplier account in under 2 minutes.',
    emailPlaceholder: 'e.g. you@yourcompany.com',
  },
  Manufacturer: {
    headline: 'Scale production.\nWin contracts.',
    sub: 'List your manufacturing capabilities and get matched with high-value contracts from procurement teams.',
    features: [
      { icon: 'factory', text: 'Showcase production capabilities & certifications' },
      { icon: 'handshake', text: 'Get matched with long-term contracts' },
      { icon: 'inventory_2', text: 'Manage your product catalogue with HSN & specs' },
      { icon: 'verified', text: 'Build credibility with buyer reviews & ratings' },
    ],
    formSub: 'Set up your manufacturer account and start winning contracts.',
    emailPlaceholder: 'e.g. you@yourfactory.com',
  },
}

export default function Register() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()

  const [accountType, setAccountType] = useState('Supplier')
  const [form, setForm] = useState({
    name: '', company: '', role: '', industry: '', phone: '',
    email: '', password: '', confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  if (loading) return null
  if (user) return <Navigate to="/home" replace />

  const config = ROLE_CONFIG[accountType]
  const headlineLines = config.headline.split('\n')

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const handleTypeSwitch = (type) => {
    setAccountType(type)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (!form.company.trim()) { setError('Company name is required.'); return }
    if (!form.email.trim()) { setError('Email address is required.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }

    setSubmitting(true)
    const result = await register({
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim(),
      company: form.company.trim(),
      type: accountType,
      role: form.role.trim() || 'Owner',
      industry: form.industry.trim(),
      phone: form.phone.trim(),
    })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    if (result.needsConfirmation) {
      setSuccessEmail(form.email.trim())
    } else {
      navigate('/home', { replace: true })
    }
  }

  if (successEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-[420px] text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0f1ff] flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[32px] text-[#0f00da]">mark_email_read</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Check your inbox</h2>
          <p className="text-sm text-[#555555] leading-relaxed mb-6">
            We sent a confirmation link to <strong>{successEmail}</strong>. Click the link in the email to activate your account, then come back to sign in.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] transition-colors text-center"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
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
          <span className="ml-1 text-[10px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-medium">
            {accountType} Portal
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10 mt-8">
          <h1 className="text-[2.4rem] font-bold leading-tight mb-4">
            {headlineLines.map((line, i) => (
              <span key={i}>{line}{i < headlineLines.length - 1 && <br />}</span>
            ))}
          </h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs mb-8">{config.sub}</p>
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

        <div className="relative z-10 bg-white/15 rounded-2xl p-5 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {['AH', 'PS', 'LW'].map(initials => (
                <div key={initials} className="w-8 h-8 rounded-full bg-white/25 border-2 border-[#0f00da] flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">{initials}</span>
                </div>
              ))}
            </div>
            <p className="text-white/85 text-sm font-medium">Trusted by 5,000+ suppliers</p>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="material-symbols-outlined text-[14px] text-yellow-300">star</span>
            ))}
          </div>
          <p className="text-white/75 text-xs mt-1">4.9 / 5.0 average supplier rating</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[420px]">

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

          <h2 className="text-2xl font-bold text-[#111111] mb-1">Create your account</h2>
          <p className="text-sm text-[#9e9e9e] mb-7">{config.formSub}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row: name + role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#111111] block mb-1.5">Full name <span className="text-[#ba1a1a]">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Ahmad Hassan"
                  autoComplete="name"
                  className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#111111] block mb-1.5">Your role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={set('role')}
                  placeholder="Owner, Manager…"
                  className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#111111] block mb-1.5">Company name <span className="text-[#ba1a1a]">*</span></label>
              <input
                type="text"
                value={form.company}
                onChange={set('company')}
                placeholder="Your company name"
                autoComplete="organization"
                className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
              />
            </div>

            {/* Row: industry + phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#111111] block mb-1.5">Industry</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={set('industry')}
                  placeholder="Valves, Metals…"
                  className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#111111] block mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+971 50 000 0000"
                  autoComplete="tel"
                  className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
                />
              </div>
            </div>

            <div className="border-t border-[#f0f0f0] pt-1" />

            <div>
              <label className="text-sm font-medium text-[#111111] block mb-1.5">Email address <span className="text-[#ba1a1a]">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder={config.emailPlaceholder}
                autoComplete="email"
                className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all text-[#111111] placeholder-[#c6c4da]"
              />
            </div>

            {/* Row: password + confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#111111] block mb-1.5">Password <span className="text-[#ba1a1a]">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all pr-11 text-[#111111]"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#555555] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#111111] block mb-1.5">Confirm <span className="text-[#ba1a1a]">*</span></label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f00da] focus:ring-2 focus:ring-[#0f00da]/10 transition-all pr-11 text-[#111111]"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#555555] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
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
              disabled={submitting}
              className="w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating account…
                </>
              ) : `Create ${accountType} account`}
            </button>
          </form>

          <p className="text-sm text-center text-[#9e9e9e] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0f00da] font-semibold hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mt-6 flex items-center justify-center gap-5">
            {[
              { icon: 'lock', label: 'Secure signup' },
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
  )
}
