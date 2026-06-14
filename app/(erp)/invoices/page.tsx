import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Receipt, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate, getInvoiceStatusClass, formatLabel } from '@/lib/utils/format'

export const metadata = { title: 'Invoices — Aura Plus ERP' }

const STATUS_TABS = [
  { label: 'All',           value: '' },
  { label: 'Draft',         value: 'draft' },
  { label: 'Sent',          value: 'sent' },
  { label: 'Partially Paid',value: 'partially_paid' },
  { label: 'Paid',          value: 'paid' },
  { label: 'Overdue',       value: 'overdue' },
]

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? ''
  const search = params.q ?? ''
  const page = parseInt(params.page ?? '1')
  const pageSize = 25

  let query = supabase
    .from('invoices')
    .select(`
      id, invoice_number, invoice_type, status, total,
      amount_paid, outstanding_balance, due_date,
      created_at, sent_at, paid_at,
      customers:customer_id(company_name, contact_person)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (search) query = query.ilike('invoice_number', `%${search}%`)

  const { data: invoices, count } = await query

  // Status counts
  const statusCounts = await Promise.all(
    STATUS_TABS.slice(1).map(tab =>
      supabase.from('invoices').select('id', { count: 'exact' })
        .eq('status', tab.value).is('deleted_at', null)
    )
  )

  // Financial summary
  const [totalRevenue, totalOutstanding, overdueCount] = await Promise.all([
    supabase.from('invoices').select('amount_paid').eq('status', 'paid').is('deleted_at', null),
    supabase.from('invoices').select('outstanding_balance').not('status', 'eq', 'paid').is('deleted_at', null),
    supabase.from('invoices').select('id', { count: 'exact' }).eq('status', 'overdue').is('deleted_at', null),
  ])

  const revenue = (totalRevenue.data ?? []).reduce((s, i) => s + (i.amount_paid ?? 0), 0)
  const outstanding = (totalOutstanding.data ?? []).reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{count ?? 0} invoices</p>
        </div>
        <Link href="/invoices/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Revenue (Paid)</div>
          <div className="stat-value text-green-600 dark:text-green-400">{formatCurrency(revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding Balance</div>
          <div className="stat-value text-amber-600 dark:text-amber-400">{formatCurrency(outstanding)}</div>
        </div>
        <div className={`stat-card ${(overdueCount.count ?? 0) > 0 ? 'border-red-200 dark:border-red-900' : ''}`}>
          <div className="stat-label">Overdue Invoices</div>
          <div className={`stat-value ${(overdueCount.count ?? 0) > 0 ? 'text-red-500' : ''}`}>
            {overdueCount.count ?? 0}
          </div>
          {(overdueCount.count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
              <AlertCircle className="w-3 h-3" /> Requires attention
            </div>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B] overflow-x-auto">
        <Link
          href="/invoices"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            !statusFilter ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
          }`}
        >
          All
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${!statusFilter ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>
            {count ?? 0}
          </span>
        </Link>
        {STATUS_TABS.slice(1).map((tab, i) => (
          <Link
            key={tab.value}
            href={`/invoices?status=${tab.value}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              statusFilter === tab.value ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === tab.value ? 'bg-[#0066FF]/10 text-[#0066FF]' :
              tab.value === 'overdue' && (statusCounts[i]?.count ?? 0) > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'
            }`}>
              {statusCounts[i]?.count ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {(invoices ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No invoices found</h3>
            <p className="text-sm text-slate-400 mb-4">
              {statusFilter ? `No ${statusFilter.replace('_', ' ')} invoices` : 'Create your first invoice to get started.'}
            </p>
            {!statusFilter && (
              <Link href="/invoices/new" className="btn-primary">
                <Plus className="w-4 h-4" /> New Invoice
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Due Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(invoices ?? []).map((inv) => {
                  const customer = inv.customers as { company_name: string; contact_person: string | null } | null
                  const isOverdue = inv.status === 'overdue'
                  const isDueSoon = inv.due_date && new Date(inv.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    && !['paid', 'overdue'].includes(inv.status)

                  return (
                    <tr key={inv.id} className={isOverdue ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                      <td>
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-[#0066FF] hover:underline">
                          {inv.invoice_number}
                        </Link>
                        {inv.invoice_type === 'proforma' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">Proforma</div>
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-sm text-[#0A1628] dark:text-white">{customer?.company_name ?? '—'}</div>
                        {customer?.contact_person && (
                          <div className="text-xs text-slate-400">{customer.contact_person}</div>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-slate-500 capitalize">{inv.invoice_type}</span>
                      </td>
                      <td className="font-semibold text-sm text-[#0A1628] dark:text-white">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {inv.amount_paid > 0 ? formatCurrency(inv.amount_paid) : '—'}
                      </td>
                      <td>
                        {inv.outstanding_balance > 0 ? (
                          <span className={`text-sm font-semibold ${isOverdue ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                            {formatCurrency(inv.outstanding_balance)}
                          </span>
                        ) : (
                          <span className="text-sm text-green-600">Paid ✓</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getInvoiceStatusClass(inv.status)}`}>
                          {formatLabel(inv.status)}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        {inv.due_date ? (
                          <span className={`text-xs font-medium ${
                            isOverdue ? 'text-red-500' :
                            isDueSoon ? 'text-amber-500' :
                            'text-slate-400'
                          }`}>
                            {formatDate(inv.due_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <Link href={`/invoices/${inv.id}`} className="text-xs text-[#0066FF] hover:underline font-medium whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <p className="text-sm text-slate-400">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/invoices?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/invoices?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
