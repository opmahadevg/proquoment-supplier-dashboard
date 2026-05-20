import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { DashboardProvider } from './context/DashboardContext'
import './index.css'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'  // ← ADD

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

