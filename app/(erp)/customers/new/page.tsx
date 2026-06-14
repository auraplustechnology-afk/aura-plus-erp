'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { createCustomer } from '@/lib/actions/customers'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    physical_address: '',
    customer_type: 'prospect',
    source: 'manual',
    tpin: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setLoading(true)
    setError('')
    const result = await createCustomer(form)
    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/customers/${result.data?.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <h1 className="page-title">New Customer</h1>
        <p className="page-subtitle">Add a customer to your database</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Company Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. AMG Investment Ltd" required />
            </div>
            <div>
              <label className="form-label">Contact Person</label>
              <input className="form-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+260 97..." />
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.com" />
            </div>
            <div>
              <label className="form-label">TPIN (optional)</label>
              <input className="form-input" value={form.tpin} onChange={e => set('tpin', e.target.value)} placeholder="e.g. 1012345678" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Physical Address</label>
              <input className="form-input" value={form.physical_address} onChange={e => set('physical_address', e.target.value)} placeholder="Plot No., Road, Area, City" />
            </div>
            <div>
              <label className="form-label">Customer Type</label>
              <select className="form-input" value={form.customer_type} onChange={e => set('customer_type', e.target.value)}>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="form-label">Source</label>
              <select className="form-input" value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="manual">Manual Entry</option>
                <option value="lead_conversion">Lead Conversion</option>
                <option value="walk_in">Walk In</option>
                <option value="referral">Referral</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea className="form-input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/customers" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><UserPlus className="w-4 h-4" /> Create Customer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
