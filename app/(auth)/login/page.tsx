'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam === 'inactive') {
      setError('Your account has been deactivated. Please contact your administrator.')
    } else if (errParam === 'no_profile') {
      setError('Your account is not fully set up. Please contact your administrator.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id)
    }

    const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
    router.push(redirectTo)
    router.refresh()
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
          <h1 className="text-white text-xl font-semibold">Aura Plus ERP</h1>
          <p className="text-blue-100 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="form-input" placeholder="you@auraplustechnologies.com"
                required autoComplete="email" autoFocus />
            </div>

            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} className="form-input pr-10"
                  placeholder="Enter your password" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="/reset-password" className="text-sm text-[#0066FF] hover:text-[#0052CC] font-medium">
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={loading || !email || !password}
              className="w-full btn-primary justify-center py-2.5 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
      <p className="text-center text-blue-200/50 text-xs mt-6">
        Aura Plus ERP &copy; {new Date().getFullYear()} &middot; Aura Plus Technologies &middot; Lusaka, Zambia
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-96 bg-white/10 rounded-2xl animate-pulse" />}>
      <LoginForm />
    </Suspense>
  )
}
