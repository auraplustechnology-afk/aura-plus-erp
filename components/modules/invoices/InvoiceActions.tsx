'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Send, Loader2, Trash2 } from 'lucide-react'
import { updateInvoiceStatus, deleteInvoice } from '@/lib/actions/invoices'

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  async function handle(action: string) {
    setShowMenu(false)
    setLoading(action)
    try {
      if (action === 'send') {
        const r = await updateInvoiceStatus(invoiceId, 'sent')
        if (r.error) { alert(r.error); return }
        router.refresh()
      }
      if (action === 'delete') {
        if (!confirm('Delete this invoice? This cannot be undone.')) return
        const r = await deleteInvoice(invoiceId)
        if (r.error) { alert(r.error); return }
        router.push('/invoices')
      }
    } finally {
      setLoading(null)
    }
  }

  if (!['draft', 'sent'].includes(status)) return null

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} disabled={loading !== null} className="btn-secondary px-2.5">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl shadow-xl z-20 py-1">
            {status === 'draft' && (
              <button onClick={() => handle('send')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]">
                <Send className="w-4 h-4" /> Mark as Sent
              </button>
            )}
            {['draft', 'sent'].includes(status) && (
              <>
                <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] my-1" />
                <button onClick={() => handle('delete')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="w-4 h-4" /> Delete Invoice
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
