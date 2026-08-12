'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Headphones, AlertCircle } from 'lucide-react'
import { createTicket } from '@/lib/actions/tickets'
import CustomerCombobox from '@/components/modules/customers/CustomerCombobox'
import type { TicketPriority } from '@/types'

const PRIORITIES: { value: TicketPriority; label: string; desc: string; color: string }[] = [
  { value: 'low',      label: 'Low',      desc: 'Within 7 days',   color: 'border-slate-300 text-slate-600' },
  { value: 'medium',   label: 'Medium',   desc: 'Within 72 hours', color: 'border-blue-400 text-blue-600' },
  { value: 'high',     label: 'High',     desc: 'Within 24 hours', color: 'border-orange-400 text-orange-600' },
  { value: 'critical', label: 'Critical', desc: 'Within 4 hours',  color: 'border-red-500 text-red-600' },
]

interface NewTicketFormProps {
  customers: { id: string; company_name: string; contact_person: string | null }[]
  technicians: { id: string; full_name: string }[]
  products: { id: string; sku: string; product_name: string }[]
  preselectedCustomerId?: string
  preselectedProductId?: string
  preselectedProjectId?: string
}

export default function NewTicketForm({
  customers, technicians, products,
  preselectedCustomerId, preselectedProductId, preselectedProjectId
}: NewTicketFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: preselectedCustomerId ?? '',
    product_id: preselectedProductId ?? '',
    project_id: preselectedProjectId ?? '',
    issue_description: '',
    priority: 'medium' as TicketPriority,
    assigned_technician_id: '',
  })

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Please select a customer'); return }
    if (!form.issue_description.trim()) { setError('Please describe the issue'); return }
    setLoading(true); setError('')

    const result = await createTicket({
      customer_id: form.customer_id,
      product_id: form.product_id || null,
      project_id: form.project_id || null,
      issue_description: form.issue_description,
      priority: form.priority,
      assigned_technician_id: form.assigned_technician_id || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/tickets/${result.data?.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </Link>
        <h1 className="page-title">New Support Ticket</h1>
        <p className="page-subtitle">Log a customer support request or equipment issue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Customer + Product */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
            <Headphones className="w-4 h-4 text-[#0066FF]" /> Ticket Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Customer <span className="text-red-500">*</span></label>
              <CustomerCombobox customers={customers} value={form.customer_id} onChange={id => set('customer_id', id)} required />
            </div>
            <div>
              <label className="form-label">Product / Device <span className="text-slate-400 font-normal">(optional)</span></label>
              <select className="form-input" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
                <option value="">No specific product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.product_name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Assign Technician <span className="text-slate-400 font-normal">(optional)</span></label>
              <select className="form-input" value={form.assigned_technician_id} onChange={e => set('assigned_technician_id', e.target.value)}>
                <option value="">Unassigned</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Issue Description <span className="text-red-500">*</span></label>
              <textarea
                className="form-input resize-none"
                rows={4}
                value={form.issue_description}
                onChange={e => set('issue_description', e.target.value)}
                placeholder="Describe the problem clearly — what's happening, when it started, what the client has tried..."
                required
              />
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="card p-5">
          <label className="form-label mb-3">Priority & SLA</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('priority', p.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.priority === p.value
                    ? `${p.color} bg-opacity-10 border-current bg-current/5`
                    : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                }`}
              >
                <span className="font-semibold">{p.label}</span>
                <span className="text-xs font-normal opacity-70">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/tickets" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Headphones className="w-4 h-4" /> Create Ticket</>}
          </button>
        </div>
      </form>
    </div>
  )
}
