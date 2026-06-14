'use client'

import { SimpleBarChart, DonutChart } from '@/components/modules/charts/Charts'

interface ProblemProductsChartsProps {
  chartData: { name: string; total: number; open: number; resolved: number }[]
  priorityBreakdown: { name: string; value: number }[]
}

export default function ProblemProductsCharts({ chartData, priorityBreakdown }: ProblemProductsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 card p-5">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Top 10 Products by Ticket Count</h2>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-52 text-sm text-slate-400">No product tickets yet</div>
        ) : (
          <SimpleBarChart
            data={chartData}
            dataKey="total"
            nameKey="name"
            color="#FF9500"
            height={240}
          />
        )}
      </div>
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Priority Breakdown</h2>
        {priorityBreakdown.length === 0 ? (
          <div className="flex items-center justify-center h-52 text-sm text-slate-400">No data</div>
        ) : (
          <DonutChart data={priorityBreakdown} height={200} />
        )}
        <div className="mt-3 space-y-1.5">
          {priorityBreakdown.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
              <span className="font-semibold text-[#0A1628] dark:text-white">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
