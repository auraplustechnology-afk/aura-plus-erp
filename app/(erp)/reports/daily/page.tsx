import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, Target, Trophy } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Daily Business Report — Aura Plus ERP' }

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!['super_admin', 'manager'].includes(currentUser?.role ?? '')) redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const selectedDate = params.date ?? now.toISOString().split('T')[0]
  const dayStart = `${selectedDate}T00:00:00`
  const dayEnd   = `${selectedDate}T23:59:59`

  const [
    daySales, dayExpenses, dayLeads, dayConversions,
    dayInvoices, topSalesperson, topExpenseCategory, dayTickets, dayProjects,
  ] = await Promise.all([
    supabase.from('invoices').select('total, created_by, customers:customer_id(company_name)').eq('status', 'paid').gte('paid_at', dayStart).lte('paid_at', dayEnd).is('deleted_at', null),
    supabase.from('expenses').select('amount, category:category_id(name, icon)').eq('expense_date', selectedDate).is('deleted_at', null),
    supabase.from('leads').select('id, stage', { count: 'exact' }).gte('created_at', dayStart).lte('created_at', dayEnd).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).eq('stage', 'won').gte('converted_at', dayStart).lte('converted_at', dayEnd).is('deleted_at', null),
    supabase.from('invoices').select('id, invoice_number, total, status, customers:customer_id(company_name), created_by_user:created_by(full_name)').gte('created_at', dayStart).lte('created_at', dayEnd).is('deleted_at', null),
    supabase.from('invoices').select('total, created_by, salesperson:created_by(full_name)').eq('status', 'paid').gte('paid_at', dayStart).lte('paid_at', dayEnd).is('deleted_at', null),
    supabase.from('expenses').select('amount, category:category_id(name, icon)').eq('expense_date', selectedDate).is('deleted_at', null),
    supabase.from('support_tickets').select('id', { count: 'exact' }).gte('created_at', dayStart).lte('created_at', dayEnd).is('deleted_at', null),
    supabase.from('projects').select('id', { count: 'exact' }).gte('created_at', dayStart).lte('created_at', dayEnd).is('deleted_at', null),
  ])

  const totalRevenue = (daySales.data ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const totalExpenses = (dayExpenses.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)
  const profit = totalRevenue - totalExpenses
  const isProfit = profit >= 0

  // Top salesperson
  const salesMap: Record<string, { name: string; revenue: number }> = {}
  ;(topSalesperson.data ?? []).forEach(sale => {
    const sp = (sale.salesperson as unknown) as { full_name: string } | null
    const name = sp?.full_name ?? 'Unknown'
    if (!salesMap[name]) salesMap[name] = { name, revenue: 0 }
    salesMap[name].revenue += sale.total ?? 0
  })
  const topSP = Object.values(salesMap).sort((a, b) => b.revenue - a.revenue)[0]

  // Top expense category
  const catMap: Record<string, { name: string; icon: string; total: number }> = {}
  ;(topExpenseCategory.data ?? []).forEach(e => {
    const cat = (e.category as unknown) as { name: string; icon: string } | null
    if (!cat) return
    if (!catMap[cat.name]) catMap[cat.name] = { name: cat.name, icon: cat.icon, total: 0 }
    catMap[cat.name].total += e.amount ?? 0
  })
  const topCat = Object.values(catMap).sort((a, b) => b.total - a.total)[0]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Reports
          </Link>
          <h1 className="page-title">Daily Business Report</h1>
          <p className="page-subtitle">{new Date(selectedDate).toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {/* Date picker */}
        <input type="date" className="form-input w-auto"
          defaultValue={selectedDate}
          max={now.toISOString().split('T')[0]}
          onChange={e => {
            if (e.target.value) window.location.href = `/reports/daily?date=${e.target.value}`
          }}
        />
      </div>

      {/* Profit/Loss banner */}
      <div className={`rounded-2xl p-6 ${isProfit
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900'
        : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-900'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {isProfit
            ? <TrendingUp className="w-6 h-6 text-green-500" />
            : <TrendingDown className="w-6 h-6 text-red-500" />
          }
          <h2 className="text-lg font-bold text-[#0A1628] dark:text-white">
            {isProfit ? 'Profitable Day' : 'Loss Day'} — {isProfit ? '' : '-'}{formatCurrency(Math.abs(profit))}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-slate-400 mt-1">Revenue · {daySales.data?.length ?? 0} payments</div>
          </div>
          <div className="text-center border-x border-[#E2E8F0] dark:border-[#1E2A3B]">
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
            <div className="text-xs text-slate-400 mt-1">Expenses · {dayExpenses.data?.length ?? 0} records</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isProfit ? 'text-green-700' : 'text-red-600'}`}>
              {isProfit ? '' : '-'}{formatCurrency(Math.abs(profit))}
            </div>
            <div className="text-xs text-slate-400 mt-1">Gross Profit</div>
          </div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <div className="stat-value">{dayLeads.count ?? 0}</div>
          <div className="stat-label">New Leads</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-lg flex items-center justify-center mb-2">
            <Target className="w-4 h-4" />
          </div>
          <div className="stat-value text-green-600">{dayConversions.count ?? 0}</div>
          <div className="stat-label">Conversions</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded-lg flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="stat-value">{daySales.data?.length ?? 0}</div>
          <div className="stat-label">Paid Invoices</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded-lg flex items-center justify-center mb-2">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="stat-value text-sm">{topSP?.name?.split(' ')[0] ?? '—'}</div>
          <div className="stat-label">Top Salesperson</div>
          {topSP && <div className="text-xs text-green-600 mt-0.5">{formatCurrency(topSP.revenue)}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Invoices today */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Invoices Created Today</h3>
          </div>
          {(dayInvoices.data ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No invoices created today</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {(dayInvoices.data ?? []).map(inv => {
                  const customer = (inv.customers as unknown) as { company_name: string } | null
                  return (
                    <tr key={inv.id}>
                      <td><Link href={`/invoices/${inv.id}`} className="font-mono text-xs text-[#0066FF] hover:underline">{inv.invoice_number}</Link></td>
                      <td className="text-sm text-slate-500">{customer?.company_name ?? '—'}</td>
                      <td className="font-semibold text-sm">{formatCurrency(inv.total)}</td>
                      <td><span className={`badge text-xs ${inv.status === 'paid' ? 'badge-success' : 'badge-default'}`}>{inv.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Expenses today */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Expenses Today</h3>
            {topCat && (
              <span className="text-xs text-slate-400">Top: {topCat.icon} {topCat.name} ({formatCurrency(topCat.total)})</span>
            )}
          </div>
          {(dayExpenses.data ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No expenses recorded today</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Category</th><th>Amount</th></tr></thead>
              <tbody>
                {Object.values(catMap).sort((a, b) => b.total - a.total).map(cat => (
                  <tr key={cat.name}>
                    <td className="text-sm flex items-center gap-2">{cat.icon} {cat.name}</td>
                    <td className="font-bold text-sm text-red-600">{formatCurrency(cat.total)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-[#1E2A3B]/50">
                  <td className="font-semibold text-sm">Total</td>
                  <td className="font-bold text-sm text-red-600">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
