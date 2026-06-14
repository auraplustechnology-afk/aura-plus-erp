'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function ERPError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('ERP error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#0A1628] dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-400 mb-1">
          This page encountered an unexpected error.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-5">Ref: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/dashboard" className="btn-secondary text-sm">
            <Home className="w-4 h-4" /> Dashboard
          </Link>
          <button onClick={reset} className="btn-primary text-sm">
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    </div>
  )
}
