'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, X, Loader2, ArrowUp, ArrowDown, RefreshCw, Trash2 } from 'lucide-react'
import { recordStockAdjustment } from '@/lib/actions/inventory'

const TYPES = [
  { value: 'in',          label: 'Stock In',    icon: <ArrowUp className="w-4 h-4" />,     color: 'green', desc: 'Received new stock' },
  { value: 'out',         label: 'Stock Out',   icon: <ArrowDown className="w-4 h-4" />,   color: 'red',   desc: 'Manual removal' },
  { value: 'correction',  label: 'Correction',  icon: <RefreshCw className="w-4 h-4" />,   color: 'blue',  desc: 'Set exact quantity' },
  { value: 'write_off',   label: 'Write Off',   icon: <Trash2 className="w-4 h-4" />,      color: 'red',   desc: 'Damaged or lost' },
] as const

export default function StockAdjustmentModal({ productId, productName, currentStock }: {
  productId: string; productName: string; currentStock: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adjType, setAdjType] = useState<typeof TYPES[number]['value']>('in')
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState('')

  const selectedType = TYPES.find(t => t.value === adjType)!
  const preview = adjType === 'correction' ? quantity
    : adjType === 'in' ? currentStock + quantity
    : Math.max(0, currentStock - quantity)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (quantity <= 0) { setError('Quantity must be greater than zero'); return }
    if (!reason.trim()) { setError('Please provide a reason'); return }
    setLoading(true); setError('')

    const result = await recordStockAdjustment({
      product_id: productId, adjustment_type: adjType,
      quantity_change: quantity, reason,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    setOpen(false)
    setQuantity(0); setReason('')
    router.refresh()
  }

  const colorMap: Record<string, string> = {
    green: 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400',
    red: 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400',
    blue: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400',
  }
  const inactiveColor = 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <PlusCircle className="w-4 h-4" /> Adjust Stock
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div>
                <h2 className="font-semibold text-[#0A1628] dark:text-white">Adjust Stock</h2>
                <p className="text-xs text-slate-400 mt-0.5">{productName} · Current: <span className="font-semibold">{currentStock}</span></p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

              {/* Type selector */}
              <div>
                <label className="form-label">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(type => (
                    <button key={type.value} type="button" onClick={() => setAdjType(type.value)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${adjType === type.value ? colorMap[type.color] : inactiveColor}`}>
                      {type.icon}
                      <div className="text-left">
                        <div>{type.label}</div>
                        <div className="text-xs opacity-70 font-normal">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="form-label">
                  {adjType === 'correction' ? 'New Stock Quantity' : 'Quantity'}
                </label>
                <input type="number" min="0" step="0.01" className="form-input text-lg font-semibold" value={quantity}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)} required />
                {quantity > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Stock after adjustment:</span>
                    <span className={`font-bold ${preview <= 0 ? 'text-red-500' : preview <= 5 ? 'text-amber-500' : 'text-green-600'}`}>
                      {preview} units
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="form-label">Reason <span className="text-red-500">*</span></label>
                <input type="text" className="form-input" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder={
                    adjType === 'in' ? 'e.g. Received from supplier...' :
                    adjType === 'write_off' ? 'e.g. Damaged during installation...' :
                    adjType === 'correction' ? 'e.g. Physical stock count...' :
                    'Reason for adjustment...'
                  } required />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
