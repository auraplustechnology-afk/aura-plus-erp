import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { ACTION_LABELS, ACTION_COLORS, MODULE_LABELS, MODULE_ICONS } from '@/lib/utils/activity'

export const metadata = { title: 'Audit Trail — Aura Plus ERP' }

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; action?: string; module?: string; from?: string; to?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const canViewAll = ['super_admin', 'manager'].includes(currentUser?.role ?? '')

  const params = await searchParams
  const userFilter   = params.user ?? ''
  const actionFilter = params.action ?? ''
  const moduleFilter = params.module ?? ''
  const fromFilter   = params.from ?? ''
  const toFilter     = params.to ?? ''
  const page         = parseInt(params.page ?? '1')
  const pageSize     = 50

  let query = supabase
    .from('activity_logs')
    .select(`
      id, action, entity_type, entity_id, entity_label, ip_address, created_at,
      user:user_id(id, full_name, email, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (!canViewAll) query = query.eq('user_id', authUser.id)
  if (userFilter)   query = query.eq('user_id', userFilter)
  if (actionFilter) query = query.eq('action', actionFilter)
  if (moduleFilter) query = query.eq('entity_type', moduleFilter)
  if (fromFilter)   query = query.gte('created_at', fromFilter)
  if (toFilter)     query = query.lte('created_at', toFilter + 'T23:59:59')

  const { data: logs, count } = await query

  const { data: users } = canViewAll
    ? await supabase.from('users').select('id, full_name, role').order('full_name')
    : { data: [] }

  const totalPages = Math.ceil((count ?? 0) / pageSize)
  const hasFilters = userFilter || actionFilter || moduleFilter || fromFilter || toFilter

  const ACTIONS = Object.keys(ACTION_LABELS)
  const MODULES = Object.keys(MODULE_LABELS)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">{count ?? 0} entries</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-green-700 dark:text-green-400 font-medium">Read-only · Immutable record</span>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        {canViewAll && (
          <div className="flex gap-2 flex-wrap">
            {(users ?? []).map(u => (
              <Link
                key={u.id}
                href={`/activity-logs?user=${u.id}${actionFilter ? `&action=${actionFilter}` : ''}${moduleFilter ? `&module=${moduleFilter}` : ''}`}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${userFilter === u.id ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'}`}
              >
                {u.full_name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {ACTIONS.map(a => (
            <Link
              key={a}
              href={`/activity-logs?action=${a}${userFilter ? `&user=${userFilter}` : ''}${moduleFilter ? `&module=${moduleFilter}` : ''}`}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${actionFilter === a ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'}`}
            >
              {ACTION_LABELS[a]}
            </Link>
          ))}
        </div>

        {hasFilters && (
          <Link href="/activity-logs" className="btn-secondary text-xs py-1.5 px-3">Clear All</Link>
        )}
      </div>

      <div className="card overflow-hidden">
        {(logs ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">No entries match your filters</p>
            {hasFilters && <Link href="/activity-logs" className="btn-secondary text-sm mt-3">Clear filters</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((log) => {
                 const user = (log.user as unknown) as { full_name: string; email: string; role: string } | null
                  return (
                    <tr key={log.id}>
                      <td className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-ZM', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <div className="text-sm font-medium text-[#0A1628] dark:text-white">{user?.full_name ?? 'System'}</div>
                        {user?.email && <div className="text-xs text-slate-400">{user.email}</div>}
                      </td>
                      <td>
                        {user?.role && (
                          <span className="badge badge-default text-xs capitalize">
                            {user.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${ACTION_COLORS[log.action] ?? 'badge-default'} text-xs`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <span>{MODULE_ICONS[log.entity_type] ?? '📝'}</span>
                          <span>{MODULE_LABELS[log.entity_type] ?? log.entity_type}</span>
                        </span>
                      </td>
                      <td>
                        {log.entity_label
                          ? <span className="font-mono text-xs font-semibold text-[#0066FF]">{log.entity_label}</span>
                          : <span className="text-xs text-slate-400">—</span>
                        }
                      </td>
                      <td className="text-xs text-slate-400 font-mono">{log.ip_address ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <p className="text-sm text-slate-400">
                  {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/activity-logs?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/activity-logs?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}