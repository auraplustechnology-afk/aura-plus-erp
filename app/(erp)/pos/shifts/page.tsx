import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const metadata = { title: 'POS Shifts — Aura Plus ERP' }

export default async function POSShiftsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!currentUser || !['super_admin', 'sales', 'manager', 'accountant'].includes(currentUser.role)) redirect('/dashboard')

  const { data: shifts } = await supabase
    .from('pos_shifts')
    .select('*, opened_by_user:opened_by(full_name), closed_by_user:closed_by(full_name)')
    .order('opened_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/pos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Till
        </Link>
        <h1 className="page-title">POS Shifts</h1>
        <p className="page-subtitle">Cash drawer open/close history and reconciliation</p>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cashier</th><th>Opened</th><th>Closed</th><th>Float</th>
              <th>Expected</th><th>Counted</th><th>Variance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(shifts ?? []).map(s => {
              const opener = s.opened_by_user as { full_name: string } | null
              return (
                <tr key={s.id}>
                  <td className="font-medium text-sm text-[#0A1628] dark:text-white">{opener?.full_name ?? '—'}</td>
                  <td className="text-xs text-slate-400">{formatDate(s.opened_at)} {new Date(s.opened_at).toLocaleTimeString()}</td>
                  <td className="text-xs text-slate-400">{s.closed_at ? `${formatDate(s.closed_at)} ${new Date(s.closed_at).toLocaleTimeString()}` : '—'}</td>
                  <td className="text-sm">{formatCurrency(s.opening_float)}</td>
                  <td className="text-sm">{s.expected_cash != null ? formatCurrency(s.expected_cash) : '—'}</td>
                  <td className="text-sm">{s.closing_cash_counted != null ? formatCurrency(s.closing_cash_counted) : '—'}</td>
                  <td className={`text-sm font-semibold ${s.cash_variance == null ? '' : s.cash_variance === 0 ? 'text-green-600' : s.cash_variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {s.cash_variance != null ? `${s.cash_variance > 0 ? '+' : ''}${formatCurrency(s.cash_variance)}` : '—'}
                  </td>
                  <td><span className={`badge ${s.status === 'open' ? 'badge-success' : 'badge-default'}`}>{s.status}</span></td>
                </tr>
              )
            })}
            {(!shifts || shifts.length === 0) && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">No shifts recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
