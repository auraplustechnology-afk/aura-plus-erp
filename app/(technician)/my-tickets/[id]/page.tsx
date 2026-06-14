import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Clock, AlertCircle } from 'lucide-react'
import { formatDate, getTicketStatusClass, getPriorityClass, formatLabel } from '@/lib/utils/format'
import TechnicianTicketActions from '@/components/modules/technician/TechnicianTicketActions'

export default async function TechnicianTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select(`
      *,
      customer:customer_id(company_name, contact_person, phone),
      product:product_id(product_name, sku),
      comments:ticket_comments(*, created_by_user:created_by(full_name, avatar_url))
    `)
    .eq('id', id)
    .eq('assigned_technician_id', authUser.id)
    .is('deleted_at', null)
    .single()

  if (!ticket) notFound()

  const customer = ticket.customer as { company_name: string; contact_person: string | null; phone: string | null } | null
  const product = ticket.product as { product_name: string; sku: string } | null
  const comments = (ticket.comments ?? []) as {
    id: string; comment: string; is_internal: boolean; created_at: string
    created_by_user: { full_name: string; avatar_url: string | null } | null
  }[]
  const slaDate = ticket.sla_due_at ? new Date(ticket.sla_due_at) : null
  const now = new Date()
  const slaBreached = slaDate && slaDate < now && !['resolved', 'closed'].includes(ticket.status)

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div>
        <Link href="/my-tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> My Tickets
        </Link>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-sm font-semibold text-[#0066FF]">{ticket.ticket_number}</span>
          <span className={`badge ${getPriorityClass(ticket.priority)}`}>{formatLabel(ticket.priority)}</span>
          <span className={`badge ${getTicketStatusClass(ticket.status)}`}>{formatLabel(ticket.status)}</span>
        </div>
        <p className="text-base font-semibold text-[#0A1628] dark:text-white">{ticket.issue_description}</p>
      </div>

      {slaBreached && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">SLA breached — due {formatDate(ticket.sla_due_at!)}</p>
        </div>
      )}

      {/* Ticket info */}
      <div className="card p-4 space-y-3">
        {customer && (
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Customer</div>
            <div className="text-sm font-medium text-[#0A1628] dark:text-white">{customer.company_name}</div>
            {customer.contact_person && <div className="text-xs text-slate-400">{customer.contact_person}</div>}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="text-sm text-[#0066FF] hover:underline mt-1 block">{customer.phone}</a>
            )}
          </div>
        )}
        {product && (
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Product / Device</div>
            <div className="text-sm font-medium text-[#0A1628] dark:text-white">{product.product_name}</div>
            <div className="text-xs text-slate-400 font-mono">{product.sku}</div>
          </div>
        )}
        {slaDate && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">SLA Due:</span>
            <span className={`text-xs font-medium ${slaBreached ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
              {formatDate(ticket.sla_due_at!)}
            </span>
          </div>
        )}
        <div className="text-xs text-slate-400">Opened {formatDate(ticket.created_at)}</div>
      </div>

      {/* Status update */}
      <TechnicianTicketActions ticketId={id} currentStatus={ticket.status} />

      {/* Comments thread */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Comments ({comments.length})</h2>
        </div>

        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
          {comments.map(comment => (
            <div key={comment.id} className={`px-4 py-3 ${comment.is_internal ? 'bg-amber-50 dark:bg-amber-950/10' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] text-xs font-bold">
                  {comment.created_by_user?.full_name?.charAt(0) ?? '?'}
                </div>
                <span className="text-xs font-medium text-[#0A1628] dark:text-white">
                  {comment.created_by_user?.full_name ?? 'Unknown'}
                </span>
                {comment.is_internal && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Internal</span>
                )}
                <span className="text-[10px] text-slate-400 ml-auto">{formatDate(comment.created_at)}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 ml-8">{comment.comment}</p>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No comments yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
