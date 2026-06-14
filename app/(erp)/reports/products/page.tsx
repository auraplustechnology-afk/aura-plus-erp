import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Package, Clock, CheckCircle2 } from 'lucide-react'
import { formatDate, getPriorityClass, formatLabel } from '@/lib/utils/format'
import ProblemProductsCharts from '@/components/modules/reports/ProblemProductsCharts'

export const metadata = { title: 'Problem Products — Aura Plus ERP' }

export default async function ProblemProductsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!['super_admin', 'manager', 'accountant'].includes(currentUser?.role ?? '')) redirect('/dashboard')

  // Get all tickets with product info
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      id, priority, status, created_at, resolved_at,
      product:product_id(id, sku, product_name, category:category_id(name))
    `)
    .not('product_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Aggregate by product
  const productMap: Record<string, {
    id: string; sku: string; name: string; category: string;
    total: number; open: number; resolved: number;
    critical: number; high: number;
    resolutionTimes: number[]
  }> = {}

  ;(tickets ?? []).forEach(ticket => {
    const product = ticket.product as { id: string; sku: string; product_name: string; category: { name: string } | null } | null
    if (!product) return

    const key = product.id
    if (!productMap[key]) {
      productMap[key] = {
        id: product.id, sku: product.sku, name: product.product_name,
        category: product.category?.name ?? 'Uncategorised',
        total: 0, open: 0, resolved: 0,
        critical: 0, high: 0, resolutionTimes: [],
      }
    }

    productMap[key].total++
    if (['open', 'assigned', 'in_progress', 'waiting_for_client'].includes(ticket.status)) productMap[key].open++
    if (['resolved', 'closed'].includes(ticket.status)) productMap[key].resolved++
    if (ticket.priority === 'critical') productMap[key].critical++
    if (ticket.priority === 'high') productMap[key].high++
    if (ticket.resolved_at && ticket.created_at) {
      const hrs = (new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / 3600000
      productMap[key].resolutionTimes.push(hrs)
    }
  })

  const productRanking = Object.values(productMap)
    .map(p => ({
      ...p,
      avgResolutionHours: p.resolutionTimes.length > 0
        ? Math.round(p.resolutionTimes.reduce((a, b) => a + b, 0) / p.resolutionTimes.length)
        : null,
    }))
    .sort((a, b) => b.total - a.total)

  // Chart data
  const chartData = productRanking.slice(0, 10).map(p => ({
    name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
    total: p.total,
    open: p.open,
    resolved: p.resolved,
  }))

  // Priority breakdown across all product tickets
  const priorityBreakdown = ['critical', 'high', 'medium', 'low'].map(priority => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: (tickets ?? []).filter(t => t.priority === priority).length,
  })).filter(p => p.value > 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Reports
        </Link>
        <h1 className="page-title">Problem Products Report</h1>
        <p className="page-subtitle">Products ranked by support ticket volume and resolution performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg flex items-center justify-center mb-2"><Package className="w-4 h-4" /></div>
          <div className="stat-value">{productRanking.length}</div>
          <div className="stat-label">Products with Tickets</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg flex items-center justify-center mb-2"><AlertTriangle className="w-4 h-4" /></div>
          <div className="stat-value text-red-500">{(tickets ?? []).filter(t => t.priority === 'critical').length}</div>
          <div className="stat-label">Critical Tickets</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg flex items-center justify-center mb-2"><Clock className="w-4 h-4" /></div>
          <div className="stat-value">{(tickets ?? []).filter(t => ['open', 'assigned', 'in_progress'].includes(t.status)).length}</div>
          <div className="stat-label">Currently Open</div>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-lg flex items-center justify-center mb-2"><CheckCircle2 className="w-4 h-4" /></div>
          <div className="stat-value text-green-600">{(tickets ?? []).filter(t => ['resolved', 'closed'].includes(t.status)).length}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Charts */}
      <ProblemProductsCharts chartData={chartData} priorityBreakdown={priorityBreakdown} />

      {/* Product ranking table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Product Ranking by Issue Count</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th className="hidden sm:table-cell">Category</th>
              <th>Total Tickets</th>
              <th>Open</th>
              <th className="hidden md:table-cell">Critical/High</th>
              <th className="hidden lg:table-cell">Avg Resolution</th>
            </tr>
          </thead>
          <tbody>
            {productRanking.map((product, i) => (
              <tr key={product.id} className={i === 0 ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                <td className={`font-bold text-sm ${i === 0 ? 'text-red-500' : 'text-slate-400'}`}>{i + 1}</td>
                <td>
                  <div className="font-medium text-sm text-[#0A1628] dark:text-white">{product.name}</div>
                  <div className="font-mono text-xs text-slate-400">{product.sku}</div>
                </td>
                <td className="hidden sm:table-cell">
                  <span className="badge badge-default text-xs">{product.category}</span>
                </td>
                <td>
                  <span className={`text-sm font-bold ${product.total >= 5 ? 'text-red-500' : product.total >= 3 ? 'text-amber-500' : 'text-[#0A1628] dark:text-white'}`}>
                    {product.total}
                  </span>
                </td>
                <td>
                  {product.open > 0
                    ? <span className="badge badge-danger text-xs">{product.open} open</span>
                    : <span className="text-xs text-green-600">✓ All resolved</span>
                  }
                </td>
                <td className="hidden md:table-cell">
                  <span className="text-sm text-[#0A1628] dark:text-white">{product.critical + product.high}</span>
                  {product.critical > 0 && <span className="ml-1 text-xs text-red-500">({product.critical} critical)</span>}
                </td>
                <td className="hidden lg:table-cell text-sm text-slate-500">
                  {product.avgResolutionHours !== null ? `${product.avgResolutionHours}h` : '—'}
                </td>
              </tr>
            ))}
            {productRanking.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">No tickets linked to products yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent tickets */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Recent Product Tickets</h2>
        </div>
        <table className="data-table">
          <thead><tr><th>Product</th><th>Issue</th><th>Priority</th><th>Status</th><th className="hidden md:table-cell">Date</th></tr></thead>
          <tbody>
            {(tickets ?? []).slice(0, 15).map(ticket => {
              const product = ticket.product as { product_name: string; sku: string } | null
              return (
                <tr key={ticket.id}>
                  <td>
                    <Link href={`/tickets/${ticket.id}`} className="text-sm font-medium text-[#0066FF] hover:underline">
                      {product?.product_name ?? '—'}
                    </Link>
                  </td>
                  <td className="text-xs text-slate-500 max-w-[200px] truncate">{ticket.issue_description}</td>
                  <td><span className={`badge ${getPriorityClass(ticket.priority)} text-xs`}>{formatLabel(ticket.priority)}</span></td>
                  <td><span className="badge badge-default text-xs">{formatLabel(ticket.status)}</span></td>
                  <td className="hidden md:table-cell text-xs text-slate-400">{formatDate(ticket.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
