'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import { createUser } from '@/lib/actions/users'
import type { UserRole } from '@/lib/actions/users'

const ROLES: { value: UserRole; label: string; desc: string; color: string }[] = [
  { value: 'sales',       label: 'Sales',       desc: 'CRM, customers, quotations',          color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' },
  { value: 'technician',  label: 'Technician',  desc: 'Assigned projects and tickets only',  color: 'border-orange-400 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400' },
  { value: 'accountant',  label: 'Accountant',  desc: 'Invoices, payments, financial reports', color: 'border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' },
  { value: 'manager',     label: 'Manager',     desc: 'Dashboards, CRM, projects, reports',  color: 'border-slate-400 bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Full access to everything',            color: 'border-purple-400 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400' },
]

const DEPARTMENTS = [
  'Sales & Marketing',
  'Finance & Accounts',
  'Technical Services',
  'Operations',
  'Management',
  'Administration',
]

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    needsInvite?: boolean
    sql?: string
    profile?: { email: string; full_name: string; role: string }
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'sales' as UserRole,
    department: '',
    phone: '',
  })

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.full_name.trim()) {
      setError('Email and full name are required')
      return
    }
    setLoading(true)
    setError('')

    const res = await createUser({
      email: form.email.trim(),
      full_name: form.full_name.trim(),
      role: form.role,
      department: form.department || undefined,
      phone: form.phone || undefined,
    })

    setLoading(false)

    if (res.error) {
      setError(res.error)
      return
    }

    if (res.needsInvite) {
      setResult({ needsInvite: true, sql: res.sql, profile: res.profile })
      return
    }

    router.push('/users')
  }

  function copySQL() {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (result?.needsInvite) {
    return (
      <div className="max-w-2xl space-y-5">
        <div>
          <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>
          <h1 className="page-title">User Setup Instructions</h1>
          <p className="page-subtitle">Follow these steps to complete creating {result.profile?.full_name}</p>
        </div>

        {/* Step-by-step */}
        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Send invitation via Supabase',
              content: (
                <div>
                  <p className="text-sm text-slate-500 mb-3">
                    Go to your Supabase project → <strong>Authentication → Users → Invite User</strong> and enter:
                  </p>
                  <div className="bg-slate-50 dark:bg-[#1E2A3B] rounded-lg p-3 font-mono text-sm">
                    {result.profile?.email}
                  </div>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm mt-3 inline-flex"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Supabase Dashboard
                  </a>
                </div>
              )
            },
            {
              step: 2,
              title: 'Copy their UUID',
              content: (
                <p className="text-sm text-slate-500">
                  After inviting, find <strong>{result.profile?.email}</strong> in the users list and copy their UUID (the long string like <code className="text-xs bg-slate-100 dark:bg-[#1E2A3B] px-1.5 py-0.5 rounded">a1b2c3d4-...</code>).
                </p>
              )
            },
            {
              step: 3,
              title: 'Run this SQL in Supabase',
              content: (
                <div>
                  <p className="text-sm text-slate-500 mb-3">
                    Go to <strong>SQL Editor</strong> → replace <code className="text-xs bg-slate-100 dark:bg-[#1E2A3B] px-1.5 py-0.5 rounded">PASTE-UUID-HERE</code> with their UUID → Run:
                  </p>
                  <div className="relative bg-slate-900 rounded-xl p-4">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">{result.sql}</pre>
                    <button
                      onClick={copySQL}
                      className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                    >
                      {copied ? <><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy SQL</>}
                    </button>
                  </div>
                </div>
              )
            },
            {
              step: 4,
              title: 'User accepts invitation',
              content: (
                <p className="text-sm text-slate-500">
                  <strong>{result.profile?.full_name}</strong> will receive an email with a link to set their password. Once they log in, they&apos;ll have <strong>{result.profile?.role}</strong> access.
                </p>
              )
            },
          ].map(({ step, title, content }) => (
            <div key={step} className="card p-5 flex gap-4">
              <div className="w-8 h-8 bg-[#0066FF] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5">
                {step}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">{title}</h3>
                {content}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/users" className="btn-secondary">Back to Users</Link>
          <button onClick={() => setResult(null)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Add Another User
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <h1 className="page-title">Add Team Member</h1>
        <p className="page-subtitle">Create a new user account for Aura Plus ERP</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Personal details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Full Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="e.g. John Mwale" required />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Email Address <span className="text-red-500">*</span></label>
              <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="john@auraplustechnologies.com" required />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+260 97..." />
            </div>
            <div>
              <label className="form-label">Department</label>
              <select className="form-input" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select department...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Role selection */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Access Role <span className="text-red-500">*</span></h2>
          <div className="space-y-2">
            {ROLES.map(role => (
              <label key={role.value}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  form.role === role.value ? `${role.color} border-current` : 'border-[#E2E8F0] dark:border-[#1E2A3B] hover:border-[#0066FF]/30'
                }`}>
                <input type="radio" name="role" value={role.value} checked={form.role === role.value}
                  onChange={e => set('role', e.target.value)} className="mt-0.5 accent-[#0066FF]" />
                <div>
                  <div className={`text-sm font-semibold ${form.role === role.value ? 'inherit' : 'text-[#0A1628] dark:text-white'}`}>
                    {role.label}
                  </div>
                  <div className="text-xs opacity-70 mt-0.5">{role.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/users" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Creating...</>
              : <><UserPlus className="w-4 h-4" /> Create User</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
