import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderKanban, Calendar } from 'lucide-react'
import { formatDate, getProjectStatusClass, formatLabel } from '@/lib/utils/format'

export const metadata = { title: 'Projects — Aura Plus ERP' }

const STATUS_TABS = [
  { label: 'All',         value: '' },
  { label: 'Pending',     value: 'pending' },
  { label: 'Scheduled',   value: 'scheduled' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed',   value: 'completed' },
]

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? ''
  const page = parseInt(params.page ?? '1')
  const pageSize = 20

  let query = supabase
    .from('projects')
    .select(`
      id, project_number, project_name, status, scheduled_date, created_at, completed_at,
      checklist,
      customers:customer_id(company_name),
      project_technicians(technician_id, role, users:technician_id(full_name))
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: projects, count } = await query

  const statusCounts = await Promise.all(
    STATUS_TABS.slice(1).map(tab =>
      supabase.from('projects').select('id', { count: 'exact' })
        .eq('status', tab.value).is('deleted_at', null)
    )
  )

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{count ?? 0} total projects</p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B] overflow-x-auto">
        <Link href="/projects"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${!statusFilter ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'}`}>
          All <span className={`text-xs px-1.5 py-0.5 rounded-full ${!statusFilter ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>{count ?? 0}</span>
        </Link>
        {STATUS_TABS.slice(1).map((tab, i) => (
          <Link key={tab.value} href={`/projects?status=${tab.value}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${statusFilter === tab.value ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'}`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === tab.value ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'}`}>
              {statusCounts[i]?.count ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Projects grid */}
      {(projects ?? []).length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No projects yet</h3>
          <p className="text-sm text-slate-400 mb-4">Projects are created from accepted quotations or manually.</p>
          <Link href="/projects/new" className="btn-primary"><Plus className="w-4 h-4" /> New Project</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Customer</th>
                <th>Technicians</th>
                <th>Status</th>
                <th>Checklist</th>
                <th className="hidden md:table-cell">Scheduled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(projects ?? []).map((project) => {
                const customer = project.customers as { company_name: string } | null
                const techs = project.project_technicians as { role: string; users: { full_name: string } }[]
                const checklist = project.checklist as Record<string, boolean>
                const checkCount = checklist ? Object.values(checklist).filter(Boolean).length : 0
                const checkTotal = checklist ? Object.keys(checklist).length : 5

                return (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/projects/${project.id}`} className="font-mono text-sm font-semibold text-[#0066FF] hover:underline block">
                        {project.project_number}
                      </Link>
                      <div className="text-sm text-[#0A1628] dark:text-slate-200 mt-0.5 max-w-[200px] truncate">
                        {project.project_name}
                      </div>
                    </td>
                    <td className="text-sm text-slate-500">{customer?.company_name ?? '—'}</td>
                    <td>
                      {techs && techs.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {techs.slice(0, 2).map((t, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#0066FF]/10 flex items-center justify-center text-[#0066FF] text-[9px] font-bold">
                                {t.users?.full_name?.charAt(0)}
                              </div>
                              <span className="text-xs text-slate-500 truncate max-w-[80px]">{t.users?.full_name?.split(' ')[0]}</span>
                              {t.role === 'lead' && <span className="text-[9px] text-[#0066FF] font-medium">Lead</span>}
                            </div>
                          ))}
                          {techs.length > 2 && <span className="text-xs text-slate-400">+{techs.length - 2} more</span>}
                        </div>
                      ) : <span className="text-xs text-slate-400">Unassigned</span>}
                    </td>
                    <td>
                      <span className={`badge ${getProjectStatusClass(project.status)}`}>
                        {formatLabel(project.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-1.5">
                          <div className="bg-green-500 rounded-full h-1.5 transition-all" style={{ width: `${(checkCount / checkTotal) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{checkCount}/{checkTotal}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      {project.scheduled_date ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />{formatDate(project.scheduled_date)}
                        </div>
                      ) : '—'}
                    </td>
                    <td><Link href={`/projects/${project.id}`} className="text-xs text-[#0066FF] hover:underline font-medium">View →</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
              <p className="text-sm text-slate-400">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={`/projects?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>}
                {page < totalPages && <Link href={`/projects?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
