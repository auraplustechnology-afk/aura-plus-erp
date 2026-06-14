'use client'

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

// ── Shared tooltip style ─────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: '#0F1C2E',
  border: '1px solid #1E2A3B',
  borderRadius: 8,
  color: '#F1F5F9',
  fontSize: 12,
}

// ── Revenue Area Chart ───────────────────────────────────────
interface RevenueChartProps {
  data: { month: string; revenue: number; lastYear?: number }[]
}

export function RevenueAreaChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0066FF" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="lastYearGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `K${(v / 1000).toFixed(0)}`} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number) => [`ZMW${v.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#64748B' }} />
        {data[0]?.lastYear !== undefined && (
          <Area type="monotone" dataKey="lastYear" name="Last Year"
            stroke="#94A3B8" fill="url(#lastYearGrad)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
        )}
        <Area type="monotone" dataKey="revenue" name="Revenue"
          stroke="#0066FF" fill="url(#revenueGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Bar Chart ────────────────────────────────────────────────
interface BarChartProps {
  data: Record<string, string | number>[]
  dataKey: string
  nameKey: string
  color?: string
  height?: number
  formatter?: (v: number) => string
}

export function SimpleBarChart({ data, dataKey, nameKey, color = '#0066FF', height = 260, formatter }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={formatter ? (v: number) => formatter(v) : undefined} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatter ? (v: number) => [formatter(v), ''] : undefined}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Multi-Bar Chart ──────────────────────────────────────────
interface MultiBarProps {
  data: Record<string, string | number>[]
  bars: { key: string; label: string; color: string }[]
  nameKey: string
  height?: number
  formatter?: (v: number) => string
}

export function MultiBarChart({ data, bars, nameKey, height = 260, formatter }: MultiBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={formatter ? (v: number) => formatter(v) : undefined} />
        <Tooltip contentStyle={TOOLTIP_STYLE}
          formatter={formatter ? (v: number) => [formatter(v), ''] : undefined} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#64748B' }} />
        {bars.map(bar => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Pie / Donut Chart ────────────────────────────────────────
const PIE_COLORS = ['#0066FF', '#00C853', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#32ADE6']

interface DonutChartProps {
  data: { name: string; value: number }[]
  height?: number
}

export function DonutChart({ data, height = 220 }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%"
          paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#64748B' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Trend Line ───────────────────────────────────────────────
interface TrendLineProps {
  data: { label: string; value: number }[]
  color?: string
  height?: number
  formatter?: (v: number) => string
}

export function TrendLine({ data, color = '#0066FF', height = 120, formatter }: TrendLineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
          dot={false} activeDot={{ r: 3 }} />
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <Tooltip contentStyle={TOOLTIP_STYLE}
          formatter={formatter ? (v: number) => [formatter(v), ''] : undefined} />
      </LineChart>
    </ResponsiveContainer>
  )
}
