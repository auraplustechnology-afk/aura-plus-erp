'use client'

import { useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'

interface PDFDocumentActionsProps {
  fileName: string
  targetId: string
}

export default function PDFDocumentActions({ fileName, targetId }: PDFDocumentActionsProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const el = document.getElementById(targetId)
      if (!el) return

      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf()
        .set({
          margin: 0,
          filename: `${fileName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(el)
        .save()
    } catch (err) {
      console.error(err)
      alert('Could not generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="no-print pdf-action-bar">
      <button onClick={() => window.print()} className="pdf-action-btn pdf-action-btn-secondary">
        <Printer className="w-4 h-4" /> Print
      </button>
      <button onClick={handleDownload} disabled={downloading} className="pdf-action-btn pdf-action-btn-primary">
        {downloading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</>
          : <><Download className="w-4 h-4" /> Download PDF</>
        }
      </button>
    </div>
  )
}
