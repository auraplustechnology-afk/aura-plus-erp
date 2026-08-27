'use client'

import { useState } from 'react'
import { ScanLine } from 'lucide-react'

// Real USB/Bluetooth barcode scanners act like a keyboard — they type
// the code then send Enter. A plain focused text input that reacts to
// Enter handles both a physical scanner and a cashier typing a SKU by
// hand, so no camera library or extra dependency is needed.
export default function BarcodeScanInput({
  onScan,
  disabled,
}: {
  onScan: (code: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = value.trim()
      if (code) {
        onScan(code)
        setValue('')
      }
    }
  }

  return (
    <div className="relative">
      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        autoFocus
        disabled={disabled}
        className="form-input pl-9"
        placeholder="Scan barcode or type SKU, then Enter..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
