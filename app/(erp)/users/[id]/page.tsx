'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, UserX, UserCheck, KeyRound,
  Mail, Phone, Building2, Shield, Clock, Loader2,
  AlertTriangle, CheckCircle2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateUser, deactivateUser, activateUser, sendPasswordReset } from '@/lib/actions/users'
import { formatDate } from '@/lib/utils/format'
import type { UserRole } from '@/lib/actions/users'

const ROLE_OPTIONS = [
  { value: 'sales',       label: 'Sales' },
  { value: 'technician',  label: 'Technician' },
  { value: 'accountant',  label: 'Accountant' },
  { value: 'manager',     label: 'Manager' },
  { value: 'super_admin', label: 'Super Admin' },
]

const DEPARTMENTS = [
  'Sales & Marketing', 'Finance & Accounts', 'Technical Services',
  'Operations', 'Management', 'Administration',
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  sales:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  technician:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  accountant:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  manager:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

interface UserData {
  id: string; full_name: string; email: string; role: string;
  department: string | null; phone: string | null; is_active: boolean;
  created_at: string; last_login_at: string | null; password_reset_at: string | null
}

export default function UserDetailPage() {
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [form, setForm] = useState({ full_name: '', role: 'sales' as UserRole, department: '', phone: '' })

  useEffect(() => {
    async function load() {
      const { data: { user: auth } } = await supabase.auth.getUser()
      setCurrentUserId(auth?.id ?? '')
      const { data } = await supabase.from('users').select('*').eq('id', userId).single()
      if (data) {
        setUserData(data)
        setForm({ full_name: data.full_name ?? '', role: data.role as UserRole, department: data.department ?? '', phone: data.phone ?? '' })
      }
      setLoading(false)
    }
    load()
  }, [userId])

  function showSuccess(msg: string) { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await updateUser(userId, { full_name: form.full_name, role: form.role, department: form.department || undefined, phone: form.phone || undefined })
    if (res.error) { setError(res.error); setSaving(false); return }
    setUserData(prev => prev ? { ...prev, ...form } : null)
    setSaving(false)
    showSuccess('User profile saved successfully')
  }

  async function handleDeactivate() {
    if (!confirm('Deactivate this user? They will immediately lose access.')) return
    setActionLoading('deactivate')
    const res = await deactivateUser(userId)
    if (res.error) setError(res.error)
    else { setUserData(prev => prev ? { ...prev, is_active: false } : null); showSuccess('User deactivated') }
    setActionLoading(null)
  }

  async function handleActivate() {
    setActionLoading('activate')
    const res = await activateUser(userId)
    if (res.error) setError(res.error)
    else { setUserData(prev => prev ? { ...prev, is_active: true } : null); showSuccess('User reactivated') }
    setActionLoading(null)
  }

  async function handlePasswordReset() {
    if (!userData?.email || !confirm('Send password reset email to ' + userData.email + '?')) return
    setActionLoading('reset')
    const res = await sendPasswordReset(userData.email, userId)
    if (res.error) setError(res.error)
    else showSuccess('Password reset email sent to ' + userData.email)
    setActionLoading(null)
  }

  const isSelf = userId === currentUserId

  if (loading) return (
    <div className="max-w-3xl animate-pulse space-y-5">
      <div className="h-6 w-32 bg-slate-200 dark:bg-[#1E2A3B] rounded" />
      <div className="card h-32" />
      <div className="card h-64" />
    </div>
  )

  if (!userData) return (
    <div className="text-center py-20">
      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <h2 className="font-bold text-[#0A1628] dark:text-white mb-4">User not found</h2>
      <Link href="/users" className="btn-primary">← Back to Users</Link>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <h1 className="page-title">Manage User</h1>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="card p-5 flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 ${userData.is_active ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>
              {userData.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0A1628] dark:text-white">{userData.full_name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge ${ROLE_COLORS[userData.role] ?? 'badge-default'}`}>{ROLE_OPTIONS.find(r => r.value === userData.role)?.label ?? userData.role}</span>
                <span className={`badge ${userData.is_active ? 'badge-success' : 'badge-danger'}`}>{userData.is_active ? 'Active' : 'Inactive'}</span>
                {isSelf && <span className="badge badge-primary">You</span>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5"><Mail className="w-3 h-3" />{userData.email}</div>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Edit Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                <input className="form-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))} disabled={isSelf}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {isSelf && <p className="text-xs text-slate-400 mt-1">Cannot change your own role</p>}
              </div>
              <div>
                <label className="form-label">Department</label>
                <select className="form-input" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                  <option value="">No department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+260 97..." />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Email Address</label>
                <input className="form-input opacity-60 cursor-not-allowed" value={userData.email} disabled />
                <p className="text-xs text-slate-400 mt-1">Email is managed via Supabase Authentication</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {/* Account details */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Account Details</h3>
            {[
              { icon: <Shield className="w-4 h-4" />, label: 'Role', value: <span className={`badge ${ROLE_COLORS[userData.role]} text-xs`}>{ROLE_OPTIONS.find(r => r.value === userData.role)?.label}</span> },
              { icon: <Building2 className="w-4 h-4" />, label: 'Department', value: userData.department ?? '—' },
              { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: userData.phone ?? '—' },
              { icon: <Clock className="w-4 h-4" />, label: 'Created', value: formatDate(userData.created_at) },
              { icon: <Clock className="w-4 h-4" />, label: 'Last Login', value: userData.last_login_at ? formatDate(userData.last_login_at) : 'Never' },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-slate-400 flex-shrink-0 mt-0.5">{row.icon}</span>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">{row.label}</div>
                  {typeof row.value === 'string' ? <span className="text-sm text-[#0A1628] dark:text-white">{row.value}</span> : row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {!isSelf && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Account Actions</h3>
              <button onClick={handlePasswordReset} disabled={actionLoading !== null}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E2A3B] text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B] transition-colors">
                {actionLoading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 text-[#0066FF]" />}
                <div className="text-left"><div>Send Password Reset</div><div className="text-xs text-slate-400 font-normal">Email a password reset link</div></div>
              </button>

              {userData.is_active ? (
                <button onClick={handleDeactivate} disabled={actionLoading !== null || userData.role === 'super_admin'}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {actionLoading === 'deactivate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                  <div className="text-left">
                    <div>Deactivate Account</div>
                    <div className="text-xs opacity-70 font-normal">{userData.role === 'super_admin' ? 'Cannot deactivate Super Admins' : 'Revokes all access immediately'}</div>
                  </div>
                </button>
              ) : (
                <button onClick={handleActivate} disabled={actionLoading !== null}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 dark:border-green-900 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors">
                  {actionLoading === 'activate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <div className="text-left"><div>Reactivate Account</div><div className="text-xs opacity-70 font-normal">Restore full access</div></div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
