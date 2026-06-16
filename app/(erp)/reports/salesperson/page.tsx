import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, TrendingUp, Users, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export const metadata = { title: 'Salesperson Performance — Aura Plus ERP' }

export default async function SalespersonReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!['super_admin', 'manager'].includes(currentUser?.role ?? '')) redirect('/dashboard')

  const params = await searchParams
  const period = params.period ?? 'month'
  const now = new Date()

  let dateFrom = ''
  switch (period) {
    case 'today': dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(); break
    case 'week':  dateFrom = new Date(now.getTime() - 7 * 24 * 3600000).toISOString(); break
    case 'month': dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); break
    case 'year':  dateFrom = new Date(now.getFullYear(), 0, 1).toISOString(); break
  }

  // Get all sales team members
  const { data: salespeople } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('role', ['sales', 'super_admin', 'manager'])
    .eq('is_active', true)

  // Get invoices for period
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, status, created_by, created_at')
    .gte('created_at', dateFrom)
    .is('deleted_at', null)

  // Get quotations for period
  const { data: quotations } = await supabase
    .from('quotations')
    .select('total, status, assigned_salesperson')
    .gte('created_at', dateFrom)
    .is('deleted_at', null)

  // Get leads for period
  const { data: leads } = await supabase
    .from('leads')
    .select('id, stage, assigned_to')
    .gte('created_at', dateFrom)
    .is('deleted_at', null)

  // Build performance data per salesperson
  const performance = (salespeople ?? []).map(sp => {
    const spInvoices = (invoices ?? []).filter(i => i.created_by === sp.id)
    const spPaid = spInvoices.filter(i => i.status === 'paid')
    const spQuotes = (quotations ?? []).filter(q => q.assigned_salesperson === sp.id)
    const spLeads = (leads ?? []).filter(l => l.assigned_to === sp.id)
    const spConverted = spLeads.filter(l => l.stage === 'won')

    const revenue = spPaid.reduce((s, i) => s + (i.total ?? 0), 0)
    const avgDeal = spPaid.length > 0 ? revenue / spPaid.length : 0
    const convRate = spLeads.length > 0 ? Math.round((spConverted.length / spLeads.length) * 100) : 0
    const quoteConv = spQuotes.length > 0
      ? Math.round((spQuotes.filter(q => q.status === 'accepted').length / spQuotes.length) * 100)
      : 0

    return {
      id: sp.id,
      name: sp.full_name,
      email: sp.email,
      revenue,
      sales: spPaid.length,
      avgDeal,
      leadsAssigned: spLeads.length,
      leadsConverted: spConverted.length,
      convRate,
      quotesCreated: spQuotes.length,
      quoteConv,
      totalInvoiced: spInvoices.reduce((s, i) => s + (i.total ?? 0), 0),
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = performance.reduce((s, sp) => s + sp.revenue, 0)
  const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year',  label: 'This Year' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Reports
          </Link>
          <h1 className="page-title">Salesperson Performance</h1>
          <p className="page-subtitle">Revenue and conversion by team member</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Link key={p.value} href={`/reports/salesperson?period=${p.value}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                period === p.value
                  ? 'bg-[#0066FF] border-[#0066FF] text-white'
                  : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Top performer banner */}
      {performance[0] && performance[0].revenue > 0 && (
        <div className="card p-5 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-900">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-950/40 rounded-full flex items-center justify-center text-yellow-600 text-xl font-bold flex-shrink-0">
              {performance[0].name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Top Performer</span>
              </div>
              <div className="text-xl font-bold text-[#0A1628] dark:text-white">{performance[0].name}</div>
              <div className="text-sm text-slate-500">{formatCurrency(performance[0].revenue)} revenue · {performance[0].sales} sales · {performance[0].convRate}% lead conversion</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
          <div className="stat-value text-green-600">{formatCurrency(totalRevenue)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <div className="stat-value">{performance.length}</div>
          <div className="stat-label">Sales Team Members</div>
        </div>
        <div className="stat-card">
          <Target className="w-5 h-5 text-purple-500 mb-2" />
          <div className="stat-value">{performance.reduce((s, sp) => s + sp.sales, 0)}</div>
          <div className="stat-label">Total Sales</div>
        </div>
        <div className="stat-card">
          <Trophy className="w-5 h-5 text-amber-500 mb-2" />
          <div className="stat-value">{performance.reduce((s, sp) => s + sp.leadsConverted, 0)}</div>
          <div className="stat-label">Leads Converted</div>
        </div>
      </div>

      {/* Performance table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Performance Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Salesperson</th>
                <th>Revenue</th>
                <th>Sales</th>
                <th>Avg Deal</th>
                <th>Leads</th>
                <th>Converted</th>
                <th>Lead Conv %</th>
                <th>Quotes</th>
                <th>Quote Conv %</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((sp, i) => (
                <tr key={sp.id} className={i === 0 && sp.revenue > 0 ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                  <td className={`font-bold text-sm ${i === 0 ? 'text-yellow-500' : 'text-slate-400'}`}>
                    {i === 0 ? '🏆' : i + 1}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] text-xs font-bold">
                        {sp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#0A1628] dark:text-white">{sp.name}</div>
                        <div className="text-xs text-slate-400">{sp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-bold text-sm text-green-600">{formatCurrency(sp.revenue)}</td>
                  <td className="text-sm text-center">{sp.sales}</td>
                  <td className="text-sm text-slate-500">{sp.avgDeal > 0 ? formatCurrency(sp.avgDeal) : '—'}</td>
                  <td className="text-sm text-center">{sp.leadsAssigned}</td>
                  <td className="text-sm text-center text-green-600 font-medium">{sp.leadsConverted}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-1.5">
                        <div className="bg-[#0066FF] rounded-full h-1.5" style={{ width: `${sp.convRate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[#0066FF]">{sp.convRate}%</span>
                    </div>
                  </td>
                  <td className="text-sm text-center">{sp.quotesCreated}</td>
                  <td>
                    <span className={`text-xs font-semibold ${sp.quoteConv >= 50 ? 'text-green-600' : sp.quoteConv >= 25 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {sp.quoteConv}%
                    </span>
                  </td>
                </tr>
              ))}
              {performance.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-slate-400 text-sm">No sales data for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
