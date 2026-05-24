import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import MatchedRFQs from './pages/MatchedRFQs'
import MyBids from './pages/MyBids'
import Messages from './pages/Messages'
import Analytics from './pages/Analytics'
import ProductCatalogue from './pages/ProductCatalogue'
import SampleOrders from './pages/SampleOrders'
import BulkOrders from './pages/BulkOrders'
import QCInspections from './pages/QCInspections'
import CompanyProfile from './pages/CompanyProfile'
import Settings from './pages/Settings'
import QuoteSubmissionChat from './pages/QuoteSubmissionChat'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#0f00da] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="matched-rfqs" element={<MatchedRFQs />} />
        <Route path="my-bids" element={<MyBids />} />
        <Route path="messages" element={<Messages />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="product-catalogue" element={<ProductCatalogue />} />
        <Route path="sample-orders" element={<SampleOrders />} />
        <Route path="bulk-orders" element={<BulkOrders />} />
        <Route path="qc-inspections" element={<QCInspections />} />
        <Route path="company-profile" element={<CompanyProfile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route
        path="/quote-submission"
        element={
          <RequireAuth>
            <QuoteSubmissionChat />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
