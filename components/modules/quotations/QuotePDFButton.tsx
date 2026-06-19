'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export default function QuotePDFButton({ quoteId }: { quoteId: string }) {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/quotations/${quoteId}/pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="(.+)"/)
      a.download = match?.[1] ?? 'quotation.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Could not generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button onClick={handleDownload} disabled={generating} className="btn-secondary">
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        : <><Download className="w-4 h-4" /> Download PDF</>
      }
    </button>
  )
}
