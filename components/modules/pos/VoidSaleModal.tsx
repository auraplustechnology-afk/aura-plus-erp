'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { voidPOSSale } from '@/lib/actions/pos'

export default function VoidSaleModal({ invoiceId, invoiceNumber, onClose }: {
  invoiceId: string
  invoiceNumber: string
  onClose: () => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { setError('A reason is required'); return }
    setLoading(true); setError('')

    const result = await voidPOSSale(invoiceId, reason)
    if (result.error) { setError(result.error); setLoading(false); return }

    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-[#0A1628] dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Void {invoiceNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            This reverses the sale completely: stock is restored and the invoice is marked voided.
            This cannot be undone. Payment records are kept for audit purposes.
          </p>
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="form-label">Reason <span className="text-red-500">*</span></label>
            <textarea autoFocus className="form-input" rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Duplicate sale rung up by mistake..." required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Voiding...</> : 'Void Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
