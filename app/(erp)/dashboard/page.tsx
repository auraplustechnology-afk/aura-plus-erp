import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp, DollarSign, Users, FileText,
  Package, FolderKanban, Headphones,
  ArrowUpRight, Calendar, BarChart3, Target, Receipt
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import RecentActivityWidget from '@/components/modules/RecentActivityWidget'
import DailySummaryWidget from '@/components/modules/dashboard/DailySummaryWidget'
import SalesPeriodCards from '@/components/modules/dashboard/SalesPeriodCards'

export const metadata = { title: 'Dashboard — Aura Plus ERP' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const role = currentUser?.role ?? 'sales'
  const now = new Date()

  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart   = new Date(now.getTime() - 7 * 24 * 3600000).toISOString()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart   = new Date(now.getFullYear(), 0, 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
  const todayDate   = todayStart.split('T')[0]
  const weekDate    = weekStart.split('T')[0]
  const monthDate   = monthStart.split('T')[0]
  const yearDate    = yearStart.split('T')[0]

  const [
    todaySales, weekSales, monthSales, yearSales, lastMonthSales,
    todayExpenses, weekExpenses, monthExpenses, yearExpenses,
    todayLeads, weekLeads, monthLeads,
    openTickets, activeProjects, lowStock,
    recentInvoices, outstanding,
  ] = await Promise.all([
    supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', todayStart).is('deleted_at', null),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', weekStart).is('deleted_at', null),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', monthStart).is('deleted_at', null),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', yearStart).is('deleted_at', null),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', lastMonthStart).lte('paid_at', lastMonthEnd).is('deleted_at', null),
    supabase.from('expenses').select('amount').gte('expense_date', todayDate).is('deleted_at', null),
    supabase.from('expenses').select('amount').gte('expense_date', weekDate).is('deleted_at', null),
    supabase.from('expenses').select('amount').gte('expense_date', monthDate).is('deleted_at', null),
    supabase.from('expenses').select('amount').gte('expense_date', yearDate).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).gte('created_at', todayStart).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).gte('created_at', weekStart).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).gte('created_at', monthStart).is('deleted_at', null),
    supabase.from('support_tickets').select('id', { count: 'exact' }).in('status', ['open', 'assigned', 'in_progress']).is('deleted_at', null),
    supabase.from('projects').select('id', { count: 'exact' }).in('status', ['pending', 'scheduled', 'in_progress']).is('deleted_at', null),
    supabase.from('products').select('id', { count: 'exact' }).lte('quantity_in_stock', 5).eq('is_active', true),
    supabase.from('invoices').select('id, invoice_number, total, status, created_at, customers:customer_id(company_name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('outstanding_balance').not('status', 'eq', 'paid').is('deleted_at', null),
  ])

  const sum = (data: { total?: number; amount?: number }[] | null) =>
    (data ?? []).reduce((s: number, i) => s + (i.total ?? i.amount ?? 0), 0)

  const todayRev  = sum(todaySales.data)
  const weekRev   = sum(weekSales.data)
  const monthRev  = sum(monthSales.data)
  const yearRev   = sum(yearSales.data)
  const lastMRev  = sum(lastMonthSales.data)
  const todayExp  = sum(todayExpenses.data)
  const weekExp   = sum(weekExpenses.data)
  const monthExp  = sum(monthExpenses.data)
  const yearExp   = sum(yearExpenses.data)
  const monthChange = lastMRev > 0 ? Math.round(((monthRev - lastMRev) / lastMRev) * 100) : 0
  const totalOutstanding = ((outstanding.data ?? []) as { outstanding_balance: number }[]).reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)

  const isManager = ['super_admin', 'manager', 'accountant'].includes(role)
  const isSales   = ['super_admin', 'sales', 'manager'].includes(role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {currentUser?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="page-subtitle">
          {now.toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {isManager && (
        <DailySummaryWidget
          todayRevenue={todayRev}
          todayExpenses={todayExp}
          todayProfit={todayRev - todayExp}
          todayLeads={todayLeads.count ?? 0}
          todayTransactions={todaySales.data?.length ?? 0}
        />
      )}

      {isManager && (
        <SalesPeriodCards
          daily={{   revenue: todayRev, expenses: todayExp, profit: todayRev - todayExp, transactions: todaySales.data?.length ?? 0 }}
          weekly={{  revenue: weekRev,  expenses: weekExp,  profit: weekRev - weekExp,   transactions: weekSales.data?.length ?? 0 }}
          monthly={{ revenue: monthRev, expenses: monthExp, profit: monthRev - monthExp, transactions: monthSales.data?.length ?? 0 }}
          yearly={{  revenue: yearRev,  expenses: yearExp,  profit: yearRev - yearExp,   transactions: yearSales.data?.length ?? 0 }}
          monthChange={monthChange}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isManager && (
          <>
            <StatCard label="This Month Revenue" value={formatCurrency(monthRev)}
              sub={monthChange !== 0 ? `${monthChange > 0 ? '+' : ''}${monthChange}% vs last month` : undefined}
              subDanger={monthChange < 0} icon={<DollarSign className="w-5 h-5" />} color="green" href="/invoices" />
            <StatCard label="This Month Profit" value={formatCurrency(monthRev - monthExp)}
              sub={`Expenses: ${formatCurrency(monthExp)}`} subDanger={monthRev - monthExp < 0}
              icon={<TrendingUp className="w-5 h-5" />} color={monthRev - monthExp >= 0 ? 'blue' : 'red'} href="/expenses" />
            <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)}
              sub="Unpaid invoices" subDanger={totalOutstanding > 0}
              icon={<Receipt className="w-5 h-5" />} color={totalOutstanding > 0 ? 'red' : 'green'} href="/invoices" />
          </>
        )}
        {isSales && (
          <StatCard label="Leads This Month" value={monthLeads.count ?? 0}
            sub={`${todayLeads.count ?? 0} today`} icon={<Target className="w-5 h-5" />} color="purple" href="/crm" />
        )}
        <StatCard label="Active Projects" value={activeProjects.count ?? 0}
          sub="In progress" icon={<FolderKanban className="w-5 h-5" />} color="blue" href="/projects" />
        <StatCard label="Open Tickets" value={openTickets.count ?? 0}
          subDanger={(openTickets.count ?? 0) > 0} icon={<Headphones className="w-5 h-5" />}
          color={(openTickets.count ?? 0) > 0 ? 'red' : 'green'} href="/tickets" />
        {isManager && (
          <StatCard label="Low Stock" value={lowStock.count ?? 0}
            subDanger={(lowStock.count ?? 0) > 0} icon={<Package className="w-5 h-5" />}
            color={(lowStock.count ?? 0) > 0 ? 'red' : 'green'} href="/inventory" />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'New Quote',    href: '/quotations/new', icon: <FileText className="w-4 h-4" />,     roles: ['super_admin','sales','manager'] },
          { label: 'New Invoice',  href: '/invoices/new',   icon: <Receipt className="w-4 h-4" />,      roles: ['super_admin','accountant','manager','sales'] },
          { label: 'New Expense',  href: '/expenses/new',   icon: <DollarSign className="w-4 h-4" />,   roles: ['super_admin','sales','manager','accountant','technician'] },
          { label: 'New Lead',     href: '/crm',            icon: <Users className="w-4 h-4" />,        roles: ['super_admin','sales','manager'] },
          { label: 'New Project',  href: '/projects/new',   icon: <FolderKanban className="w-4 h-4" />, roles: ['super_admin','sales','manager'] },
          { label: 'New Ticket',   href: '/tickets/new',    icon: <Headphones className="w-4 h-4" />,   roles: ['super_admin','sales','manager'] },
          { label: 'Reports',      href: '/reports',        icon: <BarChart3 className="w-4 h-4" />,    roles: ['super_admin','manager','accountant'] },
          { label: 'Daily Report', href: '/reports/daily',  icon: <Calendar className="w-4 h-4" />,     roles: ['super_admin','manager'] },
        ].filter(item => item.roles.includes(role)).map(item => (
          <Link key={item.href} href={item.href}
            className="card flex items-center gap-2.5 px-4 py-3 hover:shadow-md transition-all group text-sm font-medium text-[#0A1628] dark:text-white hover:text-[#0066FF]">
            <span className="text-[#0066FF] group-hover:scale-110 transition-transform">{item.icon}</span>
            {item.label}
            <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-[#0066FF] transition-colors" />
          </Link>
        ))}
      </div>

      {isManager && (recentInvoices.data ?? []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Recent Invoices</h3>
            <Link href="/invoices" className="text-xs text-[#0066FF] hover:underline font-medium flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {(recentInvoices.data ?? []).map((inv) => {
                const customer = (inv.customers as unknown) as { company_name: string } | null
                return (
                  <tr key={inv.id}>
                    <td><Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-semibold text-[#0066FF] hover:underline">{inv.invoice_number}</Link></td>
                    <td className="text-sm text-slate-500">{customer?.company_name ?? '—'}</td>
                    <td className="font-semibold text-sm">{formatCurrency(inv.total)}</td>
                    <td><span className={`badge text-xs ${inv.status === 'paid' ? 'badge-success' : inv.status === 'overdue' ? 'badge-danger' : 'badge-default'}`}>{inv.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <RecentActivityWidget />
    </div>
  )
}

function StatCard({ label, value, sub, subDanger, icon, color, href }: {
  label: string; value: string | number; sub?: string; subDanger?: boolean
  icon: React.ReactNode; color: string; href: string
}) {
  const colors: Record<string, string> = {
    green:  'bg-green-50 dark:bg-green-950/20 text-green-600',
    blue:   'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
    red:    'bg-red-50 dark:bg-red-950/20 text-red-500',
    purple: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600',
  }
  return (
    <Link href={href} className="stat-card hover:shadow-md transition-all group cursor-pointer">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color] ?? colors.blue}`}>{icon}</div>
      <div className="stat-value group-hover:text-[#0066FF] transition-colors">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className={`text-xs mt-1 ${subDanger ? 'text-red-500' : 'text-slate-400'}`}>{sub}</div>}
    </Link>
  )
}
