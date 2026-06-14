'use client'

import { MultiBarChart, DonutChart } from '@/components/modules/charts/Charts'
import { formatCurrency } from '@/lib/utils/format'

interface QuotesChartsProps {
  monthlyData: { month: string; sent: number; accepted: number; rejected: number }[]
  salespersonData: { name: string; sent: number; accepted: number; value: number; rate: number }[]
  statusBreakdown: { status: string; count: number; value: number }[]
}

export default function QuotesCharts({ monthlyData, salespersonData, statusBreakdown }: QuotesChartsProps) {
  const pieData = statusBreakdown.filter(s => s.count > 0).map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Monthly volumes */}
      <div className="lg:col-span-2 card p-5">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Monthly Quote Volume</h2>
        <MultiBarChart
          data={monthlyData}
          nameKey="month"
          bars={[
            { key: 'sent',     label: 'Sent',     color: '#0066FF' },
            { key: 'accepted', label: 'Accepted', color: '#00C853' },
            { key: 'rejected', label: 'Rejected', color: '#FF3B30' },
          ]}
          height={240}
        />
      </div>

      {/* Status donut */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Status Distribution</h2>
        {pieData.length > 0 ? (
          <DonutChart data={pieData} height={200} />
        ) : (
          <div className="flex items-center justify-center h-52 text-sm text-slate-400">No data</div>
        )}
        <div className="mt-3 space-y-2">
          {statusBreakdown.filter(s => s.count > 0).map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="capitalize text-slate-500 dark:text-slate-400">{s.status}</span>
              <div className="text-right">
                <span className="font-semibold text-[#0A1628] dark:text-white">{s.count}</span>
                <span className="text-slate-400 ml-1">· {formatCurrency(s.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
