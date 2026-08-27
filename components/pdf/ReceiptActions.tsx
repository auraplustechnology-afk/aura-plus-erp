'use client'

import { useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'

interface ReceiptActionsProps {
  fileName: string
  targetId: string
}

const RECEIPT_WIDTH_MM = 80

export default function ReceiptActions({ fileName, targetId }: ReceiptActionsProps) {
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
      const pdfHeight = (canvas.height * RECEIPT_WIDTH_MM) / canvas.width

      const pdf = new jsPDF({
        unit: 'mm',
        format: [RECEIPT_WIDTH_MM, Math.max(pdfHeight, 1)],
        orientation: 'portrait',
      })
      pdf.addImage(imgData, 'JPEG', 0, 0, RECEIPT_WIDTH_MM, pdfHeight)
      pdf.save(`${fileName}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Could not generate the receipt PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="no-print receipt-action-bar">
      <button onClick={() => window.print()} className="receipt-action-btn receipt-action-btn-secondary">
        <Printer className="w-4 h-4" /> Print
      </button>
      <button onClick={handleDownload} disabled={downloading} className="receipt-action-btn receipt-action-btn-primary">
        {downloading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</>
          : <><Download className="w-4 h-4" /> Download</>
        }
      </button>
    </div>
  )
}
