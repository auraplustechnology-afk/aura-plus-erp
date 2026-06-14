import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { formatCurrency, formatDate, getQuoteStatusClass, formatLabel } from '@/lib/utils/format'

export const metadata = { title: 'Quotations — Aura Plus ERP' }

const STATUS_TABS = [
  { label: 'All',      value: '' },
  { label: 'Draft',    value: 'draft' },
  { label: 'Sent',     value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Expired',  value: 'expired' },
]

export default async function QuotationsPage({
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
  const pageSize = 20

  let query = supabase
    .from('quotations')
    .select(`
      id, quote_number, status, total, subtotal, discount_amount,
      created_at, sent_at, accepted_at, valid_until,
      customers:customer_id(company_name),
      salesperson:assigned_salesperson(full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (search) query = query.ilike('quote_number', `%${search}%`)

  const { data: quotes, count } = await query

  // Status counts for tabs
  const statusCounts = await Promise.all(
    STATUS_TABS.slice(1).map(tab =>
      supabase.from('quotations').select('id', { count: 'exact' })
        .eq('status', tab.value).is('deleted_at', null)
    )
  )

  const totalPages = Math.ceil((count ?? 0) / pageSize)
  const totalValue = (quotes ?? []).reduce((s, q) => s + (q.total ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{count ?? 0} quotes · {formatCurrency(totalValue)} total value</p>
        </div>
        <Link href="/quotations/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Quote
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B] overflow-x-auto">
        <Link
          href={`/quotations${search ? `?q=${search}` : ''}`}
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
            href={`/quotations?status=${tab.value}${search ? `&q=${search}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              statusFilter === tab.value ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === tab.value ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>
              {statusCounts[i]?.count ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {(quotes ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No quotations yet</h3>
            <p className="text-sm text-slate-400 mb-4">Create your first quotation to get started.</p>
            <Link href="/quotations/new" className="btn-primary">
              <Plus className="w-4 h-4" /> New Quote
            </Link>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Salesperson</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Date</th>
                  <th className="hidden lg:table-cell">Valid Until</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(quotes ?? []).map((q) => {
                  const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status === 'sent'
                  return (
                    <tr key={q.id}>
                      <td>
                        <Link href={`/quotations/${q.id}`} className="font-mono text-sm font-semibold text-[#0066FF] hover:underline">
                          {q.quote_number}
                        </Link>
                      </td>
                      <td>
                        <span className="font-medium text-[#0A1628] dark:text-white text-sm">
                          {(q.customers as { company_name: string } | null)?.company_name ?? '—'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell text-sm text-slate-500">
                        {(q.salesperson as { full_name: string } | null)?.full_name ?? '—'}
                      </td>
                      <td>
                        <span className="font-semibold text-[#0A1628] dark:text-white text-sm">{formatCurrency(q.total)}</span>
                        {q.discount_amount > 0 && (
                          <div className="text-xs text-slate-400">Disc: {formatCurrency(q.discount_amount)}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isExpired ? 'badge-danger' : getQuoteStatusClass(q.status)}`}>
                          {isExpired ? 'Expired' : formatLabel(q.status)}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell text-sm text-slate-400">{formatDate(q.created_at)}</td>
                      <td className="hidden lg:table-cell">
                        {q.valid_until ? (
                          <span className={`text-xs font-medium ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                            {formatDate(q.valid_until)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <Link href={`/quotations/${q.id}`} className="text-xs text-[#0066FF] hover:underline font-medium whitespace-nowrap">
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
                    <Link href={`/quotations?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/quotations?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>
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
