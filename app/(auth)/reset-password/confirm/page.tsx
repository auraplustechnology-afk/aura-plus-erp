'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Shield, CheckCircle2 } from 'lucide-react'

function ConfirmForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Invite/recovery links use a PKCE `code` param, or a legacy #access_token hash
    // that the browser client picks up automatically. Handle both.
    const code = searchParams.get('code')

    async function establishSession() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setLinkInvalid(true)
          return
        }
        setReady(true)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
      }
    })

    establishSession()

    // Give the client a moment to parse a hash-based token before giving up
    const timeout = setTimeout(() => {
      setReady(current => {
        if (!current) setLinkInvalid(true)
        return current
      })
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#0066FF]" />
              </div>
              <div className="text-left">
                <div className="text-white font-bold text-lg leading-none">AURA<span className="text-blue-200">+</span></div>
                <div className="text-blue-100 text-xs font-medium tracking-widest">TECHNOLOGIES</div>
              </div>
            </div>
          </div>
          <h1 className="text-white text-xl font-semibold">Set Your Password</h1>
          <p className="text-blue-100 text-sm mt-1">Choose a password to activate your account</p>
        </div>

        <div className="p-8">
          {linkInvalid ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                This link is invalid or has expired. Please ask your administrator to send a new invitation, or request a new reset link.
              </p>
              <a href="/reset-password" className="btn-primary inline-flex justify-center py-2.5">
                Request a new link
              </a>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-2">Password set!</h2>
              <p className="text-slate-500 text-sm">Taking you to your dashboard...</p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0066FF] mb-3" />
              <p className="text-sm text-slate-400">Verifying your link...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="form-label" htmlFor="password">New password</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} className="form-input pr-10"
                    placeholder="At least 8 characters" required autoComplete="new-password" autoFocus />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
                <input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} className="form-input"
                  placeholder="Re-enter your password" required autoComplete="new-password" />
              </div>

              <button type="submit" disabled={loading || !password || !confirmPassword}
                className="w-full btn-primary justify-center py-2.5 text-base">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting password...</> : 'Set Password & Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
      <p className="text-center text-blue-200/50 text-xs mt-6">
        Aura Plus ERP &copy; {new Date().getFullYear()} &middot; Aura Plus Technologies &middot; Lusaka, Zambia
      </p>
    </div>
  )
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-96 bg-white/10 rounded-2xl animate-pulse" />}>
      <ConfirmForm />
    </Suspense>
  )
}
