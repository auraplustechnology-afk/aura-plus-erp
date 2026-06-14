'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Clock, AlertTriangle } from 'lucide-react'

const WARNING_BEFORE_MS = 2 * 60 * 1000  // Warn 2 minutes before timeout
const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

interface SessionTimeoutProps {
  timeoutMinutes?: number
}

export default function SessionTimeout({ timeoutMinutes = 60 }: SessionTimeoutProps) {
  const router = useRouter()
  const supabase = createClient()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(120)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const TIMEOUT_MS = timeoutMinutes * 60 * 1000

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const signOut = useCallback(async () => {
    clearTimers()
    setShowWarning(false)
    await supabase.auth.signOut()
    router.push('/login?error=session_expired')
  }, [clearTimers, router, supabase])

  const resetTimer = useCallback(() => {
    clearTimers()
    setShowWarning(false)

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(Math.floor(WARNING_BEFORE_MS / 1000))
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, TIMEOUT_MS - WARNING_BEFORE_MS)

    // Set sign-out timer
    timeoutRef.current = setTimeout(signOut, TIMEOUT_MS)
  }, [clearTimers, signOut, TIMEOUT_MS])

  useEffect(() => {
    resetTimer()
    EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }))
    return () => {
      clearTimers()
      EVENTS.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [resetTimer, clearTimers])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-[#0A1628] dark:text-white mb-2">
          Session Expiring
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          You&apos;ve been inactive. Your session will expire in:
        </p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-amber-500" />
          <span className="text-3xl font-bold text-amber-600">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={signOut}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            Sign Out Now
          </button>
          <button
            onClick={resetTimer}
            className="btn-primary flex-1 justify-center text-sm"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  )
}
