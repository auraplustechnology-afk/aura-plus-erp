import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import SalesCharts from '@/components/modules/reports/SalesCharts'

export const metadata = { title: 'Sales Report — Aura Plus ERP' }

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!['super_admin', 'manager', 'accountant'].includes(currentUser?.role ?? '')) redirect('/dashboard')

  const params = await searchParams
  const year = parseInt(params.year ?? new Date().getFullYear().toString())
  const now = new Date()

  // Monthly revenue for the selected year
  const startOfYear = new Date(year, 0, 1).toISOString()
  const endOfYear = new Date(year + 1, 0, 1).toISOString()

  const [allInvoices, salespeople, topProductLines] = await Promise.all([
    supabase.from('invoices')
      .select('total, amount_paid, status, created_at, paid_at, customers:customer_id(company_name)')
      .gte('created_at', startOfYear)
      .lt('created_at', endOfYear)
      .is('deleted_at', null),
    supabase.from('invoices')
      .select('total, created_by, status, users:created_by(full_name)')
      .gte('created_at', startOfYear)
      .lt('created_at', endOfYear)
      .eq('status', 'paid')
      .is('deleted_at', null),
    supabase.from('invoice_lines')
      .select('description, line_total, invoice:invoice_id(status, created_at)')
      .gte('created_at', startOfYear)
      .lt('created_at', endOfYear)
      .limit(500),
  ])

  // Build monthly revenue array
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyRevenue = MONTHS.map((month, i) => {
    const monthInvoices = (allInvoices.data ?? []).filter(inv => {
      const d = new Date(inv.created_at)
      return d.getMonth() === i && inv.status === 'paid'
    })
    const revenue = monthInvoices.reduce((s, inv) => s + (inv.total ?? 0), 0)
    return { month, revenue }
  })

  // Salesperson performance
  const salesMap: Record<string, { name: string; revenue: number; count: number }> = {}
  ;(salespeople.data ?? []).forEach(inv => {
    const user = inv.users as { full_name: string } | null
    const name = user?.full_name ?? 'Unknown'
    const key = name
    if (!salesMap[key]) salesMap[key] = { name, revenue: 0, count: 0 }
    salesMap[key].revenue += inv.total ?? 0
    salesMap[key].count += 1
  })
  const salespersonData = Object.values(salesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // Top products by revenue
  const productMap: Record<string, number> = {}
  ;(topProductLines.data ?? []).forEach(line => {
    const inv = line.invoice as { status: string } | null
    if (inv?.status !== 'paid') return
    const key = line.description
    productMap[key] = (productMap[key] ?? 0) + (line.line_total ?? 0)
  })
  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, revenue]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, revenue }))

  // Summary stats
  const totalRevenue = (allInvoices.data ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalInvoiced = (allInvoices.data ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const paidCount = (allInvoices.data ?? []).filter(i => i.status === 'paid').length
  const overdueCount = (allInvoices.data ?? []).filter(i => i.status === 'overdue').length
  const outstanding = (allInvoices.data ?? []).filter(i => i.status !== 'paid').reduce((s, i) => s + ((i.total ?? 0) - (i.amount_paid ?? 0)), 0)

  // Recent paid invoices
  const recentPaid = [...(allInvoices.data ?? [])]
    .filter(i => i.status === 'paid')
    .sort((a, b) => new Date(b.paid_at ?? b.created_at).getTime() - new Date(a.paid_at ?? a.created_at).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Reports
          </Link>
          <h1 className="page-title">Sales Report</h1>
          <p className="page-subtitle">Revenue performance for {year}</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2">
          {[year - 1, year, year + 1].filter(y => y <= now.getFullYear()).map(y => (
            <Link key={y} href={`/reports/sales?year=${y}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                y === year
                  ? 'bg-[#0066FF] border-[#0066FF] text-white'
                  : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}>
              {y}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <KPICard label="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={<DollarSign className="w-5 h-5" />} color="blue" />
        <KPICard label="Outstanding" value={formatCurrency(outstanding)} icon={<TrendingDown className="w-5 h-5" />} color={outstanding > 0 ? 'red' : 'slate'} />
        <KPICard label="Paid Invoices" value={paidCount} icon={<TrendingUp className="w-5 h-5" />} color="green"
          sub={overdueCount > 0 ? `${overdueCount} overdue` : undefined} />
      </div>

      {/* Charts — client component */}
      <SalesCharts
        monthlyRevenue={monthlyRevenue}
        salespersonData={salespersonData}
        topProducts={topProducts}
      />

      {/* Recent paid invoices table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Recent Paid Invoices</h2>
        </div>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            {recentPaid.map((inv, i) => {
              const customer = inv.customers as { company_name: string } | null
              return (
                <tr key={i}>
                  <td className="font-medium text-sm text-[#0A1628] dark:text-white">{customer?.company_name ?? '—'}</td>
                  <td className="text-green-600 font-semibold text-sm">{formatCurrency(inv.total)}</td>
                  <td className="text-xs text-slate-400">{formatDate(inv.paid_at ?? inv.created_at)}</td>
                </tr>
              )
            })}
            {recentPaid.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-sm">No paid invoices for {year}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-950/20 text-green-600',
    blue:  'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
    red:   'bg-red-50 dark:bg-red-950/20 text-red-500',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  }
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="text-xs text-red-500 mt-0.5">{sub}</div>}
    </div>
  )
}
