'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, X, Loader2 } from 'lucide-react'
import { generateContractInvoice } from '@/lib/actions/contracts'
import { formatCurrency } from '@/lib/utils/format'

export default function GenerateInvoiceModal({ contractId, contractValue, contractName, compact }: {
  contractId: string; contractValue: number; contractName: string; compact?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [periodStart, setPeriodStart] = useState(today)
  const [periodEnd, setPeriodEnd] = useState('')
  const [dueDate, setDueDate] = useState('')

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!periodStart || !periodEnd) { setError('Both period dates are required'); return }
    setLoading(true); setError('')

    const result = await generateContractInvoice(contractId, {
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate || undefined,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/invoices/${result.invoice?.id}`)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={compact ? 'btn-secondary text-xs py-1.5 px-3' : 'btn-primary'}>
        <Receipt className="w-4 h-4" /> Generate Invoice
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div>
                <h2 className="font-semibold text-[#0A1628] dark:text-white">Generate Invoice</h2>
                <p className="text-xs text-slate-400 mt-0.5">{contractName} · {formatCurrency(contractValue)}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
              <div>
                <label className="form-label">Period Start <span className="text-red-500">*</span></label>
                <input type="date" className="form-input" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Period End <span className="text-red-500">*</span></label>
                <input type="date" className="form-input" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Due Date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
                A draft invoice for <strong>{formatCurrency(contractValue)}</strong> will be created. You can review it before sending.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Receipt className="w-4 h-4" /> Generate</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
