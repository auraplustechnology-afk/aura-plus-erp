'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, UserPlus, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ROLE_OPTIONS = [
  { value: 'sales',       label: 'Sales',       desc: 'CRM, quotes, customers' },
  { value: 'technician',  label: 'Technician',  desc: 'Projects and tickets only (field portal)' },
  { value: 'accountant',  label: 'Accountant',  desc: 'Invoices and payments' },
  { value: 'manager',     label: 'Manager',     desc: 'Reports and dashboards' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Full access to everything' },
]

export default function InviteUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'sales',
    phone: '',
  })

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.full_name.trim()) {
      setError('Email and full name are required')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Use Supabase Admin to invite user
    // Note: In production this would use a Server Action with service role
    // For now we create the profile record and use Supabase's invite
    const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(form.email, {
      data: { full_name: form.full_name },
    }).catch(() => ({ data: null, error: { message: 'Admin API not available from browser' } }))

    if (inviteError) {
      // Fallback: Show instructions for manual setup
      setError(
        `Could not auto-invite: ${inviteError.message}. ` +
        `Please manually invite "${form.email}" in your Supabase dashboard → Authentication → Users → Invite User, ` +
        `then run the SQL below to set their profile.`
      )
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const sqlExample = `-- Run this in Supabase SQL Editor after inviting the user:
INSERT INTO users (id, email, full_name, role, phone, is_active)
VALUES (
  'PASTE-USER-UUID-HERE',
  '${form.email}',
  '${form.full_name}',
  '${form.role}',
  '${form.phone}',
  true
);`

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <h1 className="page-title">Invite Team Member</h1>
        <p className="page-subtitle">Add a new user to Aura Plus ERP</p>
      </div>

      {success ? (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-2">Invitation Sent</h2>
          <p className="text-slate-400 text-sm mb-6">
            An invitation email has been sent to <strong>{form.email}</strong>.
            They will receive a link to set their password and log in.
          </p>

          <div className="bg-slate-50 dark:bg-[#1E2A3B] rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-semibold text-slate-500 mb-2">After they accept, run this SQL to set their role:</p>
            <pre className="text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">{sqlExample}</pre>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/users" className="btn-secondary">Back to Users</Link>
            <button onClick={() => { setSuccess(false); setForm({ email: '', full_name: '', role: 'sales', phone: '' }) }} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Invite Another
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-2">Setup Instructions</p>
              <p className="text-xs text-red-600 dark:text-red-500 mb-3">{error}</p>
              <div className="bg-white dark:bg-[#0F1C2E] rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">SQL to run after inviting via Supabase dashboard:</p>
                <pre className="text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">{sqlExample}</pre>
              </div>
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="e.g. John Mwale" required />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Email Address <span className="text-red-500">*</span></label>
                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="john@company.com" required />
              </div>
              <div>
                <label className="form-label">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="tel" className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+260 97..." />
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="form-label">Role <span className="text-red-500">*</span></label>
              <div className="space-y-2 mt-2">
                {ROLE_OPTIONS.map(role => (
                  <label key={role.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.role === role.value
                      ? 'border-[#0066FF] bg-[#0066FF]/5 dark:bg-[#0066FF]/10'
                      : 'border-[#E2E8F0] dark:border-[#1E2A3B] hover:border-[#0066FF]/30'
                  }`}>
                    <input type="radio" name="role" value={role.value} checked={form.role === role.value}
                      onChange={e => set('role', e.target.value)} className="mt-0.5 accent-[#0066FF]" />
                    <div>
                      <div className="text-sm font-semibold text-[#0A1628] dark:text-white">{role.label}</div>
                      <div className="text-xs text-slate-400">{role.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/users" className="btn-secondary">Cancel</Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><UserPlus className="w-4 h-4" /> Send Invitation</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual setup instructions card */}
      <div className="card p-5 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
          📋 Manual Setup (Recommended)
        </p>
        <ol className="text-xs text-amber-700 dark:text-amber-500 space-y-1.5 list-decimal list-inside">
          <li>Go to <strong>Supabase Dashboard → Authentication → Users → Invite User</strong></li>
          <li>Enter the user&apos;s email address and send the invite</li>
          <li>Copy the new user&apos;s UUID from the users list</li>
          <li>Run the SQL snippet that appears here to assign their role</li>
          <li>The user clicks their email link, sets a password, and can log in</li>
        </ol>
      </div>
    </div>
  )
}
