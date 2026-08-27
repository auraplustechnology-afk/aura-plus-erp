'use client'

import { useState } from 'react'
import { X, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { recordCashMovement } from '@/lib/actions/pos-shifts'

export default function CashMovementModal({ shiftId, onClose, onDone }: {
  shiftId: string
  onClose: () => void
  onDone: () => void
}) {
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in')
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) { setError('Amount must be greater than zero'); return }
    if (!reason.trim()) { setError('Please provide a reason'); return }
    setLoading(true); setError('')

    const result = await recordCashMovement({ shift_id: shiftId, movement_type: type, amount, reason })
    if (result.error) { setError(result.error); setLoading(false); return }

    setLoading(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-[#0A1628] dark:text-white">Cash In / Out</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType('cash_in')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                type === 'cash_in' ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}>
              <ArrowDownCircle className="w-4 h-4" /> Cash In
            </button>
            <button type="button" onClick={() => setType('cash_out')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                type === 'cash_out' ? 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}>
              <ArrowUpCircle className="w-4 h-4" /> Cash Out
            </button>
          </div>

          <div>
            <label className="form-label">Amount</label>
            <input type="number" min="0" step="0.01" className="form-input text-lg font-semibold"
              value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} required />
          </div>

          <div>
            <label className="form-label">Reason <span className="text-red-500">*</span></label>
            <input type="text" className="form-input" value={reason} onChange={e => setReason(e.target.value)}
              placeholder={type === 'cash_in' ? 'e.g. Change float top-up...' : 'e.g. Petty cash for supplies...'} required />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
