import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111111] text-white text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in">
      <span className="material-symbols-outlined text-[18px] text-green-400">check_circle</span>
      {message}
    </div>
  )
}

function ConfirmModal({ title, desc, confirmLabel, confirmClass, onConfirm, onCancel, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-semibold text-[#111111] mb-1">{title}</h3>
          <p className="text-sm text-[#555555]">{desc}</p>
          {children}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-[#ebebeb] rounded-2xl p-5 mb-4">
      <h2 className="text-base font-semibold text-[#111111] mb-4 pb-3 border-b border-[#f3f3f3]">{title}</h2>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f5f5f5] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#111111]">{label}</p>
        {desc && <p className="text-xs text-[#9e9e9e] mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#0f00da]' : 'bg-[#d4d4d4]'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function Settings() {
  const { user, updateProfile, logout } = useAuth()
  const { settings, updateSettings, resetAll } = useSettings()

  const [toast, setToast] = useState(null)
  const showToast = (msg) => setToast(msg)

  // ── Account Edit ──────────────────────────────────────────────
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountDraft, setAccountDraft] = useState({ name: '', phone: '' })

  const startEditAccount = () => {
    setAccountDraft({ name: user?.name || '', phone: user?.phone || '' })
    setEditingAccount(true)
  }
  const cancelEditAccount = () => setEditingAccount(false)
  const saveAccount = () => {
    if (!accountDraft.name.trim()) return
    updateProfile({ name: accountDraft.name.trim(), phone: accountDraft.phone.trim() })
    setEditingAccount(false)
    showToast('Account details saved')
  }

  // ── Change Password ───────────────────────────────────────────
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const handleChangePassword = () => {
    if (!pwForm.current) { setPwError('Enter your current password'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    setShowPwModal(false)
    setPwForm({ current: '', next: '', confirm: '' })
    setPwError('')
    showToast('Password updated successfully')
  }

  // ── Notifications ─────────────────────────────────────────────
  const notifications = settings.notifications
  const setNotif = (key, val) => updateSettings('notifications', { [key]: val })

  // ── Preferences ───────────────────────────────────────────────
  const prefs = settings.preferences
  const [prefDraft, setPrefDraft] = useState(prefs)
  const [prefChanged, setPrefChanged] = useState(false)

  const handlePrefChange = (key, val) => {
    setPrefDraft(d => ({ ...d, [key]: val }))
    setPrefChanged(true)
  }
  const savePrefs = () => {
    updateSettings('preferences', prefDraft)
    setPrefChanged(false)
    showToast('Preferences saved — changes applied across the dashboard')
  }
  const cancelPrefs = () => {
    setPrefDraft(settings.preferences)
    setPrefChanged(false)
  }

  // ── Security ──────────────────────────────────────────────────
  const security = settings.security
  const setSecurity = (key, val) => {
    updateSettings('security', { [key]: val })
    showToast(`${key === 'twoFactor' ? 'Two-factor authentication' : 'Login alerts'} ${val ? 'enabled' : 'disabled'}`)
  }

  // ── Danger Zone ───────────────────────────────────────────────
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleDeactivate = () => {
    setShowDeactivate(false)
    resetAll()
    logout()
  }

  const handleDelete = () => {
    if (deleteConfirmText !== 'DELETE') return
    setShowDelete(false)
    resetAll()
    logout()
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#111111]">Settings</h1>
        <p className="text-sm text-[#9e9e9e] mt-0.5">Manage your account preferences and notifications</p>
      </div>

      {/* ── Account ─────────────────────────────────────────── */}
      <Section title="Account">
        <div className="flex items-center gap-4 pb-4 border-b border-[#f3f3f3] mb-4">
          <div className="w-14 h-14 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center text-xl font-bold flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[#111111]">{user?.name}</p>
            <p className="text-sm text-[#9e9e9e]">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] bg-[#f0f1ff] text-[#0f00da] px-2 py-0.5 rounded-full font-semibold">{user?.role} · {user?.type}</span>
          </div>
          {!editingAccount && (
            <button onClick={startEditAccount} className="border border-[#ebebeb] text-[#555555] px-3 py-1.5 rounded-full text-xs font-medium hover:bg-[#f5f5f5] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Edit
            </button>
          )}
        </div>

        {editingAccount ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">Full Name</label>
              <input
                value={accountDraft.name}
                onChange={e => setAccountDraft(d => ({ ...d, name: e.target.value }))}
                className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">Phone</label>
              <input
                value={accountDraft.phone}
                onChange={e => setAccountDraft(d => ({ ...d, phone: e.target.value }))}
                className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#9e9e9e] block mb-1.5">Email (read-only)</label>
              <input
                value={user?.email}
                readOnly
                className="w-full border border-[#f5f5f5] rounded-xl px-3 py-2.5 text-sm bg-[#fafafa] text-[#9e9e9e] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#9e9e9e] block mb-1.5">Role (read-only)</label>
              <input
                value={`${user?.role} · ${user?.type}`}
                readOnly
                className="w-full border border-[#f5f5f5] rounded-xl px-3 py-2.5 text-sm bg-[#fafafa] text-[#9e9e9e] cursor-not-allowed"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveAccount} className="bg-[#0f00da] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors">
                Save changes
              </button>
              <button onClick={cancelEditAccount} className="border border-[#ebebeb] text-[#555555] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Full Name', value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Phone', value: user?.phone || '—' },
              { label: 'Company', value: user?.company },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <p className="text-xs text-[#9e9e9e] w-24 flex-shrink-0">{f.label}</p>
                <p className="text-sm text-[#111111]">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Notifications ────────────────────────────────────── */}
      <Section title="Notifications">
        <Toggle checked={notifications.newRFQ} onChange={v => setNotif('newRFQ', v)} label="New RFQ Matches" desc="Get notified when new RFQs match your catalogue" />
        <Toggle checked={notifications.bidUpdates} onChange={v => setNotif('bidUpdates', v)} label="Bid Updates" desc="Updates on your submitted bids" />
        <Toggle checked={notifications.messages} onChange={v => setNotif('messages', v)} label="Messages" desc="New messages from buyers" />
        <Toggle checked={notifications.orderStatus} onChange={v => setNotif('orderStatus', v)} label="Order Status Changes" desc="When order milestones are updated" />
        <Toggle checked={notifications.weeklyDigest} onChange={v => setNotif('weeklyDigest', v)} label="Weekly Digest" desc="Summary of your activity every Monday" />
        <Toggle checked={notifications.marketing} onChange={v => setNotif('marketing', v)} label="Marketing Emails" desc="Product updates and platform news" />
        <p className="text-xs text-[#9e9e9e] pt-3">Notification preferences are saved automatically.</p>
      </Section>

      {/* ── Preferences ──────────────────────────────────────── */}
      <Section title="Preferences">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">Minimum Order Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9e9e9e]">$</span>
                <input
                  type="number"
                  value={prefDraft.minOrderValue}
                  onChange={e => handlePrefChange('minOrderValue', e.target.value)}
                  className="w-full border border-[#ebebeb] rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors"
                />
              </div>
              <p className="text-[10px] text-[#9e9e9e] mt-1">Filters RFQs below this budget</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[#555555] block mb-1.5">Max Delivery Days</label>
              <input
                type="number"
                value={prefDraft.maxDeliveryDays}
                onChange={e => handlePrefChange('maxDeliveryDays', e.target.value)}
                className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors"
              />
              <p className="text-[10px] text-[#9e9e9e] mt-1">Highlighted in bid submission</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Currency', key: 'currency', options: ['USD', 'AED', 'EUR', 'GBP'] },
              { label: 'Language', key: 'language', options: ['English', 'Arabic', 'Chinese'] },
              { label: 'Timezone', key: 'timezone', options: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Shanghai', 'UTC', 'Europe/London'] },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-[#555555] block mb-1.5">{f.label}</label>
                <select
                  value={prefDraft[f.key]}
                  onChange={e => handlePrefChange(f.key, e.target.value)}
                  className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] bg-white transition-colors"
                >
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {prefChanged && (
            <div className="flex gap-2 pt-1">
              <button onClick={savePrefs} className="bg-[#0f00da] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span>
                Save Preferences
              </button>
              <button onClick={cancelPrefs} className="border border-[#ebebeb] text-[#555555] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
                Discard
              </button>
            </div>
          )}
          {!prefChanged && (
            <p className="text-xs text-[#9e9e9e]">
              Currency affects how amounts are displayed across the dashboard.
            </p>
          )}
        </div>
      </Section>

      {/* ── Security ─────────────────────────────────────────── */}
      <Section title="Security">
        <Toggle
          checked={security.twoFactor}
          onChange={v => setSecurity('twoFactor', v)}
          label="Two-Factor Authentication"
          desc="Add an extra layer of security to your account"
        />
        <Toggle
          checked={security.loginAlerts}
          onChange={v => setSecurity('loginAlerts', v)}
          label="Login Alerts"
          desc="Get notified of new sign-ins to your account"
        />
        <div className="pt-4 flex items-center gap-3">
          <button
            onClick={() => { setShowPwModal(true); setPwForm({ current: '', next: '', confirm: '' }); setPwError('') }}
            className="flex items-center gap-2 border border-[#ebebeb] text-[#555555] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Change Password
          </button>
          {security.twoFactor && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              2FA active
            </span>
          )}
        </div>
      </Section>

      {/* ── Danger Zone ──────────────────────────────────────── */}
      <div className="bg-[#fff8f8] border border-[#ffd5d5] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-[#ba1a1a] mb-1">Danger Zone</h2>
        <p className="text-sm text-[#555555] mb-4">These actions are irreversible. Please proceed with caution.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeactivate(true)}
            className="border border-[#ba1a1a] text-[#ba1a1a] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#ffdad6] transition-colors"
          >
            Deactivate Account
          </button>
          <button
            onClick={() => { setShowDelete(true); setDeleteConfirmText('') }}
            className="bg-[#ba1a1a] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#93000a] transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Change Password Modal ─────────────────────────────── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[#111111]">Change Password</h3>
                <button onClick={() => setShowPwModal(false)} className="text-[#9e9e9e] hover:text-[#111111]">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Current Password', key: 'current', placeholder: 'Enter current password' },
                  { label: 'New Password', key: 'next', placeholder: 'At least 8 characters' },
                  { label: 'Confirm New Password', key: 'confirm', placeholder: 'Repeat new password' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-[#555555] block mb-1.5">{f.label}</label>
                    <input
                      type="password"
                      value={pwForm[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0f00da] transition-colors"
                    />
                  </div>
                ))}
                {pwError && (
                  <p className="text-xs text-[#ba1a1a] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {pwError}
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => setShowPwModal(false)} className="flex-1 border border-[#ebebeb] text-[#555555] py-2.5 rounded-full text-sm font-medium hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
              <button onClick={handleChangePassword} className="flex-1 bg-[#0f00da] text-white py-2.5 rounded-full text-sm font-medium hover:bg-[#2d2dff] transition-colors">
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirm ───────────────────────────────── */}
      {showDeactivate && (
        <ConfirmModal
          title="Deactivate your account?"
          desc="Your account will be suspended. You can reactivate it by contacting support. All your data will be preserved."
          confirmLabel="Yes, Deactivate"
          confirmClass="bg-[#ba1a1a] text-white hover:bg-[#93000a]"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────── */}
      {showDelete && (
        <ConfirmModal
          title="Permanently delete account?"
          desc='This will erase all your data, bids, and products. This cannot be undone. Type DELETE to confirm.'
          confirmLabel="Delete Forever"
          confirmClass={`${deleteConfirmText === 'DELETE' ? 'bg-[#ba1a1a] text-white hover:bg-[#93000a]' : 'bg-[#f5f5f5] text-[#9e9e9e] cursor-not-allowed'}`}
          onConfirm={deleteConfirmText === 'DELETE' ? handleDelete : () => {}}
          onCancel={() => setShowDelete(false)}
        >
          <input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ba1a1a] mt-3 transition-colors"
          />
        </ConfirmModal>
      )}
    </div>
  )
}
