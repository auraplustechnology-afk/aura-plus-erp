import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, FileText, AlertTriangle,
  ArrowRight, DollarSign, Package, Target
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export const metadata = { title: 'Reports — Aura Plus ERP' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const role = currentUser?.role

  if (!['super_admin', 'manager', 'accountant'].includes(role ?? '')) redirect('/dashboard')

  // Quick stats for report cards
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [ytdRevenue, monthRevenue, totalQuotes, acceptedQuotes, problemProducts] = await Promise.all([
    supabase.from('invoices').select('total').gte('created_at', startOfYear).eq('status', 'paid').is('deleted_at', null),
    supabase.from('invoices').select('total').gte('created_at', startOfMonth).eq('status', 'paid').is('deleted_at', null),
    supabase.from('quotations').select('id', { count: 'exact' }).is('deleted_at', null),
    supabase.from('quotations').select('id', { count: 'exact' }).eq('status', 'accepted').is('deleted_at', null),
    supabase.from('support_tickets').select('product_id').not('product_id', 'is', null).is('deleted_at', null),
  ])

  const ytd = (ytdRevenue.data ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const month = (monthRevenue.data ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const convRate = (totalQuotes.count ?? 0) > 0 ? Math.round(((acceptedQuotes.count ?? 0) / (totalQuotes.count ?? 1)) * 100) : 0
  const uniqueProblemProducts = new Set((problemProducts.data ?? []).map(t => t.product_id)).size

  const REPORTS = [
    {
      href: '/reports/sales',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
      title: 'Sales Report',
      description: 'Revenue by period, salesperson, and product category. Track payment trends and identify top performers.',
      stat: formatCurrency(ytd),
      statLabel: 'Revenue YTD',
      statSub: `${formatCurrency(month)} this month`,
    },
    {
      href: '/reports/quotes',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-[#0066FF]',
      title: 'Quotes Report',
      description: 'Quote conversion rates, win/loss breakdown, average value, and time-to-acceptance by salesperson.',
      stat: `${convRate}%`,
      statLabel: 'Conversion Rate',
      statSub: `${acceptedQuotes.count ?? 0} of ${totalQuotes.count ?? 0} accepted`,
    },
    {
      href: '/reports/products',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'bg-amber-500',
      title: 'Problem Products',
      description: 'Products ranked by support ticket volume. Average resolution time and repeat issue rate.',
      stat: uniqueProblemProducts,
      statLabel: 'Products with Tickets',
      statSub: `${problemProducts.data?.length ?? 0} total tickets raised`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Business intelligence and performance analytics</p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {REPORTS.map(report => (
          <Link
            key={report.href}
            href={report.href}
            className="card p-6 hover:shadow-lg transition-all group flex flex-col gap-4"
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 ${report.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {report.icon}
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#0066FF] group-hover:translate-x-1 transition-all" />
            </div>

            <div>
              <h2 className="font-bold text-lg text-[#0A1628] dark:text-white mb-1">{report.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{report.description}</p>
            </div>

            <div className="mt-auto pt-4 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div className="text-2xl font-bold text-[#0A1628] dark:text-white">{report.stat}</div>
              <div className="text-xs text-slate-400 mt-0.5">{report.statLabel}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{report.statSub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/activity-logs" className="card p-5 flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="w-10 h-10 bg-slate-100 dark:bg-[#1E2A3B] rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-[#0A1628] dark:text-white">Activity & Audit Log</div>
            <div className="text-xs text-slate-400">Full audit trail of all system actions</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#0066FF] transition-colors" />
        </Link>
        <Link href="/search" className="card p-5 flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="w-10 h-10 bg-[#0066FF]/10 rounded-xl flex items-center justify-center text-[#0066FF] flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-[#0A1628] dark:text-white">Global Search</div>
            <div className="text-xs text-slate-400">Search across customers, quotes, invoices, tickets</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#0066FF] transition-colors" />
        </Link>
      </div>
    </div>
  )
}
