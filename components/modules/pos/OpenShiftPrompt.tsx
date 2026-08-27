'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { openShift } from '@/lib/actions/pos-shifts'

export default function OpenShiftPrompt({ userName }: { userName: string }) {
  const router = useRouter()
  const [openingFloat, setOpeningFloat] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await openShift(openingFloat)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold text-[#0A1628] dark:text-white">No Open Shift</h1>
        <p className="text-sm text-slate-400 mt-1 mb-5">
          {userName}, open a shift with your starting cash float to begin ringing up sales.
        </p>

        <form onSubmit={handleOpen} className="space-y-4 text-left">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="form-label">Opening Cash Float</label>
            <input
              type="number" min="0" step="0.01" autoFocus
              className="form-input text-lg font-semibold"
              value={openingFloat}
              onChange={e => setOpeningFloat(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening...</> : 'Open Shift & Start Selling'}
          </button>
        </form>
      </div>
    </div>
  )
}
