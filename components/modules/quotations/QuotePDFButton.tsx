'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export default function QuotePDFButton({ quoteId }: { quoteId: string }) {
  const [opening, setOpening] = useState(false)

  function handleOpen() {
    setOpening(true)
    window.open(`/quotations/${quoteId}/pdf`, '_blank')
    setTimeout(() => setOpening(false), 1500)
  }

  return (
    <button onClick={handleOpen} disabled={opening} className="btn-secondary">
      {opening
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening...</>
        : <><Download className="w-4 h-4" /> View / Download PDF</>
      }
    </button>
  )
}
