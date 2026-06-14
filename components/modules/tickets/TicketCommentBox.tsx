'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, Lock, Globe } from 'lucide-react'
import { addTicketComment } from '@/lib/actions/tickets'

export default function TicketCommentBox({ ticketId, isResolved }: { ticketId: string; isResolved: boolean }) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setLoading(true)
    setError('')

    const result = await addTicketComment(ticketId, comment.trim(), isInternal)
    if (result.error) { setError(result.error); setLoading(false); return }

    setComment('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Add Comment</h3>

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className={`form-input resize-none transition-colors ${isInternal ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' : ''}`}
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={isInternal ? 'Internal note — only visible to your team...' : 'Add a comment or update...'}
        />

        <div className="flex items-center justify-between">
          {/* Internal toggle */}
          <button
            type="button"
            onClick={() => setIsInternal(!isInternal)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isInternal
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-400 hover:border-[#0066FF]/40'
            }`}
          >
            {isInternal ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {isInternal ? 'Internal Note' : 'Public Comment'}
          </button>

          <button
            type="submit"
            disabled={!comment.trim() || loading}
            className="btn-primary text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isInternal ? 'Add Note' : 'Post Comment'}
          </button>
        </div>

        {isInternal && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            🔒 Internal notes are only visible to your team — not to customers
          </p>
        )}
      </form>
    </div>
  )
}
