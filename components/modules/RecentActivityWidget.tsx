import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Activity, ArrowUpRight } from 'lucide-react'
import { ACTION_LABELS, ACTION_COLORS, MODULE_ICONS } from '@/lib/utils/activity'
import { formatDate } from '@/lib/utils/format'

export default async function RecentActivityWidget() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('activity_logs')
    .select(`
      id, action, entity_type, entity_label, created_at,
      user:user_id(full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0066FF]" />
          <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Recent Activity</h3>
        </div>
        <Link href="/activity-logs" className="flex items-center gap-1 text-xs text-[#0066FF] hover:underline font-medium">
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {(!logs || logs.length === 0) ? (
        <div className="flex items-center justify-center py-10 text-sm text-slate-400">
          No activity recorded yet
        </div>
      ) : (
        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
          {logs.map((log) => {
            const user = log.user as { full_name: string; role: string } | null
            const icon = MODULE_ICONS[log.entity_type] ?? '📝'
            const actionLabel = ACTION_LABELS[log.action] ?? log.action
            const actionColor = ACTION_COLORS[log.action] ?? 'badge-default'

            return (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]/50 transition-colors">
                {/* Module icon */}
                <div className="w-7 h-7 bg-slate-100 dark:bg-[#1E2A3B] rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#0A1628] dark:text-white truncate">
                      {user?.full_name ?? 'System'}
                    </span>
                    <span className={`badge ${actionColor} text-[10px]`}>{actionLabel}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {log.entity_label
                      ? <span className="text-[#0066FF] font-medium">{log.entity_label}</span>
                      : <span className="capitalize">{log.entity_type}</span>
                    }
                    {user?.role && (
                      <span className="ml-1.5 text-slate-300 dark:text-slate-600">· {user.role.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                  {formatDate(log.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
