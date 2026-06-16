import Link from 'next/link'
import { TrendingUp, TrendingDown, DollarSign, Users, Receipt, ArrowUpRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface DailySummaryProps {
  todayRevenue: number
  todayExpenses: number
  todayProfit: number
  todayLeads: number
  todayTransactions: number
}

export default function DailySummaryWidget({
  todayRevenue, todayExpenses, todayProfit, todayLeads, todayTransactions
}: DailySummaryProps) {
  const isProfit = todayProfit >= 0

  return (
    <div className={`rounded-2xl p-5 border ${
      isProfit
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900'
        : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-900'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-[#0A1628] dark:text-white text-base flex items-center gap-2">
            {isProfit
              ? <TrendingUp className="w-5 h-5 text-green-500" />
              : <TrendingDown className="w-5 h-5 text-red-500" />
            }
            Today&apos;s Business Summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Live numbers for today</p>
        </div>
        <Link href="/reports/daily" className="flex items-center gap-1 text-xs text-[#0066FF] hover:underline font-medium">
          Full Report <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Revenue */}
        <div className="bg-white/70 dark:bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-slate-400 font-medium">Revenue</span>
          </div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(todayRevenue)}</div>
          <div className="text-[10px] text-slate-400">{todayTransactions} invoice{todayTransactions !== 1 ? 's' : ''}</div>
        </div>

        {/* Expenses */}
        <div className="bg-white/70 dark:bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Receipt className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-slate-400 font-medium">Expenses</span>
          </div>
          <div className="text-lg font-bold text-red-500">{formatCurrency(todayExpenses)}</div>
          <div className="text-[10px] text-slate-400">recorded today</div>
        </div>

        {/* Profit */}
        <div className={`rounded-xl p-3 ${isProfit ? 'bg-green-100 dark:bg-green-950/40' : 'bg-red-100 dark:bg-red-950/40'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {isProfit
              ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            }
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gross Profit</span>
          </div>
          <div className={`text-lg font-bold ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isProfit ? '' : '-'}{formatCurrency(Math.abs(todayProfit))}
          </div>
          <div className="text-[10px] text-slate-400">revenue minus expenses</div>
        </div>

        {/* Leads */}
        <div className="bg-white/70 dark:bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-slate-400 font-medium">New Leads</span>
          </div>
          <div className="text-lg font-bold text-purple-600">{todayLeads}</div>
          <div className="text-[10px] text-slate-400">added today</div>
        </div>

        {/* Transactions */}
        <div className="bg-white/70 dark:bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-slate-400 font-medium">Transactions</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{todayTransactions}</div>
          <div className="text-[10px] text-slate-400">paid invoices</div>
        </div>
      </div>
    </div>
  )
}
