import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { formatCurrency, formatDate, getQuoteStatusClass, formatLabel } from '@/lib/utils/format'
import QuotesCharts from '@/components/modules/reports/QuotesCharts'

export const metadata = { title: 'Quotes Report — Aura Plus ERP' }

export default async function QuotesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!['super_admin', 'manager', 'accountant'].includes(currentUser?.role ?? '')) redirect('/dashboard')

  const params = await searchParams
  const year = parseInt(params.year ?? new Date().getFullYear().toString())
  const now = new Date()

  const startOfYear = new Date(year, 0, 1).toISOString()
  const endOfYear = new Date(year + 1, 0, 1).toISOString()

  const { data: quotes } = await supabase
    .from('quotations')
    .select(`
      id, quote_number, status, total, created_at, sent_at, accepted_at, rejected_at,
      salesperson:assigned_salesperson(full_name),
      customer:customer_id(company_name)
    `)
    .gte('created_at', startOfYear)
    .lt('created_at', endOfYear)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const allQuotes = quotes ?? []

  // Status breakdown
  const statusBreakdown = ['draft', 'sent', 'accepted', 'rejected', 'expired'].map(status => ({
    status,
    count: allQuotes.filter(q => q.status === status).length,
    value: allQuotes.filter(q => q.status === status).reduce((s, q) => s + (q.total ?? 0), 0),
  }))

  // Conversion funnel
  const total = allQuotes.length
  const sent = allQuotes.filter(q => q.status !== 'draft').length
  const accepted = allQuotes.filter(q => q.status === 'accepted').length
  const rejected = allQuotes.filter(q => q.status === 'rejected').length
  const convRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0

  // Average quote value
  const avgValue = total > 0 ? allQuotes.reduce((s, q) => s + (q.total ?? 0), 0) / total : 0

  // Avg time to acceptance (hours)
  const acceptedWithTimes = allQuotes.filter(q => q.status === 'accepted' && q.sent_at && q.accepted_at)
  const avgHoursToAccept = acceptedWithTimes.length > 0
    ? Math.round(acceptedWithTimes.reduce((s, q) => {
        return s + (new Date(q.accepted_at!).getTime() - new Date(q.sent_at!).getTime()) / 3600000
      }, 0) / acceptedWithTimes.length)
    : 0

  // Salesperson breakdown
  const salesMap: Record<string, { name: string; sent: number; accepted: number; value: number }> = {}
  allQuotes.forEach(q => {
    const name = (q.salesperson as { full_name: string } | null)?.full_name ?? 'Unassigned'
    if (!salesMap[name]) salesMap[name] = { name, sent: 0, accepted: 0, value: 0 }
    if (q.status !== 'draft') salesMap[name].sent++
    if (q.status === 'accepted') { salesMap[name].accepted++; salesMap[name].value += q.total ?? 0 }
  })
  const salespersonData = Object.values(salesMap)
    .sort((a, b) => b.value - a.value)
    .map(sp => ({
      name: sp.name,
      sent: sp.sent,
      accepted: sp.accepted,
      value: sp.value,
      rate: sp.sent > 0 ? Math.round((sp.accepted / sp.sent) * 100) : 0,
    }))

  // Monthly quote volumes
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyData = MONTHS.map((month, i) => {
    const monthQuotes = allQuotes.filter(q => new Date(q.created_at).getMonth() === i)
    return {
      month,
      sent: monthQuotes.filter(q => q.status !== 'draft').length,
      accepted: monthQuotes.filter(q => q.status === 'accepted').length,
      rejected: monthQuotes.filter(q => q.status === 'rejected').length,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Reports
          </Link>
          <h1 className="page-title">Quotes Report</h1>
          <p className="page-subtitle">Quote pipeline performance for {year}</p>
        </div>
        <div className="flex items-center gap-2">
          {[year - 1, year, year + 1].filter(y => y <= now.getFullYear()).map(y => (
            <Link key={y} href={`/reports/quotes?year=${y}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                y === year ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}>
              {y}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg flex items-center justify-center mb-2">
            <FileText className="w-4 h-4" />
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Quotes</div>
          <div className="text-xs text-slate-400">{formatCurrency(avgValue)} avg value</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="stat-value text-green-600">{convRate}%</div>
          <div className="stat-label">Conversion Rate</div>
          <div className="text-xs text-slate-400">{accepted} accepted</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg flex items-center justify-center mb-2">
            <XCircle className="w-4 h-4" />
          </div>
          <div className="stat-value text-red-500">{rejected}</div>
          <div className="stat-label">Rejected</div>
          <div className="text-xs text-slate-400">{sent > 0 ? Math.round((rejected / sent) * 100) : 0}% rejection rate</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <div className="stat-value">{avgHoursToAccept}h</div>
          <div className="stat-label">Avg Time to Accept</div>
          <div className="text-xs text-slate-400">from sent to accepted</div>
        </div>
      </div>

      {/* Charts */}
      <QuotesCharts monthlyData={monthlyData} salespersonData={salespersonData} statusBreakdown={statusBreakdown} />

      {/* Salesperson table */}
      {salespersonData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Salesperson Breakdown</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Salesperson</th><th>Sent</th><th>Accepted</th><th>Rate</th><th>Won Value</th></tr></thead>
            <tbody>
              {salespersonData.map((sp, i) => (
                <tr key={i}>
                  <td className="font-medium text-sm">{sp.name}</td>
                  <td className="text-sm text-slate-500">{sp.sent}</td>
                  <td className="text-sm text-green-600 font-semibold">{sp.accepted}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-1.5">
                        <div className="bg-[#0066FF] rounded-full h-1.5" style={{ width: `${sp.rate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[#0066FF]">{sp.rate}%</span>
                    </div>
                  </td>
                  <td className="font-semibold text-sm text-[#0A1628] dark:text-white">{formatCurrency(sp.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent quotes */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">All Quotes {year}</h2>
        </div>
        <table className="data-table">
          <thead><tr><th>Quote #</th><th>Customer</th><th>Status</th><th>Value</th><th>Created</th></tr></thead>
          <tbody>
            {allQuotes.slice(0, 20).map(q => {
              const customer = q.customer as { company_name: string } | null
              return (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quotations/${q.id}`} className="font-mono text-xs font-semibold text-[#0066FF] hover:underline">
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="text-sm text-slate-500">{customer?.company_name ?? '—'}</td>
                  <td><span className={`badge ${getQuoteStatusClass(q.status)} text-xs`}>{formatLabel(q.status)}</span></td>
                  <td className="font-semibold text-sm">{formatCurrency(q.total)}</td>
                  <td className="text-xs text-slate-400">{formatDate(q.created_at)}</td>
                </tr>
              )
            })}
            {allQuotes.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No quotes for {year}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
