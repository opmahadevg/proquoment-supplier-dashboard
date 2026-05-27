import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
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
    formSub: 'Apply to become a verified supplier on Proquoment.',
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
    formSub: 'Apply to become a verified manufacturer on Proquoment.',
  },
}

export default function Register() {
  const { user, loading } = useAuth()
  const [accountType, setAccountType] = useState('Supplier')

  useEffect(() => {
    const saved = sessionStorage.getItem('registerAs')
    if (saved === 'Supplier' || saved === 'Manufacturer') {
      setAccountType(saved)
      sessionStorage.removeItem('registerAs')
    }
  }, [])

  if (loading) return null
  if (user) return <Navigate to="/home" replace />

  const config = ROLE_CONFIG[accountType]
  const headlineLines = config.headline.split('\n')

  const handleOpenForm = () => {
    window.open('https://form.proquoment.in', '_blank', 'noopener,noreferrer')
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
                onClick={() => setAccountType(type)}
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

          <h2 className="text-2xl font-bold text-[#111111] mb-1">Register as {accountType}</h2>
          <p className="text-sm text-[#9e9e9e] mb-7">{config.formSub}</p>

          {/* Application card */}
          <div className="border border-[#ebebeb] rounded-2xl p-6 bg-[#fafafa] mb-5">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#f0f1ff] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px] text-[#0f00da]">
                  {accountType === 'Supplier' ? 'storefront' : 'factory'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111111]">
                  {accountType} Application Form
                </p>
                <p className="text-xs text-[#9e9e9e] leading-relaxed mt-0.5">
                  Fill out our verification form to become a vetted {accountType.toLowerCase()} on Proquoment.
                  Our team reviews within 3–5 business days.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 mb-5">
              {[
                { icon: 'business', text: 'Company & factory information' },
                { icon: 'inventory_2', text: 'Production capacity & product categories' },
                { icon: 'contact_page', text: 'Contact details & certifications' },
                { icon: 'upload_file', text: 'Document & catalogue uploads' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0f00da]">{item.icon}</span>
                  <span className="text-xs text-[#555555]">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpenForm}
              className="w-full bg-[#0f00da] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#2d2dff] transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Open Registration Form
            </button>
            <p className="text-[11px] text-[#9e9e9e] text-center mt-2.5">
              Opens form.proquoment.in in a new tab
            </p>
          </div>

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
