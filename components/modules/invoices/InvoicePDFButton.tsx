'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export default function InvoicePDFButton({ invoiceId }: { invoiceId: string }) {
  const [generating, setGenerating] = useState(false)

  function handlePrint() {
    setGenerating(true)
    window.open(`/invoices/${invoiceId}/pdf`, '_blank')
    setTimeout(() => setGenerating(false), 1500)
  }

  return (
    <button onClick={handlePrint} disabled={generating} className="btn-secondary">
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        : <><Download className="w-4 h-4" /> Download PDF</>
      }
    </button>
  )
}
