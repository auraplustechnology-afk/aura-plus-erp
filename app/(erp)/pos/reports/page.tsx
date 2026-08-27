import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, DollarSign, Receipt, RotateCcw, Ban } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'POS Reports — Aura Plus ERP' }

export default async function POSReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!currentUser || !['super_admin', 'manager', 'accountant'].includes(currentUser.role)) redirect('/dashboard')

  const params = await searchParams
  const days = parseInt(params.days ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [salesRes, refundsRes, linesRes] = await Promise.all([
    supabase.from('invoices')
      .select('id, invoice_number, total, status, created_at, created_by, customer:customer_id(company_name), created_by_user:created_by(full_name)')
      .eq('invoice_type', 'pos')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    supabase.from('pos_refunds').select('id, amount, created_at').gte('created_at', since),
    supabase.from('invoice_lines')
      .select('description, quantity, line_total, invoice:invoice_id(invoice_type, status, created_at)')
      .gte('created_at', since)
      .limit(1000),
  ])

  const sales = salesRes.data ?? []
  const completedSales = sales.filter(s => s.status !== 'voided')
  const voidedSales = sales.filter(s => s.status === 'voided')
  const refunds = refundsRes.data ?? []

  const totalRevenue = completedSales.reduce((s, i) => s + Number(i.total), 0)
  const totalRefunded = refunds.reduce((s, r) => s + Number(r.amount), 0)
  const netRevenue = totalRevenue - totalRefunded
  const avgSale = completedSales.length ? totalRevenue / completedSales.length : 0

  // Cashier performance
  const cashierMap: Record<string, { name: string; count: number; total: number }> = {}
  completedSales.forEach(s => {
    const cashier = s.created_by_user as { full_name: string } | null
    const key = s.created_by ?? 'unknown'
    const name = cashier?.full_name ?? 'Unknown'
    if (!cashierMap[key]) cashierMap[key] = { name, count: 0, total: 0 }
    cashierMap[key].count += 1
    cashierMap[key].total += Number(s.total)
  })
  const cashierPerformance = Object.values(cashierMap).sort((a, b) => b.total - a.total)

  // Top products
  const productMap: Record<string, { qty: number; revenue: number }> = {}
  ;(linesRes.data ?? []).forEach(line => {
    const inv = line.invoice as { invoice_type: string; status: string } | null
    if (inv?.invoice_type !== 'pos' || inv?.status === 'voided') return
    const key = line.description
    if (!productMap[key]) productMap[key] = { qty: 0, revenue: 0 }
    productMap[key].qty += Number(line.quantity)
    productMap[key].revenue += Number(line.line_total)
  })
  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/pos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Till
          </Link>
          <h1 className="page-title">POS Reports</h1>
          <p className="page-subtitle">Over-the-counter sales performance, last {days} days</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <Link key={d} href={`/pos/reports?days=${d}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                d === days ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}>
              {d}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard label="Gross Sales" value={formatCurrency(totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="blue" />
        <KPICard label="Net Revenue" value={formatCurrency(netRevenue)} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <KPICard label="Sales Count" value={completedSales.length} icon={<Receipt className="w-5 h-5" />} color="blue" sub={`avg ${formatCurrency(avgSale)}`} />
        <KPICard label="Refunded" value={formatCurrency(totalRefunded)} icon={<RotateCcw className="w-5 h-5" />} color={totalRefunded > 0 ? 'red' : 'slate'}
          sub={voidedSales.length > 0 ? `${voidedSales.length} voided` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Cashier Performance</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Cashier</th><th>Sales</th><th>Revenue</th></tr></thead>
            <tbody>
              {cashierPerformance.map((c, i) => (
                <tr key={i}>
                  <td className="text-sm font-medium text-[#0A1628] dark:text-white">{c.name}</td>
                  <td className="text-sm text-slate-500">{c.count}</td>
                  <td className="text-sm font-semibold text-green-600">{formatCurrency(c.total)}</td>
                </tr>
              ))}
              {cashierPerformance.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-sm">No sales in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Top Products</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
            <tbody>
              {topProducts.map(([name, data], i) => (
                <tr key={i}>
                  <td className="text-sm text-[#0A1628] dark:text-white truncate max-w-[180px]">{name}</td>
                  <td className="text-sm text-slate-500">{data.qty}</td>
                  <td className="text-sm font-semibold text-[#0A1628] dark:text-white">{formatCurrency(data.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-sm">No sales in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {voidedSales.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Voided Sales</h2>
          </div>
          <table className="data-table">
            <thead><tr><th>Receipt #</th><th>Customer</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {voidedSales.map(s => {
                const customer = s.customer as { company_name: string } | null
                return (
                  <tr key={s.id}>
                    <td className="text-sm font-medium text-[#0A1628] dark:text-white">{s.invoice_number}</td>
                    <td className="text-sm text-slate-500">{customer?.company_name ?? '—'}</td>
                    <td className="text-sm text-red-500">{formatCurrency(s.total)}</td>
                    <td className="text-xs text-slate-400">{formatDate(s.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
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
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}
