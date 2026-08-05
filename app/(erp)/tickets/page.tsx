import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Headphones, AlertCircle, Clock } from 'lucide-react'
import { formatDate, getTicketStatusClass, getPriorityClass, formatLabel } from '@/lib/utils/format'
import TicketTechnicianFilter from '@/components/modules/tickets/TicketTechnicianFilter'

export const metadata = { title: 'Support Tickets — Aura Plus ERP' }

const STATUS_TABS = [
  { label: 'All',              value: '' },
  { label: 'Open',             value: 'open' },
  { label: 'Assigned',         value: 'assigned' },
  { label: 'In Progress',      value: 'in_progress' },
  { label: 'Waiting for Client', value: 'waiting_for_client' },
  { label: 'Resolved',         value: 'resolved' },
  { label: 'Closed',           value: 'closed' },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500',
  high:     'border-l-4 border-l-orange-400',
  medium:   '',
  low:      '',
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; tech?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? ''
  const priorityFilter = params.priority ?? ''
  const techFilter = params.tech ?? ''
  const page = parseInt(params.page ?? '1')
  const pageSize = 25

  let query = supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, issue_description, priority, status,
      sla_due_at, created_at, resolved_at,
      customer:customer_id(id, company_name, contact_person),
      product:product_id(product_name, sku),
      assigned_technician:assigned_technician_id(id, full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (priorityFilter) query = query.eq('priority', priorityFilter)
  if (techFilter) query = query.eq('assigned_technician_id', techFilter)

  const { data: tickets, count } = await query

  // Status counts
  const statusCounts = await Promise.all(
    STATUS_TABS.slice(1).map(tab =>
      supabase.from('support_tickets').select('id', { count: 'exact' })
        .eq('status', tab.value).is('deleted_at', null)
    )
  )

  // Summary stats
  const now = new Date()
  const [slaBreached, avgResolution, technicians] = await Promise.all([
    supabase.from('support_tickets').select('id', { count: 'exact' })
      .lt('sla_due_at', now.toISOString())
      .not('status', 'in', '("resolved","closed")')
      .is('deleted_at', null),
    supabase.from('support_tickets')
      .select('resolved_at, created_at')
      .not('resolved_at', 'is', null)
      .is('deleted_at', null)
      .limit(100),
    supabase.from('users').select('id, full_name').eq('role', 'technician').eq('is_active', true),
  ])

  // Calculate average resolution time in hours
  const resolutionTimes = (avgResolution.data ?? [])
    .map(t => (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3600000)
  const avgHours = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : 0

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">{count ?? 0} total tickets</p>
        </div>
        <Link href="/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Ticket
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Open Tickets</div>
          <div className="stat-value text-[#0066FF]">
            {statusCounts[0]?.count ?? 0}
          </div>
        </div>
        <div className={`stat-card ${(slaBreached.count ?? 0) > 0 ? 'border-red-200 dark:border-red-900' : ''}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="stat-label">SLA Breached</span>
          </div>
          <div className={`stat-value ${(slaBreached.count ?? 0) > 0 ? 'text-red-500' : ''}`}>
            {slaBreached.count ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-green-500" />
            <span className="stat-label">Avg Resolution</span>
          </div>
          <div className="stat-value text-green-600">{avgHours}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved</div>
          <div className="stat-value text-green-600">
            {(statusCounts[4]?.count ?? 0) + (statusCounts[5]?.count ?? 0)}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B] overflow-x-auto">
        <Link href={`/tickets${priorityFilter ? `?priority=${priorityFilter}` : ''}`}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${!statusFilter ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'}`}>
          All <span className={`text-xs px-1.5 py-0.5 rounded-full ${!statusFilter ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>{count ?? 0}</span>
        </Link>
        {STATUS_TABS.slice(1).map((tab, i) => (
          <Link key={tab.value}
            href={`/tickets?status=${tab.value}${priorityFilter ? `&priority=${priorityFilter}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${statusFilter === tab.value ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'}`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === tab.value ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>
              {statusCounts[i]?.count ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        {['', 'critical', 'high', 'medium', 'low'].map(p => (
          <Link key={p}
            href={`/tickets${statusFilter ? `?status=${statusFilter}&` : '?'}priority=${p}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              priorityFilter === p
                ? 'bg-[#0066FF] border-[#0066FF] text-white'
                : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
            }`}>
            {p ? formatLabel(p) : 'All Priorities'}
          </Link>
        ))}

        {technicians.data && technicians.data.length > 0 && (
          <TicketTechnicianFilter technicians={technicians.data} defaultValue={techFilter} />
        )}
      </div>

      {/* Tickets table */}
      <div className="card overflow-hidden">
        {(tickets ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Headphones className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No tickets found</h3>
            <p className="text-sm text-slate-400 mb-4">
              {statusFilter ? `No ${statusFilter.replace('_', ' ')} tickets` : 'Create your first support ticket.'}
            </p>
            {!statusFilter && (
              <Link href="/tickets/new" className="btn-primary"><Plus className="w-4 h-4" /> New Ticket</Link>
            )}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th className="hidden sm:table-cell">Priority</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Technician</th>
                  <th className="hidden lg:table-cell">SLA Due</th>
                  <th className="hidden lg:table-cell">Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(tickets ?? []).map((ticket) => {
                  const customer = ticket.customer as { id: string; company_name: string; contact_person: string | null } | null
                  const product = ticket.product as { product_name: string; sku: string } | null
                  const tech = ticket.assigned_technician as { full_name: string } | null
                  const slaDate = ticket.sla_due_at ? new Date(ticket.sla_due_at) : null
                  const slaBreachedRow = slaDate && slaDate < now && !['resolved', 'closed'].includes(ticket.status)
                  const slaDueSoon = slaDate && slaDate > now &&
                    slaDate.getTime() - now.getTime() < 4 * 3600000

                  return (
                    <tr key={ticket.id} className={`${PRIORITY_COLORS[ticket.priority] ?? ''} ${slaBreachedRow ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                      <td>
                        <Link href={`/tickets/${ticket.id}`} className="font-mono text-sm font-semibold text-[#0066FF] hover:underline block">
                          {ticket.ticket_number}
                        </Link>
                        <div className="text-xs text-slate-400 mt-0.5 max-w-[180px] truncate">
                          {ticket.issue_description}
                        </div>
                        {product && (
                          <div className="text-xs text-slate-400 mt-0.5">📦 {product.product_name}</div>
                        )}
                      </td>
                      <td>
                        <div className="text-sm font-medium text-[#0A1628] dark:text-white">{customer?.company_name ?? '—'}</div>
                        {customer?.contact_person && (
                          <div className="text-xs text-slate-400">{customer.contact_person}</div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className={`badge ${getPriorityClass(ticket.priority)}`}>
                          {formatLabel(ticket.priority)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getTicketStatusClass(ticket.status)}`}>
                          {formatLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell text-sm text-slate-500">
                        {tech ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] text-[10px] font-bold">
                              {tech.full_name.charAt(0)}
                            </div>
                            <span>{tech.full_name.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-slate-300 dark:text-slate-600">Unassigned</span>}
                      </td>
                      <td className="hidden lg:table-cell">
                        {slaDate ? (
                          <span className={`text-xs font-medium flex items-center gap-1 ${
                            slaBreachedRow ? 'text-red-500' : slaDueSoon ? 'text-amber-500' : 'text-slate-400'
                          }`}>
                            {slaBreachedRow && <AlertCircle className="w-3 h-3" />}
                            {formatDate(ticket.sla_due_at!)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="hidden lg:table-cell text-xs text-slate-400">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td>
                        <Link href={`/tickets/${ticket.id}`} className="text-xs text-[#0066FF] hover:underline font-medium whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <p className="text-sm text-slate-400">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count}</p>
                <div className="flex gap-2">
                  {page > 1 && <Link href={`/tickets?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>}
                  {page < totalPages && <Link href={`/tickets?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
