'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PeriodData {
  revenue: number
  expenses: number
  profit: number
  transactions: number
}

interface SalesPeriodCardsProps {
  daily: PeriodData
  weekly: PeriodData
  monthly: PeriodData
  yearly: PeriodData
  monthChange: number
}

const PERIODS = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'yearly',  label: 'This Year' },
] as const

export default function SalesPeriodCards({ daily, weekly, monthly, yearly, monthChange }: SalesPeriodCardsProps) {
  const [active, setActive] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  const data = { daily, weekly, monthly, yearly }
  const current = data[active]
  const isProfit = current.profit >= 0

  return (
    <div className="card overflow-hidden">
      {/* Period selector tabs */}
      <div className="flex border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        {PERIODS.map(period => (
          <button
            key={period.key}
            onClick={() => setActive(period.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              active === period.key
                ? 'text-[#0066FF] border-b-2 border-[#0066FF] bg-[#0066FF]/5'
                : 'text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E2E8F0] dark:divide-[#1E2A3B]">
        {/* Revenue */}
        <div className="p-5">
          <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Revenue</div>
          <div className="text-2xl font-bold text-[#0A1628] dark:text-white">{formatCurrency(current.revenue)}</div>
          {active === 'monthly' && monthChange !== 0 && (
            <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${monthChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {monthChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {monthChange > 0 ? '+' : ''}{monthChange}% vs last month
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="p-5">
          <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Expenses</div>
          <div className="text-2xl font-bold text-red-500">{formatCurrency(current.expenses)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {current.revenue > 0
              ? `${Math.round((current.expenses / current.revenue) * 100)}% of revenue`
              : 'No revenue yet'
            }
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-5">
          <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Gross Profit</div>
          <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
            {isProfit ? '' : '-'}{formatCurrency(Math.abs(current.profit))}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {current.revenue > 0
              ? `${Math.round((current.profit / current.revenue) * 100)}% margin`
              : 'No revenue yet'
            }
          </div>
        </div>

        {/* Transactions */}
        <div className="p-5">
          <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Transactions</div>
          <div className="text-2xl font-bold text-[#0066FF]">{current.transactions}</div>
          <div className="text-xs text-slate-400 mt-1">
            {current.transactions > 0
              ? `Avg ${formatCurrency(current.revenue / current.transactions)} per sale`
              : 'No sales yet'
            }
          </div>
        </div>
      </div>
    </div>
  )
}
