'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STATUS_OPTIONS = [
  { value: 'assigned',         label: 'Assigned' },
  { value: 'in_progress',      label: 'In Progress' },
  { value: 'waiting_for_client', label: 'Waiting for Client' },
  { value: 'resolved',         label: 'Resolved' },
]

export default function TechnicianTicketActions({ ticketId, currentStatus }: {
  ticketId: string
  currentStatus: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(currentStatus)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim() && status === currentStatus) return

    setSubmitting(true)
    setError('')

    // Update status if changed
    if (status !== currentStatus) {
      const { error: statusErr } = await supabase
        .from('support_tickets')
        .update({
          status,
          ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        })
        .eq('id', ticketId)

      if (statusErr) {
        setError(statusErr.message)
        setSubmitting(false)
        return
      }
    }

    // Add comment if entered
    if (comment.trim()) {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: commentErr } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          comment: comment.trim(),
          is_internal: false,
          created_by: user?.id,
        })

      if (commentErr) {
        setError(commentErr.message)
        setSubmitting(false)
        return
      }
    }

    setComment('')
    setSubmitting(false)
    router.refresh()
  }

  const isClosed = ['resolved', 'closed'].includes(currentStatus)

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Update Ticket</h2>

      {error && (
        <div className="text-xs text-red-500 mb-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {!isClosed && (
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="form-label">
            {isClosed ? 'Add Comment' : 'Add Note / Update'}
          </label>
          <textarea
            className="form-input resize-none"
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Describe what you did, what you found, or any client feedback..."
            disabled={isClosed && false}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || (!comment.trim() && status === currentStatus)}
          className="btn-primary w-full justify-center"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
            : <><Send className="w-4 h-4" /> {comment.trim() ? 'Update & Comment' : 'Update Status'}</>
          }
        </button>
      </form>
    </div>
  )
}
