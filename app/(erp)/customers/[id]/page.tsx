import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Phone, Mail, MapPin, Edit2, Plus,
  FileText, Receipt, FolderKanban, Headphones,
  FileCheck, Clock, ArrowLeft, TrendingUp
} from 'lucide-react'
import { formatDate, formatCurrency, formatLabel, getInvoiceStatusClass, getQuoteStatusClass, getProjectStatusClass, getTicketStatusClass, getPriorityClass } from '@/lib/utils/format'
import CustomerEditModal from '@/components/modules/customers/CustomerEditModal'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('customers').select('company_name').eq('id', id).single()
  return { title: `${data?.company_name ?? 'Customer'} — Aura Plus ERP` }
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // Fetch customer
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!customer) notFound()

  // Fetch all related records in parallel
  const [quotations, invoices, projects, tickets, contracts, leads, activityLogs] = await Promise.all([
    supabase.from('quotations').select('id, quote_number, total, status, created_at').eq('customer_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
    supabase.from('invoices').select('id, invoice_number, total, status, amount_paid, outstanding_balance, due_date, created_at').eq('customer_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
    supabase.from('projects').select('id, project_number, project_name, status, scheduled_date, created_at').eq('customer_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
    supabase.from('support_tickets').select('id, ticket_number, issue_description, priority, status, created_at').eq('customer_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
    supabase.from('maintenance_contracts').select('id, contract_number, contract_name, status, value, end_date, billing_cycle').eq('customer_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('id, company_name, stage, expected_value, created_at').eq('converted_to_customer_id', id).is('deleted_at', null).limit(5),
    supabase.from('activity_logs').select('id, action, entity_type, entity_label, created_at, user_id, users:user_id(full_name)').or(`entity_id.eq.${id},entity_type.eq.customer`).order('created_at', { ascending: false }).limit(20),
  ])

  // Calculate totals
  const totalRevenue = (invoices.data ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const outstanding = (invoices.data ?? []).reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back */}
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Customers
      </Link>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0066FF]/10 rounded-2xl flex items-center justify-center text-[#0066FF] font-bold text-2xl flex-shrink-0">
              {customer.company_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white">{customer.company_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`badge ${customer.customer_type === 'active' ? 'badge-success' : customer.customer_type === 'prospect' ? 'badge-info' : 'badge-default'}`}>
                  {formatLabel(customer.customer_type)}
                </span>
                <span className="badge badge-default">{formatLabel(customer.source)}</span>
                {customer.tpin && <span className="text-xs text-slate-400">TPIN: {customer.tpin}</span>}
              </div>
            </div>
          </div>
          <CustomerEditModal customer={customer} />
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
          {customer.contact_person && <ContactDetail icon={<Building2 className="w-4 h-4" />} label="Contact" value={customer.contact_person} />}
          {customer.phone && <ContactDetail icon={<Phone className="w-4 h-4" />} label="Phone" value={customer.phone} href={`tel:${customer.phone}`} />}
          {customer.email && <ContactDetail icon={<Mail className="w-4 h-4" />} label="Email" value={customer.email} href={`mailto:${customer.email}`} />}
          {customer.physical_address && <ContactDetail icon={<MapPin className="w-4 h-4" />} label="Address" value={customer.physical_address} />}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Revenue" value={formatCurrency(totalRevenue)} color="green" icon={<TrendingUp className="w-4 h-4" />} />
        <SummaryCard label="Outstanding" value={formatCurrency(outstanding)} color={outstanding > 0 ? 'red' : 'slate'} icon={<Receipt className="w-4 h-4" />} />
        <SummaryCard label="Projects" value={projects.data?.length ?? 0} color="blue" icon={<FolderKanban className="w-4 h-4" />} />
        <SummaryCard label="Open Tickets" value={(tickets.data ?? []).filter(t => !['resolved', 'closed'].includes(t.status)).length} color="amber" icon={<Headphones className="w-4 h-4" />} />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Quotes + Invoices */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quotations */}
          <SectionCard
            title="Quotations"
            icon={<FileText className="w-4 h-4" />}
            count={quotations.data?.length ?? 0}
            action={{ label: 'New Quote', href: `/quotations/new?customer_id=${id}` }}
          >
            {(quotations.data ?? []).length === 0 ? (
              <EmptyState message="No quotations yet" />
            ) : (
              <table className="data-table">
                <thead><tr><th>Number</th><th>Status</th><th>Amount</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {(quotations.data ?? []).map(q => (
                    <tr key={q.id}>
                      <td className="font-mono text-xs font-semibold text-[#0066FF]">{q.quote_number}</td>
                      <td><span className={`badge ${getQuoteStatusClass(q.status)}`}>{formatLabel(q.status)}</span></td>
                      <td className="font-medium">{formatCurrency(q.total)}</td>
                      <td className="text-slate-400 text-xs">{formatDate(q.created_at)}</td>
                      <td><Link href={`/quotations/${q.id}`} className="text-xs text-[#0066FF] hover:underline">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* Invoices */}
          <SectionCard
            title="Invoices"
            icon={<Receipt className="w-4 h-4" />}
            count={invoices.data?.length ?? 0}
            action={{ label: 'New Invoice', href: `/invoices/new?customer_id=${id}` }}
          >
            {(invoices.data ?? []).length === 0 ? (
              <EmptyState message="No invoices yet" />
            ) : (
              <table className="data-table">
                <thead><tr><th>Number</th><th>Status</th><th>Total</th><th>Balance</th><th>Due</th><th></th></tr></thead>
                <tbody>
                  {(invoices.data ?? []).map(inv => (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs font-semibold text-[#0066FF]">{inv.invoice_number}</td>
                      <td><span className={`badge ${getInvoiceStatusClass(inv.status)}`}>{formatLabel(inv.status)}</span></td>
                      <td className="font-medium">{formatCurrency(inv.total)}</td>
                      <td className={inv.outstanding_balance > 0 ? 'text-red-500 font-medium text-sm' : 'text-green-600 text-sm'}>
                        {formatCurrency(inv.outstanding_balance)}
                      </td>
                      <td className="text-slate-400 text-xs">{formatDate(inv.due_date)}</td>
                      <td><Link href={`/invoices/${inv.id}`} className="text-xs text-[#0066FF] hover:underline">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* Projects */}
          <SectionCard
            title="Projects"
            icon={<FolderKanban className="w-4 h-4" />}
            count={projects.data?.length ?? 0}
            action={{ label: 'New Project', href: `/projects/new?customer_id=${id}` }}
          >
            {(projects.data ?? []).length === 0 ? (
              <EmptyState message="No projects yet" />
            ) : (
              <table className="data-table">
                <thead><tr><th>Number</th><th>Name</th><th>Status</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {(projects.data ?? []).map(p => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs font-semibold text-[#0066FF]">{p.project_number}</td>
                      <td className="font-medium text-sm max-w-[150px] truncate">{p.project_name}</td>
                      <td><span className={`badge ${getProjectStatusClass(p.status)}`}>{formatLabel(p.status)}</span></td>
                      <td className="text-slate-400 text-xs">{formatDate(p.scheduled_date)}</td>
                      <td><Link href={`/projects/${p.id}`} className="text-xs text-[#0066FF] hover:underline">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        {/* Right column: Tickets + Contracts + Activity */}
        <div className="space-y-5">
          {/* Support Tickets */}
          <SectionCard
            title="Support Tickets"
            icon={<Headphones className="w-4 h-4" />}
            count={tickets.data?.length ?? 0}
            action={{ label: 'New Ticket', href: `/tickets/new?customer_id=${id}` }}
          >
            {(tickets.data ?? []).length === 0 ? (
              <EmptyState message="No tickets yet" />
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
                {(tickets.data ?? []).map(t => (
                  <div key={t.id} className="py-2.5 px-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs text-[#0066FF] font-semibold">{t.ticket_number}</span>
                      <div className="flex items-center gap-1">
                        <span className={`badge ${getPriorityClass(t.priority)}`}>{formatLabel(t.priority)}</span>
                        <span className={`badge ${getTicketStatusClass(t.status)}`}>{formatLabel(t.status)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{t.issue_description}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Contracts */}
          {(contracts.data ?? []).length > 0 && (
            <SectionCard
              title="Contracts"
              icon={<FileCheck className="w-4 h-4" />}
              count={contracts.data?.length ?? 0}
              action={{ label: 'New Contract', href: `/contracts/new?customer_id=${id}` }}
            >
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
                {(contracts.data ?? []).map(c => (
                  <div key={c.id} className="py-2.5 px-4">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-[#0A1628] dark:text-white truncate">{c.contract_name}</span>
                      <span className={`badge badge-${c.status === 'active' ? 'success' : 'default'} text-xs`}>{formatLabel(c.status)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatCurrency(c.value)} / {c.billing_cycle}</span>
                      <span>Expires {formatDate(c.end_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Activity Timeline */}
          <div className="card">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Activity Timeline</h3>
            </div>
            <div className="p-4 space-y-3">
              {(activityLogs.data ?? []).slice(0, 12).map((log) => (
                <div key={log.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[#0A1628] dark:text-slate-200">
                      <span className="font-medium">{((log as unknown) as { users?: { full_name: string } }).users?.full_name ?? 'System'}</span>
                      {' '}{log.action.replace('_', ' ')}{' '}
                      <span className="text-slate-400">{log.entity_type}</span>
                      {log.entity_label && <span className="text-[#0066FF]"> {log.entity_label}</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.created_at)}</p>
                  </div>
                </div>
              ))}
              {(activityLogs.data ?? []).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Notes</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────
function ContactDetail({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        {href ? (
          <a href={href} className="text-sm text-[#0066FF] hover:underline truncate block">{value}</a>
        ) : (
          <div className="text-sm text-[#0A1628] dark:text-slate-200 truncate">{value}</div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-950/20 text-green-600',
    red: 'bg-red-50 dark:bg-red-950/20 text-red-500',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  }
  return (
    <div className="card p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <div className="text-lg font-bold text-[#0A1628] dark:text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

function SectionCard({ title, icon, count, action, children }: {
  title: string
  icon: React.ReactNode
  count: number
  action?: { label: string; href: string }
  children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">{title}</h3>
          <span className="text-xs bg-slate-100 dark:bg-[#1E2A3B] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
        {action && (
          <Link href={action.href} className="flex items-center gap-1 text-xs text-[#0066FF] hover:underline font-medium">
            <Plus className="w-3 h-3" />{action.label}
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-sm text-slate-400">{message}</div>
  )
}
