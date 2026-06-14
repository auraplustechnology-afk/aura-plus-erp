'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl shadow-2xl p-8">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0066FF] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm">We've sent a password reset link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-1">Reset password</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="you@auraplustechnologies.com"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
