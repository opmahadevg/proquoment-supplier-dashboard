import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { DashboardProvider } from './context/DashboardContext'
import './index.css'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'  // ← ADD
import posthog from 'posthog-js'

posthog.init('phc_uCYdZcw8yqa6iJttQmXpuAiNp3FTykGCeM6cPKJNSrxN', {
  api_host: 'https://us.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: true,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <DashboardProvider>
            <App />
            <Analytics />  {/* ← ADD */}
          </DashboardProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

