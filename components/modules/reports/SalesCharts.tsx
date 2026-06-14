'use client'

import { RevenueAreaChart, SimpleBarChart } from '@/components/modules/charts/Charts'
import { formatCurrency } from '@/lib/utils/format'

interface SalesChartsProps {
  monthlyRevenue: { month: string; revenue: number }[]
  salespersonData: { name: string; revenue: number; count: number }[]
  topProducts: { name: string; revenue: number }[]
}

export default function SalesCharts({ monthlyRevenue, salespersonData, topProducts }: SalesChartsProps) {
  return (
    <div className="space-y-5">
      {/* Revenue over time */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Monthly Revenue</h2>
        <RevenueAreaChart data={monthlyRevenue} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Salesperson performance */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Revenue by Salesperson</h2>
          {salespersonData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-sm text-slate-400">No data available</div>
          ) : (
            <>
              <SimpleBarChart
                data={salespersonData}
                dataKey="revenue"
                nameKey="name"
                color="#0066FF"
                height={220}
                formatter={v => `ZMW${(v / 1000).toFixed(0)}K`}
              />
              {/* Table below chart */}
              <div className="mt-3 space-y-2">
                {salespersonData.map((sp, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] text-[9px] font-bold">
                        {sp.name.charAt(0)}
                      </div>
                      <span className="text-[#0A1628] dark:text-white font-medium">{sp.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#0066FF]">{formatCurrency(sp.revenue)}</div>
                      <div className="text-xs text-slate-400">{sp.count} invoices</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-sm text-slate-400">No data available</div>
          ) : (
            <>
              <SimpleBarChart
                data={topProducts}
                dataKey="revenue"
                nameKey="name"
                color="#00C853"
                height={220}
                formatter={v => `ZMW${(v / 1000).toFixed(0)}K`}
              />
              <div className="mt-3 space-y-1.5">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4 font-mono">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#0A1628] dark:text-white truncate">{p.name}</span>
                        <span className="text-xs font-semibold text-green-600 ml-2 flex-shrink-0">{formatCurrency(p.revenue)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-1 mt-1">
                        <div
                          className="bg-green-500 rounded-full h-1 transition-all"
                          style={{ width: `${Math.min(100, (p.revenue / topProducts[0].revenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
