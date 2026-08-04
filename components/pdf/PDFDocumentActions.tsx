'use client'

import { useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'

interface PDFDocumentActionsProps {
  fileName: string
  targetId: string
}

const A4_WIDTH_MM = 210

export default function PDFDocumentActions({ fileName, targetId }: PDFDocumentActionsProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const el = document.getElementById(targetId)
      if (!el) return

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdfHeight = (canvas.height * A4_WIDTH_MM) / canvas.width

      const pdf = new jsPDF({
        unit: 'mm',
        format: [A4_WIDTH_MM, Math.max(pdfHeight, 1)],
        orientation: 'portrait',
      })
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, pdfHeight)
      pdf.save(`${fileName}.pdf`)
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
