'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, XCircle, Loader2, Trash2 } from 'lucide-react'
import { updateCustomer, deleteCustomer } from '@/lib/actions/customers'
import type { Customer } from '@/types'

export default function CustomerEditModal({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: customer.company_name,
    contact_person: customer.contact_person ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    physical_address: customer.physical_address ?? '',
    customer_type: customer.customer_type,
    tpin: customer.tpin ?? '',
    notes: customer.notes ?? '',
  })

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setLoading(true)
    setError('')
    const result = await updateCustomer(customer.id, form)
    if (result.error) { setError(result.error); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${customer.company_name}"? This action cannot be undone.`)) return
    setDeleting(true)
    const result = await deleteCustomer(customer.id)
    if (result.error) { setError(result.error); setDeleting(false); return }
    router.push('/customers')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary self-start">
        <Edit2 className="w-4 h-4" /> Edit Customer
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B] sticky top-0 bg-white dark:bg-[#0F1C2E]">
              <h2 className="font-semibold text-[#0A1628] dark:text-white">Edit Customer</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1E2A3B] transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">Company Name <span className="text-red-500">*</span></label>
                  <input className="form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Contact Person</label>
                  <input className="form-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">TPIN</label>
                  <input className="form-input" value={form.tpin} onChange={e => set('tpin', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Physical Address</label>
                  <input className="form-input" value={form.physical_address} onChange={e => set('physical_address', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Customer Type</label>
                  <select className="form-input" value={form.customer_type} onChange={e => set('customer_type', e.target.value)}>
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger text-sm"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
