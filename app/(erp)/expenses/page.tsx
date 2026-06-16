import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Receipt, TrendingDown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Expenses — Aura Plus ERP' }

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; category?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const period   = params.period ?? 'month'
  const category = params.category ?? ''
  const page     = parseInt(params.page ?? '1')
  const pageSize = 30

  const now = new Date()
  let dateFrom = ''
  switch (period) {
    case 'today': dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]; break
    case 'week':  dateFrom = new Date(now.getTime() - 7 * 24 * 3600000).toISOString().split('T')[0]; break
    case 'month': dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break
    case 'year':  dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; break
  }

  let query = supabase
    .from('expenses')
    .select(`
      id, expense_date, amount, description, receipt_url, receipt_name, notes, created_at,
      category:category_id(id, name, color, icon),
      employee:employee_id(id, full_name),
      created_by_user:created_by(full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (dateFrom) query = query.gte('expense_date', dateFrom)
  if (category) query = query.eq('category_id', category)

  const { data: expenses, count } = await query

  // Category summary
  const { data: categorySummary } = await supabase
    .from('expenses')
    .select('amount, category:category_id(id, name, color, icon)')
    .is('deleted_at', null)
    .gte('expense_date', dateFrom || '2000-01-01')

  const { data: categories } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Compute totals
  const total = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)
  const grandTotal = (categorySummary ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)

  // Category breakdown
  const catMap: Record<string, { name: string; color: string; icon: string; total: number }> = {}
  ;(categorySummary ?? []).forEach(e => {
    const cat = (e.category as unknown) as { id: string; name: string; color: string; icon: string } | null
    if (!cat) return
    if (!catMap[cat.name]) catMap[cat.name] = { name: cat.name, color: cat.color, icon: cat.icon, total: 0 }
    catMap[cat.name].total += e.amount ?? 0
  })
  const catBreakdown = Object.values(catMap).sort((a, b) => b.total - a.total).slice(0, 6)

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year',  label: 'This Year' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">{count ?? 0} records · {formatCurrency(total)} in selected period</p>
        </div>
        <Link href="/expenses/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Expense
        </Link>
      </div>

      {/* Period tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        {PERIODS.map(p => (
          <Link key={p.value} href={`/expenses?period=${p.value}${category ? `&category=${category}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              period === p.value
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
            }`}>
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Expense list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Total card */}
          <div className="card p-5 flex items-center gap-4 bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(total)}</div>
              <div className="text-sm text-slate-400">Total expenses · {PERIODS.find(p => p.value === period)?.label}</div>
            </div>
          </div>

          {/* Expenses table */}
          <div className="card overflow-hidden">
            {(expenses ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No expenses found</h3>
                <p className="text-sm text-slate-400 mb-4">Start tracking your business expenses.</p>
                <Link href="/expenses/new" className="btn-primary"><Plus className="w-4 h-4" /> Add Expense</Link>
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th className="hidden sm:table-cell">Category</th>
                      <th className="hidden md:table-cell">Employee</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expenses ?? []).map(expense => {
                      const cat = (expense.category as unknown) as { name: string; color: string; icon: string } | null
                      const emp = (expense.employee as unknown) as { full_name: string } | null
                      return (
                        <tr key={expense.id}>
                          <td className="text-xs text-slate-400 whitespace-nowrap">{formatDate(expense.expense_date)}</td>
                          <td>
                            <div className="text-sm font-medium text-[#0A1628] dark:text-white">{expense.description}</div>
                            {expense.receipt_url && (
                              <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-[#0066FF] hover:underline">📎 Receipt</a>
                            )}
                          </td>
                          <td className="hidden sm:table-cell">
                            {cat && (
                              <span className="badge badge-default text-xs flex items-center gap-1">
                                <span>{cat.icon}</span>{cat.name}
                              </span>
                            )}
                          </td>
                          <td className="hidden md:table-cell text-sm text-slate-500">{emp?.full_name ?? '—'}</td>
                          <td className="font-bold text-sm text-red-600">{formatCurrency(expense.amount)}</td>
                          <td>
                            <Link href={`/expenses/${expense.id}`} className="text-xs text-[#0066FF] hover:underline">Edit</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                    <p className="text-sm text-slate-400">{((page-1)*pageSize)+1}–{Math.min(page*pageSize,count??0)} of {count}</p>
                    <div className="flex gap-2">
                      {page > 1 && <Link href={`/expenses?period=${period}&page=${page-1}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>}
                      {page < totalPages && <Link href={`/expenses?period=${period}&page=${page+1}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Category breakdown */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Expenses by Category</h3>
            {catBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {catBreakdown.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span>{cat.icon}</span>{cat.name}
                      </span>
                      <span className="text-xs font-semibold text-[#0A1628] dark:text-white">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-1.5">
                      <div
                        className="rounded-full h-1.5 transition-all"
                        style={{
                          width: `${grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0}%`,
                          backgroundColor: cat.color
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0}% of total
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter by category */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Filter by Category</h3>
            <div className="space-y-1">
              <Link href={`/expenses?period=${period}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-[#0066FF] text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]'}`}>
                All Categories
              </Link>
              {(categories ?? []).map(cat => (
                <Link key={cat.id} href={`/expenses?period=${period}&category=${cat.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${category === cat.id ? 'bg-[#0066FF] text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]'}`}>
                  <span>{cat.icon}</span>{cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
