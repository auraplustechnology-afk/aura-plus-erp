'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Send, CheckCircle, XCircle, Loader2, Receipt, Trash2 } from 'lucide-react'
import { updateQuoteStatus, convertQuoteToInvoice, deleteQuotation } from '@/lib/actions/quotations'

interface QuoteActionsProps {
  quoteId: string
  status: string
  customerId: string
}

export default function QuoteActions({ quoteId, status, customerId }: QuoteActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  async function handleAction(action: string) {
    setShowMenu(false)
    setLoading(action)

    try {
      if (action === 'send') {
        const result = await updateQuoteStatus(quoteId, 'sent')
        if (result.error) { alert(result.error); return }
        router.refresh()
      }
      if (action === 'accept') {
        const result = await updateQuoteStatus(quoteId, 'accepted')
        if (result.error) { alert(result.error); return }
        router.refresh()
      }
      if (action === 'reject') {
        if (!confirm('Mark this quote as rejected?')) return
        const result = await updateQuoteStatus(quoteId, 'rejected')
        if (result.error) { alert(result.error); return }
        router.refresh()
      }
      if (action === 'convert') {
        const result = await convertQuoteToInvoice(quoteId)
        if (result.error) { alert(result.error); return }
        router.push(`/invoices/${result.invoice?.id}`)
      }
      if (action === 'delete') {
        if (!confirm('Delete this quotation? This cannot be undone.')) return
        const result = await deleteQuotation(quoteId)
        if (result.error) { alert(result.error); return }
        router.push('/quotations')
      }
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <div className="relative flex items-center gap-2">
      {/* Primary action button based on status */}
      {status === 'draft' && (
        <button
          onClick={() => handleAction('send')}
          disabled={isLoading}
          className="btn-primary"
        >
          {loading === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Mark as Sent
        </button>
      )}

      {status === 'sent' && (
        <button
          onClick={() => handleAction('accept')}
          disabled={isLoading}
          className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500/40"
        >
          {loading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Accept Quote
        </button>
      )}

      {status === 'accepted' && (
        <button
          onClick={() => handleAction('convert')}
          disabled={isLoading}
          className="btn-primary"
        >
          {loading === 'convert' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
          Convert to Invoice
        </button>
      )}

      {/* More actions dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isLoading}
          className="btn-secondary px-2.5"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl shadow-xl z-20 py-1 overflow-hidden">
              {status === 'draft' && (
                <>
                  <ActionItem icon={<Send className="w-4 h-4" />} label="Mark as Sent" onClick={() => handleAction('send')} />
                  <ActionItem icon={<CheckCircle className="w-4 h-4" />} label="Mark as Accepted" onClick={() => handleAction('accept')} />
                </>
              )}
              {status === 'sent' && (
                <>
                  <ActionItem icon={<CheckCircle className="w-4 h-4" />} label="Mark as Accepted" onClick={() => handleAction('accept')} />
                  <ActionItem icon={<XCircle className="w-4 h-4" />} label="Mark as Rejected" onClick={() => handleAction('reject')} danger />
                </>
              )}
              {status === 'accepted' && (
                <ActionItem icon={<Receipt className="w-4 h-4" />} label="Convert to Invoice" onClick={() => handleAction('convert')} />
              )}
              {['draft', 'sent', 'rejected', 'expired'].includes(status) && (
                <>
                  <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] my-1" />
                  <ActionItem icon={<Trash2 className="w-4 h-4" />} label="Delete Quote" onClick={() => handleAction('delete')} danger />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActionItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]'
      }`}
    >
      {icon} {label}
    </button>
  )
}
