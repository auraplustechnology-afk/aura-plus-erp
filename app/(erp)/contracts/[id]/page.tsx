import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CheckCircle2, AlertTriangle, Receipt } from 'lucide-react'
import { formatCurrency, formatDate, formatLabel } from '@/lib/utils/format'
import GenerateInvoiceModal from '@/components/modules/contracts/GenerateInvoiceModal'
import ContractStatusModal from '@/components/modules/contracts/ContractStatusModal'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('maintenance_contracts').select('contract_number').eq('id', id).single()
  return { title: `${data?.contract_number ?? 'Contract'} — Aura Plus ERP` }
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: contract } = await supabase
    .from('maintenance_contracts')
    .select(`*, customer:customer_id(id, company_name, contact_person, phone, email)`)
    .eq('id', id).is('deleted_at', null).single()

  if (!contract) notFound()

  const { data: contractInvoices } = await supabase
    .from('contract_invoices')
    .select(`
      id, period_start, period_end, created_at,
      invoice:invoice_id(id, invoice_number, status, total, amount_paid, outstanding_balance)
    `)
    .eq('contract_id', id)
    .order('created_at', { ascending: false })

  const customer = contract.customer as Record<string, string> | null
  const now = new Date()
  const endDate = new Date(contract.end_date)
  const isExpired = endDate < now
  const isExpiringSoon = endDate > now && endDate < new Date(Date.now() + 30 * 24 * 3600000)

  const STATUS_COLORS: Record<string, string> = {
    active:          'badge-success',
    expired:         'badge-danger',
    cancelled:       'badge-default',
    pending_renewal: 'badge-warning',
  }

  const totalBilled = (contractInvoices ?? []).reduce((s, ci) => {
    const inv = ci.invoice as { total: number } | null
    return s + (inv?.total ?? 0)
  }, 0)

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/contracts" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Contracts
          </Link>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white font-mono">{contract.contract_number}</h1>
            <span className={`badge ${STATUS_COLORS[contract.status] ?? 'badge-default'} text-sm px-3 py-1`}>
              {formatLabel(contract.status)}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">{contract.contract_name}</p>
          <p className="text-sm text-slate-400 mt-0.5">{customer?.company_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/contracts/${id}/edit`} className="btn-secondary">Edit</Link>
          {contract.status === 'active' && (
            <GenerateInvoiceModal contractId={id} contractValue={contract.value} contractName={contract.contract_name} />
          )}
          <ContractStatusModal contractId={id} currentStatus={contract.status} />
        </div>
      </div>

      {/* Expiry alerts */}
      {isExpired && contract.status === 'active' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">This contract expired on {formatDate(contract.end_date)}</p>
        </div>
      )}
      {isExpiringSoon && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Contract expires on {formatDate(contract.end_date)} — consider renewal</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoice history */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Contract Value</div>
              <div className="stat-value text-[#0066FF]">{formatCurrency(contract.value)}</div>
              <div className="text-xs text-slate-400 capitalize">per {contract.billing_cycle}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Billed</div>
              <div className="stat-value">{formatCurrency(totalBilled)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Invoices Raised</div>
              <div className="stat-value">{contractInvoices?.length ?? 0}</div>
            </div>
          </div>

          {/* Invoice history */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Invoice History</h2>
              {contract.status === 'active' && (
                <GenerateInvoiceModal contractId={id} contractValue={contract.value} contractName={contract.contract_name} compact />
              )}
            </div>

            {(!contractInvoices || contractInvoices.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No invoices generated yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Generate Invoice" to create the first billing</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(contractInvoices ?? []).map((ci) => {
                    const inv = ci.invoice as { id: string; invoice_number: string; status: string; total: number; amount_paid: number; outstanding_balance: number } | null
                    return (
                      <tr key={ci.id}>
                        <td className="font-mono text-sm font-semibold text-[#0066FF]">
                          {inv ? <Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link> : '—'}
                        </td>
                        <td className="text-xs text-slate-500">
                          {formatDate(ci.period_start)} – {formatDate(ci.period_end)}
                        </td>
                        <td className="font-semibold text-sm">{formatCurrency(inv?.total ?? 0)}</td>
                        <td>
                          {inv && (
                            <span className={`badge ${
                              inv.status === 'paid' ? 'badge-success' :
                              inv.status === 'overdue' ? 'badge-danger' :
                              inv.status === 'partially_paid' ? 'badge-warning' :
                              'badge-info'
                            }`}>{formatLabel(inv.status)}</span>
                          )}
                        </td>
                        <td className={`text-sm font-medium ${(inv?.outstanding_balance ?? 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatCurrency(inv?.outstanding_balance ?? 0)}
                        </td>
                        <td>
                          {inv && <Link href={`/invoices/${inv.id}`} className="text-xs text-[#0066FF] hover:underline">View</Link>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: contract info */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Contract Info</h3>
            <div className="space-y-3 text-sm">
              {customer && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Customer</div>
                  <Link href={`/customers/${customer.id}`} className="font-medium text-[#0066FF] hover:underline">{customer.company_name}</Link>
                  {customer.contact_person && <div className="text-xs text-slate-400">{customer.contact_person}</div>}
                  {customer.phone && <div className="text-xs text-slate-400">{customer.phone}</div>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Period</div>
                  <div className="font-medium text-[#0A1628] dark:text-white">
                    {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                  </div>
                </div>
              </div>
              {contract.renewal_date && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Renewal Date</div>
                  <div className="font-medium text-[#0A1628] dark:text-white">{formatDate(contract.renewal_date)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Products covered */}
          {contract.products_covered && contract.products_covered.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Systems Covered</h3>
              <div className="space-y-2">
                {(contract.products_covered as { name: string; description?: string }[]).map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-[#0A1628] dark:text-white">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contract.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-slate-500 whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
