import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Users, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { formatDate, getProjectStatusClass, formatLabel } from '@/lib/utils/format'

export const metadata = { title: 'My Projects — Aura Plus ERP' }

const STATUS_ORDER = { in_progress: 0, scheduled: 1, pending: 2, completed: 3 }

export default async function TechnicianProjectsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // Get only projects assigned to this technician — RLS enforces this too
  const { data: assignments } = await supabase
    .from('project_technicians')
    .select('project_id, role')
    .eq('technician_id', authUser.id)

  const projectIds = (assignments ?? []).map(a => a.project_id)

  if (projectIds.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-100 dark:bg-[#1E2A3B] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-2">No projects yet</h2>
        <p className="text-slate-400 text-sm">You haven't been assigned to any projects yet.</p>
      </div>
    )
  }

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, project_number, project_name, status, scheduled_date,
      checklist, notes, created_at,
      customer:customer_id(company_name, contact_person, phone, physical_address),
      project_technicians(role, technician_id)
    `)
    .in('id', projectIds)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  const sorted = [...(projects ?? [])].sort((a, b) => {
    const ao = STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 99
    const bo = STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 99
    return ao - bo
  })

  const active = sorted.filter(p => p.status !== 'completed')
  const completed = sorted.filter(p => p.status === 'completed')

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white">My Projects</h1>
        <p className="text-sm text-slate-400 mt-0.5">{active.length} active · {completed.length} completed</p>
      </div>

      {/* Active projects */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</h2>
          {active.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              myRole={(assignments ?? []).find(a => a.project_id === project.id)?.role ?? 'assistant'}
            />
          ))}
        </div>
      )}

      {/* Completed projects */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</h2>
          {completed.slice(0, 5).map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              myRole={(assignments ?? []).find(a => a.project_id === project.id)?.role ?? 'assistant'}
              muted
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, myRole, muted }: {
  project: {
    id: string; project_number: string; project_name: string; status: string;
    scheduled_date: string | null; checklist: Record<string, boolean> | null;
    customer: { company_name: string; contact_person: string | null; phone: string | null; physical_address: string | null } | null
  }
  myRole: string
  muted?: boolean
}) {
  const checklist = project.checklist ?? {}
  const checkCount = Object.values(checklist).filter(Boolean).length
  const checkTotal = Object.keys(checklist).length || 5
  const customer = project.customer

  return (
    <Link
      href={`/my-projects/${project.id}`}
      className={`card block p-4 hover:shadow-md transition-all group ${muted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-semibold text-[#0066FF]">{project.project_number}</span>
            <span className={`badge ${getProjectStatusClass(project.status)} text-xs`}>{formatLabel(project.status)}</span>
            {myRole === 'lead' && <span className="badge badge-primary text-xs">Lead Tech</span>}
          </div>
          <h3 className="font-semibold text-[#0A1628] dark:text-white text-base leading-tight">{project.project_name}</h3>

          {customer && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{customer.company_name}</span>
                {customer.contact_person && <span className="text-slate-400">· {customer.contact_person}</span>}
              </div>
              {customer.physical_address && (
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{customer.physical_address}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            {project.scheduled_date && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(project.scheduled_date)}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-20 bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-1.5">
                <div
                  className="rounded-full h-1.5 transition-all"
                  style={{
                    width: `${(checkCount / checkTotal) * 100}%`,
                    backgroundColor: checkCount === checkTotal ? '#00C853' : '#0066FF'
                  }}
                />
              </div>
              <span className="text-xs text-slate-400">{checkCount}/{checkTotal}</span>
              {checkCount === checkTotal && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#0066FF] transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  )
}
