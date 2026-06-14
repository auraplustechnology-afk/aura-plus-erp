'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { Quotation, QuotationLine } from '@/types'

interface QuotePDFButtonProps {
  quote: Quotation
  settings: Record<string, string>
  lines: QuotationLine[]
}

export default function QuotePDFButton({ quote, settings, lines }: QuotePDFButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handlePrint() {
    setGenerating(true)

    // Open the print-optimised route in a new tab
    const url = `/quotations/${quote.id}/pdf`
    window.open(url, '_blank')

    setTimeout(() => setGenerating(false), 1500)
  }

  return (
    <button
      onClick={handlePrint}
      disabled={generating}
      className="btn-secondary"
    >
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        : <><Download className="w-4 h-4" /> Download PDF</>
      }
    </button>
  )
}
