import { useState, useEffect } from 'react'
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import PageTransition from './PageTransition'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from '../context/AuthContext'
import logo from '@assets/logo.png'

const allNavItems = [
  { path: '/home',              icon: 'home',           label: 'Home' },
  { path: '/matched-rfqs',      icon: 'request_quote',  label: 'Matched RFQs' },
  { path: '/my-bids',           icon: 'gavel',          label: 'My Bids' },
  { path: '/messages',          icon: 'chat',           label: 'Messages' },
  { path: '/analytics',         icon: 'bar_chart',      label: 'Analytics' },
  { path: '/product-catalogue', icon: 'inventory_2',    label: 'Product Catalogue' },
  { path: '/sample-orders',     icon: 'science',        label: 'Sample Orders' },
  { path: '/bulk-orders',       icon: 'local_shipping', label: 'Bulk Orders' },
]

const bottomNavItems = [
  { path: '/company-profile',   icon: 'business',  label: 'Company Profile' },
  { path: '/settings',          icon: 'settings',  label: 'Settings' },
]

const PAGE_TITLES = {
  '/home':              'Home',
  '/matched-rfqs':      'Matched RFQs',
  '/my-bids':           'My Bids',
  '/messages':          'Messages',
  '/analytics':         'Analytics',
  '/product-catalogue': 'Product Catalogue',
  '/sample-orders':     'Sample Orders',
  '/bulk-orders':       'Bulk Orders',
  '/company-profile':   'Company Profile',
  '/settings':          'Settings',
}

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function MobileHeader({ onHamburger }) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Proquoment'

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#f0f0f0] h-14 flex items-center px-4 gap-3">
      <button
        onClick={onHamburger}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f5f5f5] transition-colors flex-shrink-0"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[22px] text-[#111111]">menu</span>
      </button>
      <img src={logo} alt="Proquoment" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
      <span className="text-[15px] font-semibold text-[#111111] truncate flex-1">{title}</span>
    </header>
  )
}

function MobileDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login', { replace: true })
  }

  const handleNav = () => {
    onClose()
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`md:hidden fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Proquoment" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-[15px] font-semibold text-[#111111]">Proquoment</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f5f5f5] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">close</span>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-widest px-3 mb-2">Menu</p>
          {allNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-[#f0f1ff] text-[#0f00da]'
                    : 'text-[#6b6b6b] hover:bg-[#f7f7f7] hover:text-[#111111]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[20px] flex-shrink-0 ${isActive ? 'icon-fill' : ''}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}

          <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
            <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-widest px-3 mb-2">Account</p>
            {bottomNavItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNav}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors mb-0.5 ${
                    isActive
                      ? 'bg-[#f0f1ff] text-[#0f00da]'
                      : 'text-[#6b6b6b] hover:bg-[#f7f7f7] hover:text-[#111111]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined text-[20px] flex-shrink-0 ${isActive ? 'icon-fill' : ''}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Profile + Logout */}
        <div className="border-t border-[#f0f0f0] px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#f7f7f7] mb-2">
            <div className="w-8 h-8 rounded-full bg-[#0f00da] flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold">
              {user ? getInitials(user.name) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111111] truncate leading-tight">{user?.name || 'Supplier'}</p>
              <p className="text-[11px] text-[#9e9e9e] truncate leading-tight mt-0.5">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-[#dc2626] hover:bg-[#fff5f5] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export default function Layout() {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMessages = location.pathname === '/messages'

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Header */}
      <MobileHeader onHamburger={() => setDrawerOpen(true)} />

      {/* Mobile Drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 bg-white pt-14 md:pt-0 ${
          isMessages ? 'overflow-hidden h-screen' : 'overflow-y-auto'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  )
}
