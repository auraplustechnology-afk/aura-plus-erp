import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  TrendingUp, TrendingDown, DollarSign, Users, FileText,
  Package, FolderKanban, Headphones, AlertTriangle, CheckCircle,
  Clock, ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import type { User } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import RecentActivityWidget from '@/components/modules/RecentActivityWidget'

async function getDashboardData(userId: string, role: string) {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [
    // Revenue metrics
    revenueThisMonth,
    revenueLastMonth,
    // CRM metrics
    totalLeads,
    leadsThisMonth,
    wonLeads,
    // Quote metrics
    quotesSent,
    quotesAccepted,
    // Inventory
    lowStockProducts,
    // Projects
    activeProjects,
    pendingProjects,
    // Tickets
    openTickets,
    overdueTickets,
    // Recent invoices
    recentInvoices,
    // Recent leads
    recentLeads,
  ] = await Promise.all([
    supabase.from('invoices').select('total').gte('created_at', startOfMonth).eq('status', 'paid'),
    supabase.from('invoices').select('total').gte('created_at', startOfLastMonth).lte('created_at', endOfLastMonth).eq('status', 'paid'),
    supabase.from('leads').select('id', { count: 'exact' }).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).gte('created_at', startOfMonth).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).eq('stage', 'won').is('deleted_at', null),
    supabase.from('quotations').select('id', { count: 'exact' }).eq('status', 'sent').is('deleted_at', null),
    supabase.from('quotations').select('id', { count: 'exact' }).eq('status', 'accepted').is('deleted_at', null),
    supabase.from('products').select('id, product_name, quantity_in_stock, reorder_level').filter('quantity_in_stock', 'lte', 'reorder_level').eq('is_active', true).limit(5),
    supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'in_progress').is('deleted_at', null),
    supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('support_tickets').select('id', { count: 'exact' }).in('status', ['open', 'assigned', 'in_progress']).is('deleted_at', null),
    supabase.from('support_tickets').select('id', { count: 'exact' }).lt('sla_due_at', now.toISOString()).in('status', ['open', 'assigned', 'in_progress']).is('deleted_at', null),
    supabase.from('invoices').select('invoice_number, total, status, customers(company_name), created_at').order('created_at', { ascending: false }).limit(5).is('deleted_at', null),
    supabase.from('leads').select('company_name, stage, expected_value, created_at').order('created_at', { ascending: false }).limit(5).is('deleted_at', null),
  ])

  const thisMonthRevenue = (revenueThisMonth.data ?? []).reduce((sum, i) => sum + (i.total ?? 0), 0)
  const lastMonthRevenue = (revenueLastMonth.data ?? []).reduce((sum, i) => sum + (i.total ?? 0), 0)
  const revenueGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0

  const totalQuotes = (quotesSent.count ?? 0) + (quotesAccepted.count ?? 0)
  const conversionRate = totalQuotes > 0 ? ((quotesAccepted.count ?? 0) / totalQuotes * 100) : 0

  return {
    revenue: { thisMonth: thisMonthRevenue, lastMonth: lastMonthRevenue, growth: revenueGrowth },
    crm: { total: totalLeads.count ?? 0, thisMonth: leadsThisMonth.count ?? 0, won: wonLeads.count ?? 0 },
    quotes: { sent: quotesSent.count ?? 0, accepted: quotesAccepted.count ?? 0, conversionRate },
    inventory: { lowStock: lowStockProducts.data ?? [] },
    projects: { active: activeProjects.count ?? 0, pending: pendingProjects.count ?? 0 },
    tickets: { open: openTickets.count ?? 0, overdue: overdueTickets.count ?? 0 },
    recentInvoices: recentInvoices.data ?? [],
    recentLeads: recentLeads.data ?? [],
  }
}

