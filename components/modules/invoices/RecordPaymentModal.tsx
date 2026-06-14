'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, X, Loader2, CreditCard, Smartphone, Banknote, FileCheck } from 'lucide-react'
import { recordPayment } from '@/lib/actions/invoices'
import { formatCurrency } from '@/lib/utils/format'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'mobile_money',  label: 'Mobile Money',  icon: <Smartphone className="w-4 h-4" /> },
  { value: 'cash',          label: 'Cash',           icon: <Banknote className="w-4 h-4" /> },
  { value: 'cheque',        label: 'Cheque',         icon: <FileCheck className="w-4 h-4" /> },
] as const

interface RecordPaymentModalProps {
  invoiceId: string
  outstanding: number
}

export default function RecordPaymentModal({ invoiceId, outstanding }: RecordPaymentModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    amount: outstanding,
    payment_method: 'bank_transfer' as typeof PAYMENT_METHODS[number]['value'],
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  })

  function set(key: string, value: string | number) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.amount <= 0) { setError('Amount must be greater than zero'); return }
    if (form.amount > outstanding) { setError(`Amount exceeds outstanding balance of ${formatCurrency(outstanding)}`); return }

    setLoading(true)
    setError('')

    const result = await recordPayment(invoiceId, {
      amount: form.amount,
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      reference_number: form.reference_number || undefined,
      notes: form.notes || undefined,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setOpen(false)
    setForm(p => ({ ...p, amount: 0, reference_number: '', notes: '' }))
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setForm(p => ({ ...p, amount: outstanding })) }}
        className="btn-primary w-full justify-center"
      >
        <PlusCircle className="w-4 h-4" /> Record Payment
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div>
                <h2 className="font-semibold text-[#0A1628] dark:text-white">Record Payment</h2>
                <p className="text-xs text-slate-400 mt-0.5">Outstanding: <span className="font-semibold text-amber-600">{formatCurrency(outstanding)}</span></p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1E2A3B] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Payment method selector */}
              <div>
                <label className="form-label">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => set('payment_method', method.value)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.payment_method === method.value
                          ? 'border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]'
                          : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                      }`}
                    >
                      {method.icon}
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="form-label">
                  Amount (ZMW)
                  <button type="button" onClick={() => set('amount', outstanding)} className="ml-2 text-xs text-[#0066FF] hover:underline font-medium">
                    Full amount
                  </button>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">ZMW</span>
                  <input
                    type="number"
                    min="0.01"
                    max={outstanding}
                    step="0.01"
                    className="form-input pl-14 text-lg font-semibold"
                    value={form.amount}
                    onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                {form.amount > 0 && form.amount < outstanding && (
                  <p className="text-xs text-amber-600 mt-1">
                    Partial payment — {formatCurrency(outstanding - form.amount)} will remain outstanding
                  </p>
                )}
                {form.amount >= outstanding && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ This will fully settle the invoice
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.payment_date}
                  onChange={e => set('payment_date', e.target.value)}
                  required
                />
              </div>

              {/* Reference */}
              <div>
                <label className="form-label">Reference Number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.reference_number}
                  onChange={e => set('reference_number', e.target.value)}
                  placeholder={
                    form.payment_method === 'bank_transfer' ? 'Bank transfer ref...' :
                    form.payment_method === 'mobile_money' ? 'Transaction ID...' :
                    form.payment_method === 'cheque' ? 'Cheque number...' :
                    'Reference...'
                  }
                />
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</>
                    : <><PlusCircle className="w-4 h-4" /> Record {formatCurrency(form.amount)}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
