'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { closeShift } from '@/lib/actions/pos-shifts'
import { formatCurrency } from '@/lib/utils/format'

export default function ShiftCloseModal({ shiftId, onClose }: {
  shiftId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [closingCash, setClosingCash] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ expected_cash: number; closing_cash_counted: number; cash_variance: number } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await closeShift({ shift_id: shiftId, closing_cash_counted: closingCash, notes: notes || undefined })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setResult(res.data!)
  }

  function handleDone() {
    onClose()
    router.push('/pos')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-[#0A1628] dark:text-white">Close Shift</h2>
          {!result && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {result ? (
          <div className="p-6 space-y-3 text-center">
            <p className="text-sm text-slate-400">Shift closed. Here&apos;s the cash reconciliation:</p>
            <div className="space-y-1.5 text-sm text-left bg-slate-50 dark:bg-[#1E2A3B] rounded-xl p-4">
              <div className="flex justify-between"><span className="text-slate-500">Expected Cash</span><span className="font-semibold">{formatCurrency(result.expected_cash)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Counted</span><span className="font-semibold">{formatCurrency(result.closing_cash_counted)}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <span className="text-slate-500">Variance</span>
                <span className={`font-bold ${result.cash_variance === 0 ? 'text-green-600' : result.cash_variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {result.cash_variance > 0 ? '+' : ''}{formatCurrency(result.cash_variance)}
                </span>
              </div>
            </div>
            <button onClick={handleDone} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
            <div>
              <label className="form-label">Cash Counted in Drawer</label>
              <input type="number" min="0" step="0.01" autoFocus className="form-input text-lg font-semibold"
                value={closingCash || ''} onChange={e => setClosingCash(parseFloat(e.target.value) || 0)} required />
            </div>
            <div>
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Closing...</> : 'Close Shift'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
