import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Headphones, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { formatDate, getTicketStatusClass, getPriorityClass, formatLabel } from '@/lib/utils/format'

export const metadata = { title: 'My Tickets — Aura Plus ERP' }

export default async function TechnicianTicketsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, issue_description, priority, status,
      sla_due_at, created_at,
      customer:customer_id(company_name, contact_person, phone),
      product:product_id(product_name, sku)
    `)
    .eq('assigned_technician_id', authUser.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const open = (tickets ?? []).filter(t => !['resolved', 'closed'].includes(t.status))
  const resolved = (tickets ?? []).filter(t => ['resolved', 'closed'].includes(t.status))

  if ((tickets ?? []).length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-100 dark:bg-[#1E2A3B] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Headphones className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-2">No tickets assigned</h2>
        <p className="text-slate-400 text-sm">You have no support tickets assigned to you.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white">My Tickets</h1>
        <p className="text-sm text-slate-400 mt-0.5">{open.length} open · {resolved.length} resolved</p>
      </div>

      {open.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open</h2>
          {open.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved</h2>
          {resolved.slice(0, 5).map(ticket => <TicketCard key={ticket.id} ticket={ticket} muted />)}
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket, muted }: {
  ticket: {
    id: string; ticket_number: string; issue_description: string;
    priority: string; status: string; sla_due_at: string | null; created_at: string;
    customer: { company_name: string; contact_person: string | null; phone: string | null } | null
    product: { product_name: string; sku: string } | null
  }
  muted?: boolean
}) {
  const now = new Date()
  const slaDate = ticket.sla_due_at ? new Date(ticket.sla_due_at) : null
  const slaBreached = slaDate && slaDate < now && !['resolved', 'closed'].includes(ticket.status)
  const slaDueSoon = slaDate && slaDate > now &&
    slaDate.getTime() - now.getTime() < 2 * 60 * 60 * 1000 // within 2 hours
  const customer = ticket.customer

  return (
    <Link
      href={`/my-tickets/${ticket.id}`}
      className={`card block p-4 hover:shadow-md transition-all group ${muted ? 'opacity-60' : ''} ${slaBreached ? 'border-red-200 dark:border-red-900' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-semibold text-[#0066FF]">{ticket.ticket_number}</span>
            <span className={`badge ${getPriorityClass(ticket.priority)} text-xs`}>{formatLabel(ticket.priority)}</span>
            <span className={`badge ${getTicketStatusClass(ticket.status)} text-xs`}>{formatLabel(ticket.status)}</span>
          </div>

          <p className="text-sm font-medium text-[#0A1628] dark:text-white line-clamp-2 mb-2">
            {ticket.issue_description}
          </p>

          {customer && (
            <div className="text-xs text-slate-400">{customer.company_name}{customer.contact_person ? ` · ${customer.contact_person}` : ''}</div>
          )}
          {ticket.product && (
            <div className="text-xs text-slate-400 mt-0.5">{ticket.product.product_name}</div>
          )}

          {slaDate && !['resolved', 'closed'].includes(ticket.status) && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 font-medium ${slaBreached ? 'text-red-500' : slaDueSoon ? 'text-amber-500' : 'text-slate-400'}`}>
              {slaBreached && <AlertCircle className="w-3 h-3" />}
              <Clock className="w-3 h-3" />
              {slaBreached ? `SLA breached ${formatDate(ticket.sla_due_at!)}` : `Due ${formatDate(ticket.sla_due_at!)}`}
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#0066FF] transition-colors flex-shrink-0" />
      </div>
    </Link>
  )
}