const STAGE_COLORS: Record<string, string> = {
  new_lead: 'badge-info',
  contacted: 'badge-default',
  follow_up: 'badge-warning',
  quote_sent: 'badge-primary',
  won: 'badge-success',
  lost: 'badge-danger',
  ghosted: 'badge-default',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-default',
  sent: 'badge-info',
  paid: 'badge-success',
  partially_paid: 'badge-warning',
  overdue: 'badge-danger',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!userData) redirect('/login')

  const data = await getDashboardData(authUser.id, userData.role)
  const user = userData as User

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white">
          Good {getTimeOfDay()}, {user.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Here's what's happening at Aura Plus Technologies today.
        </p>
      </div>

      {/* Revenue cards */}
      {['super_admin', 'manager', 'accountant'].includes(user.role) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Revenue This Month"
            value={formatCurrency(data.revenue.thisMonth)}
            change={data.revenue.growth}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
            href="/invoices"
          />
          <StatCard
            label="Revenue Last Month"
            value={formatCurrency(data.revenue.lastMonth)}
            icon={<DollarSign className="w-5 h-5" />}
            color="slate"
            href="/invoices"
          />
          <StatCard
            label="Active Projects"
            value={data.projects.active}
            sub={`${data.projects.pending} pending`}
            icon={<FolderKanban className="w-5 h-5" />}
            color="indigo"
            href="/projects"
          />
          <StatCard
            label="Open Tickets"
            value={data.tickets.open}
            sub={data.tickets.overdue > 0 ? `${data.tickets.overdue} overdue` : undefined}
            subDanger={data.tickets.overdue > 0}
            icon={<Headphones className="w-5 h-5" />}
            color={data.tickets.overdue > 0 ? 'red' : 'slate'}
            href="/tickets"
          />
        </div>
      )}

      {/* CRM + Quotes row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CRM metrics */}
        {['super_admin', 'sales', 'manager'].includes(user.role) && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#0A1628] dark:text-white text-sm">CRM Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Lead pipeline summary</p>
              </div>
              <Link href="/crm" className="text-xs text-[#0066FF] hover:underline font-medium">View all →</Link>
            </div>
            <div className="space-y-3">
              <MetricRow label="Total Leads" value={data.crm.total} icon={<Users className="w-4 h-4 text-blue-500" />} />
              <MetricRow label="New This Month" value={data.crm.thisMonth} icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
              <MetricRow label="Won Leads" value={data.crm.won} icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
            </div>
          </div>
        )}

        {/* Quote metrics */}
        {['super_admin', 'sales', 'manager'].includes(user.role) && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#0A1628] dark:text-white text-sm">Quotations</h3>
                <p className="text-xs text-slate-400 mt-0.5">Quote pipeline</p>
              </div>
              <Link href="/quotations" className="text-xs text-[#0066FF] hover:underline font-medium">View all →</Link>
            </div>
            <div className="space-y-3">
              <MetricRow label="Quotes Sent" value={data.quotes.sent} icon={<FileText className="w-4 h-4 text-blue-500" />} />
              <MetricRow label="Quotes Accepted" value={data.quotes.accepted} icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
              <MetricRow label="Conversion Rate" value={`${data.quotes.conversionRate.toFixed(1)}%`} icon={<TrendingUp className="w-4 h-4 text-purple-500" />} />
            </div>
          </div>
        )}

        {/* Low stock alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[#0A1628] dark:text-white text-sm">Low Stock Alerts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Items below reorder level</p>
            </div>
            <Link href="/inventory" className="text-xs text-[#0066FF] hover:underline font-medium">View all →</Link>
          </div>
          {data.inventory.lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-sm text-slate-500">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.inventory.lowStock.map((product: { id: string; product_name: string; quantity_in_stock: number; reorder_level: number }) => (
                <div key={product.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-[#0A1628] dark:text-slate-200 truncate">{product.product_name}</span>
                  </div>
                  <span className="text-xs font-medium text-red-500 flex-shrink-0 ml-2">
                    {product.quantity_in_stock} / {product.reorder_level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent invoices */}
        {['super_admin', 'accountant', 'manager', 'sales'].includes(user.role) && (
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h3 className="font-semibold text-[#0A1628] dark:text-white text-sm">Recent Invoices</h3>
              <Link href="/invoices" className="text-xs text-[#0066FF] hover:underline font-medium flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
              {data.recentInvoices.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No invoices yet</div>
              ) : (
                data.recentInvoices.map((inv: {
                  invoice_number: string;
                  total: number;
                  status: string;
                  customers: { company_name: string } | null;
                  created_at: string;
                }) => (
                  <div key={inv.invoice_number} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]/50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0A1628] dark:text-white">{inv.invoice_number}</div>
                      <div className="text-xs text-slate-400 truncate">{inv.customers?.company_name}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-semibold text-[#0A1628] dark:text-white">{formatCurrency(inv.total)}</div>
                      <span className={`badge ${STATUS_COLORS[inv.status] ?? 'badge-default'}`}>{inv.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent leads */}
        {['super_admin', 'sales', 'manager'].includes(user.role) && (
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h3 className="font-semibold text-[#0A1628] dark:text-white text-sm">Recent Leads</h3>
              <Link href="/crm" className="text-xs text-[#0066FF] hover:underline font-medium flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
              {data.recentLeads.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No leads yet</div>
              ) : (
                data.recentLeads.map((lead: {
                  company_name: string;
                  stage: string;
                  expected_value: number;
                  created_at: string;
                }, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]/50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0A1628] dark:text-white truncate">{lead.company_name}</div>
                      <span className={`badge ${STAGE_COLORS[lead.stage] ?? 'badge-default'} mt-0.5`}>
                        {lead.stage.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-semibold text-[#0A1628] dark:text-white">{formatCurrency(lead.expected_value)}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {formatRelativeDate(lead.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <RecentActivityWidget />
    </div>
  )
}

// ---- Sub-components ----

function StatCard({ label, value, change, sub, subDanger, icon, color, href }: {
  label: string
  value: string | number
  change?: number
  sub?: string
  subDanger?: boolean
  icon: React.ReactNode
  color: string
  href: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  }

  return (
    <Link href={href} className="stat-card hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color] ?? colorMap.slate}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="stat-value group-hover:text-[#0066FF] transition-colors">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && (
        <div className={`text-xs mt-0.5 ${subDanger ? 'text-red-500 font-medium' : 'text-slate-400'}`}>{sub}</div>
      )}
    </Link>
  )
}

function MetricRow({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <span className="text-sm font-semibold text-[#0A1628] dark:text-white">{value}</span>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
  if (diff < 60) return `${diff}m ago`
  if (diff < 60 * 24) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 60 / 24)}d ago`
}

