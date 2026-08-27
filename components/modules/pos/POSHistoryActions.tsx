'use client'

import { useState } from 'react'
import { Printer, Ban, RotateCcw } from 'lucide-react'
import VoidSaleModal from './VoidSaleModal'
import RefundModal from './RefundModal'

export default function POSHistoryActions({
  invoiceId, invoiceNumber, status, canManage,
}: {
  invoiceId: string
  invoiceNumber: string
  status: string
  canManage: boolean
}) {
  const [showVoid, setShowVoid] = useState(false)
  const [showRefund, setShowRefund] = useState(false)

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <a
        href={`/pos/${invoiceId}/receipt`} target="_blank" rel="noopener noreferrer"
        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0066FF] hover:bg-slate-50 dark:hover:bg-[#1E2A3B]"
        title="Reprint receipt"
      >
        <Printer className="w-4 h-4" />
      </a>
      {canManage && status !== 'voided' && (
        <>
          <button onClick={() => setShowRefund(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#0066FF] hover:bg-slate-50 dark:hover:bg-[#1E2A3B]" title="Refund">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowVoid(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]" title="Void">
            <Ban className="w-4 h-4" />
          </button>
        </>
      )}

      {showVoid && <VoidSaleModal invoiceId={invoiceId} invoiceNumber={invoiceNumber} onClose={() => setShowVoid(false)} />}
      {showRefund && <RefundModal invoiceId={invoiceId} onClose={() => setShowRefund(false)} />}
    </div>
  )
}
