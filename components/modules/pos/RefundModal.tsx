'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, RotateCcw } from 'lucide-react'
import { getSaleForRefund, processPOSRefund } from '@/lib/actions/pos'
import { formatCurrency } from '@/lib/utils/format'
import type { PaymentMethod } from '@/types'

interface RefundableLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  product_id: string | null
  already_refunded: number
  remaining: number
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

export default function RefundModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [lines, setLines] = useState<RefundableLine[]>([])
  const [selected, setSelected] = useState<Record<string, { qty: number; restock: boolean }>>({})
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reason, setReason] = useState('')

  useEffect(() => {
    getSaleForRefund(invoiceId).then(result => {
      if (result.error) { setError(result.error); setLoading(false); return }
      setInvoiceNumber(result.data!.invoice_number)
      setLines(result.data!.lines as RefundableLine[])
      setLoading(false)
    })
  }, [invoiceId])

  function toggleLine(line: RefundableLine, checked: boolean) {
    setSelected(prev => {
      const next = { ...prev }
      if (checked) next[line.id] = { qty: line.remaining, restock: true }
      else delete next[line.id]
      return next
    })
  }

  function updateQty(lineId: string, qty: number) {
    setSelected(prev => ({ ...prev, [lineId]: { ...prev[lineId], qty } }))
  }

  function toggleRestock(lineId: string, restock: boolean) {
    setSelected(prev => ({ ...prev, [lineId]: { ...prev[lineId], restock } }))
  }

  const refundTotal = Object.entries(selected).reduce((sum, [lineId, sel]) => {
    const line = lines.find(l => l.id === lineId)
    return line ? sum + line.unit_price * sel.qty : sum
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entries = Object.entries(selected).filter(([, s]) => s.qty > 0)
    if (!entries.length) { setError('Select at least one line to refund'); return }
    if (!reason.trim()) { setError('A reason is required'); return }

    setSubmitting(true)
    setError('')

    const result = await processPOSRefund({
      invoice_id: invoiceId,
      lines: entries.map(([invoice_line_id, s]) => ({ invoice_line_id, quantity: s.qty, restock: s.restock })),
      refund_method: method,
      reason,
    })

    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-[#0A1628] dark:text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#0066FF]" /> Refund {invoiceNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

              {lines.map(line => {
                const sel = selected[line.id]
                const checked = !!sel
                return (
                  <div key={line.id} className={`border rounded-xl p-3 ${line.remaining <= 0 ? 'opacity-40' : ''} ${checked ? 'border-[#0066FF]' : 'border-[#E2E8F0] dark:border-[#1E2A3B]'}`}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-1" disabled={line.remaining <= 0}
                        checked={checked} onChange={e => toggleLine(line, e.target.checked)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#0A1628] dark:text-white">{line.description}</div>
                        <div className="text-xs text-slate-400">
                          {formatCurrency(line.unit_price)} each · sold {Number(line.quantity)}
                          {line.already_refunded > 0 && ` · already refunded ${line.already_refunded}`}
                          {line.remaining <= 0 && ' · fully refunded'}
                        </div>
                      </div>
                    </label>
                    {checked && (
                      <div className="flex items-center gap-3 mt-2 pl-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Qty</span>
                          <input type="number" min={1} max={line.remaining} step="0.01"
                            className="form-input w-20 text-sm py-1"
                            value={sel.qty} onChange={e => updateQty(line.id, Math.min(line.remaining, Math.max(0, parseFloat(e.target.value) || 0)))} />
                        </div>
                        {line.product_id && (
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            <input type="checkbox" checked={sel.restock} onChange={e => toggleRestock(line.id, e.target.checked)} />
                            Return to stock
                          </label>
                        )}
                        <span className="text-sm font-semibold text-[#0A1628] dark:text-white ml-auto">{formatCurrency(line.unit_price * sel.qty)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {lines.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No line items on this sale</div>}

              <div>
                <label className="form-label">Refund Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {METHODS.map(m => (
                    <button type="button" key={m.value} onClick={() => setMethod(m.value)}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        method === m.value ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Reason <span className="text-red-500">*</span></label>
                <textarea className="form-input" rows={2} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Customer returned faulty item..." required />
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] px-6 py-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-slate-400">Refund Total</span>{' '}
                <span className="font-bold text-[#0A1628] dark:text-white">{formatCurrency(refundTotal)}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting || refundTotal <= 0} className="btn-primary">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Process Refund'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
