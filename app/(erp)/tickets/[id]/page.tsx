import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, ArrowUpRight, Package, FolderKanban } from 'lucide-react'
import { formatDate, getTicketStatusClass, getPriorityClass, formatLabel } from '@/lib/utils/format'
import TicketActions from '@/components/modules/tickets/TicketActions'
import TicketCommentBox from '@/components/modules/tickets/TicketCommentBox'
import EscalateModal from '@/components/modules/tickets/EscalateModal'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('support_tickets').select('ticket_number').eq('id', id).single()
  return { title: `${data?.ticket_number ?? 'Ticket'} — Aura Plus ERP` }
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()

  const [ticketRes, techniciansRes, productsRes] = await Promise.all([
    supabase.from('support_tickets').select(`
      *,
      customer:customer_id(id, company_name, contact_person, phone, email),
      product:product_id(id, sku, product_name),
      assigned_technician:assigned_technician_id(id, full_name, email, avatar_url),
      comments:ticket_comments(*, created_by_user:created_by(id, full_name, avatar_url)),
      escalated_project:escalated_to_project_id(project_number, project_name)
    `).eq('id', id).is('deleted_at', null).single(),
    supabase.from('users').select('id, full_name').eq('role', 'technician').eq('is_active', true),
    supabase.from('products').select('id, sku, product_name').eq('is_active', true),
  ])

  if (!ticketRes.data) notFound()
  const ticket = ticketRes.data

  const customer = ticket.customer as Record<string, string> | null
  const product = ticket.product as { id: string; sku: string; product_name: string } | null
  const tech = ticket.assigned_technician as { id: string; full_name: string; email: string; avatar_url: string | null } | null
  const escalatedProject = ticket.escalated_project as { project_number: string; project_name: string } | null
  const comments = [...(ticket.comments ?? [])].sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) as Array<{
    id: string; comment: string; is_internal: boolean; created_at: string
    created_by_user: { id: string; full_name: string; avatar_url: string | null } | null
  }>

  const now = new Date()
  const slaDate = ticket.sla_due_at ? new Date(ticket.sla_due_at) : null
  const slaBreached = slaDate && slaDate < now && !['resolved', 'closed'].includes(ticket.status)
  const slaDueSoon = slaDate && slaDate > now &&
    slaDate.getTime() - now.getTime() < 4 * 3600000
  const isResolved = ['resolved', 'closed'].includes(ticket.status)
  const canManage = ['super_admin', 'sales', 'manager'].includes(currentUser?.role ?? '')

  // SLA time remaining
  let slaLabel = ''
  if (slaDate && !isResolved) {
    const diffMs = slaDate.getTime() - now.getTime()
    if (diffMs < 0) {
      const overMs = Math.abs(diffMs)
      const overHrs = Math.floor(overMs / 3600000)
      slaLabel = `Breached ${overHrs}h ago`
    } else {
      const hrs = Math.floor(diffMs / 3600000)
      const mins = Math.floor((diffMs % 3600000) / 60000)
      slaLabel = hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`
    }
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Tickets
          </Link>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white font-mono">{ticket.ticket_number}</h1>
            <span className={`badge ${getPriorityClass(ticket.priority)} text-sm px-3 py-1`}>{formatLabel(ticket.priority)}</span>
            <span className={`badge ${getTicketStatusClass(ticket.status)} text-sm px-3 py-1`}>{formatLabel(ticket.status)}</span>
          </div>
          <p className="text-base font-medium text-slate-600 dark:text-slate-300">{ticket.issue_description}</p>
          <p className="text-sm text-slate-400 mt-0.5">Opened {formatDate(ticket.created_at)}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {!isResolved && !escalatedProject && (
              <EscalateModal
                ticketId={id}
                customerId={ticket.customer_id}
                ticketNumber={ticket.ticket_number}
                customers={[{ id: ticket.customer_id, company_name: customer?.company_name ?? '' }]}
              />
            )}
            <TicketActions
              ticketId={id}
              currentStatus={ticket.status}
              technicians={techniciansRes.data ?? []}
              products={productsRes.data ?? []}
              currentTechnicianId={tech?.id}
              currentProductId={product?.id}
            />
          </div>
        )}
      </div>

      {/* SLA banner */}
      {slaDate && !isResolved && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
          slaBreached
            ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
            : slaDueSoon
            ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900'
            : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900'
        }`}>
          {slaBreached
            ? <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            : <Clock className={`w-5 h-5 flex-shrink-0 ${slaDueSoon ? 'text-amber-500' : 'text-blue-500'}`} />
          }
          <div>
            <p className={`text-sm font-semibold ${slaBreached ? 'text-red-700 dark:text-red-400' : slaDueSoon ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
              {slaBreached ? 'SLA Breached' : slaDueSoon ? 'SLA Due Soon' : 'SLA Active'}
            </p>
            <p className={`text-xs ${slaBreached ? 'text-red-600 dark:text-red-500' : slaDueSoon ? 'text-amber-600' : 'text-blue-600 dark:text-blue-500'}`}>
              {slaLabel} · Due {formatDate(ticket.sla_due_at!)}
            </p>
          </div>
        </div>
      )}

      {/* Resolved banner */}
      {isResolved && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            {ticket.status === 'closed' ? 'Ticket closed' : `Resolved ${formatDate(ticket.resolved_at)}`}
          </p>
        </div>
      )}

      {/* Escalated banner */}
      {escalatedProject && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">Escalated to Project</p>
              <p className="text-xs text-purple-600">{escalatedProject.project_number} · {escalatedProject.project_name}</p>
            </div>
          </div>
          <Link href={`/projects/${ticket.escalated_to_project_id}`} className="text-xs text-purple-600 hover:underline font-medium flex items-center gap-1">
            View <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: comments thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Comments */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Activity & Comments</h2>
              <p className="text-xs text-slate-400 mt-0.5">{comments.length} comments</p>
            </div>

            {comments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No comments yet. Add the first update below.</div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
                {comments.map(comment => (
                  <div key={comment.id} className={`px-5 py-4 ${comment.is_internal ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-bold text-sm flex-shrink-0 mt-0.5">
                        {comment.created_by_user?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-[#0A1628] dark:text-white">
                            {comment.created_by_user?.full_name ?? 'Unknown'}
                          </span>
                          {comment.is_internal && (
                            <span className="badge badge-warning text-[10px]">Internal Note</span>
                          )}
                          <span className="text-xs text-slate-400 ml-auto">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add comment */}
          <TicketCommentBox ticketId={id} isResolved={isResolved} />

          {/* Resolution notes */}
          {ticket.resolution_notes && (
            <div className="card p-5 bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900">
              <h3 className="font-semibold text-sm text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Resolution Notes
              </h3>
              <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{ticket.resolution_notes}</p>
            </div>
          )}
        </div>

        {/* Right: metadata */}
        <div className="space-y-4">
          {/* Ticket info */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Ticket Info</h3>

            <div className="space-y-3">
              {customer && (
                <InfoRow label="Customer">
                  <Link href={`/customers/${customer.id}`} className="text-[#0066FF] hover:underline font-medium text-sm">
                    {customer.company_name}
                  </Link>
                  {customer.contact_person && <div className="text-xs text-slate-400">{customer.contact_person}</div>}
                  {customer.phone && <div className="text-xs text-slate-400">{customer.phone}</div>}
                </InfoRow>
              )}

              {product && (
                <InfoRow label="Product">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-[#0A1628] dark:text-white">{product.product_name}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{product.sku}</div>
                </InfoRow>
              )}

              <InfoRow label="Priority">
                <span className={`badge ${getPriorityClass(ticket.priority)}`}>{formatLabel(ticket.priority)}</span>
              </InfoRow>

              <InfoRow label="Status">
                <span className={`badge ${getTicketStatusClass(ticket.status)}`}>{formatLabel(ticket.status)}</span>
              </InfoRow>

              {slaDate && (
                <InfoRow label="SLA Due">
                  <span className={`text-sm font-medium ${slaBreached ? 'text-red-500' : 'text-[#0A1628] dark:text-white'}`}>
                    {formatDate(ticket.sla_due_at!)}
                  </span>
                </InfoRow>
              )}

              <InfoRow label="Opened">
                <span className="text-sm text-[#0A1628] dark:text-white">{formatDate(ticket.created_at)}</span>
              </InfoRow>

              {ticket.resolved_at && (
                <InfoRow label="Resolved">
                  <span className="text-sm text-green-600">{formatDate(ticket.resolved_at)}</span>
                </InfoRow>
              )}
            </div>
          </div>

          {/* Assigned technician */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Assigned Technician</h3>
            {tech ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-bold flex-shrink-0">
                  {tech.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#0A1628] dark:text-white">{tech.full_name}</div>
                  <div className="text-xs text-slate-400">{tech.email}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No technician assigned</div>
            )}
          </div>

          {/* Linked project */}
          {ticket.project_id && !escalatedProject && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Linked Project</h3>
              <Link href={`/projects/${ticket.project_id}`} className="text-sm text-[#0066FF] hover:underline flex items-center gap-1">
                <FolderKanban className="w-4 h-4" /> View Project <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  )
}
