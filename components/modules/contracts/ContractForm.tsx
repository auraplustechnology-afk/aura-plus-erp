'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2, FileCheck } from 'lucide-react'
import { createContract, updateContract } from '@/lib/actions/contracts'
import { formatCurrency } from '@/lib/utils/format'
import CustomerCombobox from '@/components/modules/customers/CustomerCombobox'
import type { MaintenanceContract, BillingCycle } from '@/types'

interface CoveredProduct { name: string; description: string }

interface ContractFormProps {
  mode: 'new' | 'edit'
  contract?: MaintenanceContract
  customers: { id: string; company_name: string; contact_person: string | null }[]
  preselectedCustomerId?: string
}

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually',  label: 'Annually' },
]

export default function ContractForm({ mode, contract, customers, preselectedCustomerId }: ContractFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: contract?.customer_id ?? preselectedCustomerId ?? '',
    contract_name: contract?.contract_name ?? '',
    start_date: contract?.start_date ?? '',
    end_date: contract?.end_date ?? '',
    renewal_date: contract?.renewal_date ?? '',
    value: contract?.value ?? 0,
    billing_cycle: contract?.billing_cycle ?? 'annually' as BillingCycle,
    notes: contract?.notes ?? '',
  })
  const [coveredProducts, setCoveredProducts] = useState<CoveredProduct[]>(
    contract?.products_covered?.map(p => ({ name: p.name, description: p.description ?? '' })) ?? []
  )

  function set(key: string, value: string | number) { setForm(p => ({ ...p, [key]: value })) }

  function addProduct() { setCoveredProducts(p => [...p, { name: '', description: '' }]) }
  function removeProduct(i: number) { setCoveredProducts(p => p.filter((_, idx) => idx !== i)) }
  function updateProduct(i: number, key: keyof CoveredProduct, value: string) {
    setCoveredProducts(p => p.map((item, idx) => idx === i ? { ...item, [key]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Please select a customer'); return }
    if (!form.contract_name.trim()) { setError('Contract name is required'); return }
    if (!form.start_date || !form.end_date) { setError('Start and end dates are required'); return }
    if (new Date(form.end_date) <= new Date(form.start_date)) { setError('End date must be after start date'); return }

    setLoading(true); setError('')

    const payload = {
      ...form,
      renewal_date: form.renewal_date || null,
      notes: form.notes || null,
      products_covered: coveredProducts.filter(p => p.name.trim()),
    }

    const result = mode === 'new'
      ? await createContract(payload)
      : await updateContract(contract!.id, payload)

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/contracts/${result.data?.id ?? contract?.id}`)
  }

  const selectedCustomer = customers.find(c => c.id === form.customer_id)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/contracts" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Contracts
        </Link>
        <h1 className="page-title">{mode === 'new' ? 'New Contract' : `Edit ${contract?.contract_number}`}</h1>
        <p className="page-subtitle">Set up a maintenance service agreement</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Customer + Name */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#0066FF]" /> Contract Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Customer <span className="text-red-500">*</span></label>
              <CustomerCombobox customers={customers} value={form.customer_id} onChange={id => set('customer_id', id)} required />
              {selectedCustomer && (
                <div className="mt-1.5 text-xs text-slate-400">{selectedCustomer.contact_person}</div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Contract Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.contract_name} onChange={e => set('contract_name', e.target.value)}
                placeholder="e.g. Annual CCTV Maintenance Agreement" required />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Contract Period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Start Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">End Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Renewal Date <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="date" className="form-input" value={form.renewal_date} onChange={e => set('renewal_date', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Value + Billing */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Billing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Contract Value (ZMW) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">ZMW</span>
                <input type="number" min="0" step="0.01" className="form-input pl-14"
                  value={form.value} onChange={e => set('value', parseFloat(e.target.value) || 0)} required />
              </div>
            </div>
            <div>
              <label className="form-label">Billing Cycle</label>
              <div className="grid grid-cols-3 gap-2">
                {BILLING_CYCLES.map(cycle => (
                  <button key={cycle.value} type="button"
                    onClick={() => set('billing_cycle', cycle.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      form.billing_cycle === cycle.value
                        ? 'border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]'
                        : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                    }`}>
                    {cycle.label}
                  </button>
                ))}
              </div>
            </div>
            {form.value > 0 && (
              <div className="sm:col-span-2 text-xs text-slate-500 bg-slate-50 dark:bg-[#1E2A3B] rounded-lg px-3 py-2">
                Invoice amount per period: <strong className="text-[#0A1628] dark:text-white">{formatCurrency(form.value)}</strong>
                {form.billing_cycle === 'monthly' && <span className="text-slate-400"> · {formatCurrency(form.value * 12)} / year</span>}
                {form.billing_cycle === 'quarterly' && <span className="text-slate-400"> · {formatCurrency(form.value * 4)} / year</span>}
              </div>
            )}
          </div>
        </div>

        {/* Systems/Products Covered */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Systems Covered</h2>
              <p className="text-xs text-slate-400 mt-0.5">List the equipment or systems included in this contract</p>
            </div>
            <button type="button" onClick={addProduct} className="btn-secondary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> Add System
            </button>
          </div>

          {coveredProducts.length === 0 ? (
            <button type="button" onClick={addProduct}
              className="w-full border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl py-6 text-sm text-slate-400 hover:border-[#0066FF]/40 hover:text-[#0066FF] transition-colors">
              <Plus className="w-4 h-4 mx-auto mb-1" />
              Add systems or equipment covered
            </button>
          ) : (
            <div className="space-y-2">
              {coveredProducts.map((product, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className="form-input text-sm" placeholder="System name (e.g. CCTV — 8 Cameras)"
                      value={product.name} onChange={e => updateProduct(i, 'name', e.target.value)} />
                    <input className="form-input text-sm" placeholder="Description (optional)"
                      value={product.description} onChange={e => updateProduct(i, 'description', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeProduct(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-5">
          <label className="form-label">Notes</label>
          <textarea className="form-input resize-none" rows={3} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="SLA terms, contact information, special conditions..." />
        </div>

        <div className="flex gap-3">
          <Link href="/contracts" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><FileCheck className="w-4 h-4" /> {mode === 'new' ? 'Create Contract' : 'Save Changes'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
