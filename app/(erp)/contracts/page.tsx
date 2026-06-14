import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate, formatLabel } from '@/lib/utils/format'

export const metadata = { title: 'Maintenance Contracts — Aura Plus ERP' }

const STATUS_COLORS: Record<string, string> = {
  active:          'badge-success',
  expired:         'badge-danger',
  cancelled:       'badge-default',
  pending_renewal: 'badge-warning',
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? ''
  const page = parseInt(params.page ?? '1')
  const pageSize = 20

  const now = new Date()
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 3600000).toISOString()

  let query = supabase
    .from('maintenance_contracts')
    .select(`
      id, contract_number, contract_name, status, value, billing_cycle,
      start_date, end_date, renewal_date, created_at,
      customer:customer_id(id, company_name, contact_person)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: contracts, count } = await query

  const [activeCount, expiringSoon, totalValue] = await Promise.all([
    supabase.from('maintenance_contracts').select('id', { count: 'exact' }).eq('status', 'active').is('deleted_at', null),
    supabase.from('maintenance_contracts').select('id', { count: 'exact' })
      .eq('status', 'active').lte('end_date', thirtyDaysFromNow).is('deleted_at', null),
    supabase.from('maintenance_contracts').select('value').eq('status', 'active').is('deleted_at', null),
  ])

  const annualValue = (totalValue.data ?? []).reduce((s, c) => s + (c.value ?? 0), 0)
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  const TABS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Expiring Soon', value: 'expiring' },
    { label: 'Expired', value: 'expired' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Contracts</h1>
          <p className="page-subtitle">{count ?? 0} contracts · {formatCurrency(annualValue)} active value</p>
        </div>
        <Link href="/contracts/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Contract
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="stat-label">Active Contracts</span>
          </div>
          <div className="stat-value text-green-600">{activeCount.count ?? 0}</div>
        </div>
        <div className={`stat-card ${(expiringSoon.count ?? 0) > 0 ? 'border-amber-200 dark:border-amber-900' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="stat-label">Expiring in 30 Days</span>
          </div>
          <div className={`stat-value ${(expiringSoon.count ?? 0) > 0 ? 'text-amber-500' : ''}`}>
            {expiringSoon.count ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-4 h-4 text-[#0066FF]" />
            <span className="stat-label">Active Value</span>
          </div>
          <div className="text-lg font-bold text-[#0A1628] dark:text-white">{formatCurrency(annualValue)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B] overflow-x-auto">
        {TABS.map(tab => (
          <Link key={tab.value}
            href={`/contracts${tab.value ? `?status=${tab.value}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${statusFilter === tab.value ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Contracts table */}
      <div className="card overflow-hidden">
        {(contracts ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No contracts found</h3>
            <p className="text-sm text-slate-400 mb-4">Create maintenance contracts to track recurring service agreements.</p>
            <Link href="/contracts/new" className="btn-primary"><Plus className="w-4 h-4" /> New Contract</Link>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Customer</th>
                  <th>Value</th>
                  <th>Cycle</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Start</th>
                  <th className="hidden md:table-cell">End</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(contracts ?? []).map((contract) => {
                  const customer = contract.customer as { id: string; company_name: string; contact_person: string | null } | null
                  const endDate = new Date(contract.end_date)
                  const isExpiringSoon = endDate < new Date(thirtyDaysFromNow) && contract.status === 'active'
                  const isExpired = endDate < now && contract.status === 'active'

                  return (
                    <tr key={contract.id} className={isExpired ? 'bg-red-50/30 dark:bg-red-950/10' : isExpiringSoon ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                      <td>
                        <Link href={`/contracts/${contract.id}`} className="font-mono text-sm font-semibold text-[#0066FF] hover:underline block">
                          {contract.contract_number}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[160px]">{contract.contract_name}</div>
                      </td>
                      <td>
                        <div className="text-sm font-medium text-[#0A1628] dark:text-white">{customer?.company_name ?? '—'}</div>
                        {customer?.contact_person && <div className="text-xs text-slate-400">{customer.contact_person}</div>}
                      </td>
                      <td className="font-semibold text-sm text-[#0A1628] dark:text-white">{formatCurrency(contract.value)}</td>
                      <td>
                        <span className="badge badge-default capitalize">{contract.billing_cycle}</span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[contract.status] ?? 'badge-default'}`}>
                          {formatLabel(contract.status)}
                        </span>
                        {isExpiringSoon && !isExpired && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Expiring soon
                          </div>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-xs text-slate-400">{formatDate(contract.start_date)}</td>
                      <td className="hidden md:table-cell">
                        <span className={`text-xs font-medium ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-slate-400'}`}>
                          {formatDate(contract.end_date)}
                        </span>
                      </td>
                      <td>
                        <Link href={`/contracts/${contract.id}`} className="text-xs text-[#0066FF] hover:underline font-medium">View →</Link>
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
                  {page > 1 && <Link href={`/contracts?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>}
                  {page < totalPages && <Link href={`/contracts?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
