import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Calendar, Users } from 'lucide-react'
import { formatDate, getProjectStatusClass, formatLabel } from '@/lib/utils/format'
import ProjectChecklist from '@/components/modules/projects/ProjectChecklist'
import ProjectFileUpload from '@/components/modules/projects/ProjectFileUpload'
import TechnicianStatusUpdate from '@/components/modules/technician/TechnicianStatusUpdate'

export default async function TechnicianProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // Verify this technician is assigned to this project (RLS also enforces this)
  const { data: assignment } = await supabase
    .from('project_technicians')
    .select('role')
    .eq('project_id', id)
    .eq('technician_id', authUser.id)
    .single()

  if (!assignment) notFound()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      id, project_number, project_name, status, scheduled_date,
      checklist, notes,
      customer:customer_id(company_name, contact_person, phone, physical_address),
      project_technicians(role, technician:technician_id(full_name, email)),
      project_files(id, file_type, file_name, file_url, created_at, uploaded_by_user:uploaded_by(full_name))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!project) notFound()

  // NO financial data fetched or displayed anywhere in this page
  const customer = project.customer as { company_name: string; contact_person: string | null; phone: string | null; physical_address: string | null } | null
  const checklist = project.checklist as Record<string, boolean>
  const techs = (project.project_technicians ?? []) as { role: string; technician: { full_name: string; email: string } }[]
  const files = (project.project_files ?? []) as { id: string; file_type: string; file_name: string; file_url: string; created_at: string; uploaded_by_user: { full_name: string } | null }[]
  const isCompleted = project.status === 'completed'
  const allChecked = Object.values(checklist).every(Boolean)

  const beforePhotos = files.filter(f => f.file_type === 'before')
  const afterPhotos = files.filter(f => f.file_type === 'after')

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div>
        <Link href="/my-projects" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> My Projects
        </Link>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-sm font-semibold text-[#0066FF]">{project.project_number}</span>
          <span className={`badge ${getProjectStatusClass(project.status)}`}>{formatLabel(project.status)}</span>
          {assignment.role === 'lead' && <span className="badge badge-primary">Lead Tech</span>}
        </div>
        <h1 className="text-xl font-bold text-[#0A1628] dark:text-white">{project.project_name}</h1>
      </div>

      {/* Customer info - no financial data */}
      {customer && (
        <div className="card p-4 space-y-2">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Site Information</h2>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="font-medium text-[#0A1628] dark:text-white">{customer.company_name}</span>
            {customer.contact_person && <span className="text-slate-400">· {customer.contact_person}</span>}
          </div>
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
              <Phone className="w-4 h-4 flex-shrink-0" />{customer.phone}
            </a>
          )}
          {customer.physical_address && (
            <div className="flex items-start gap-2 text-sm text-slate-500">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{customer.physical_address}</span>
            </div>
          )}
          {project.scheduled_date && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Scheduled: <strong className="text-[#0A1628] dark:text-white">{formatDate(project.scheduled_date)}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Team */}
      {techs.length > 1 && (
        <div className="card p-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Team</h2>
          <div className="space-y-2">
            {techs.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-bold text-sm">
                  {t.technician?.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#0A1628] dark:text-white">{t.technician?.full_name}</div>
                  <div className="text-xs text-slate-400">{t.role === 'lead' ? 'Lead Technician' : 'Assistant'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {project.notes && (
        <div className="card p-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Project Notes</h2>
          <p className="text-sm text-slate-500 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* Checklist */}
      <ProjectChecklist
        projectId={id}
        checklist={checklist}
        isCompleted={isCompleted}
      />

      {/* Photo uploads */}
      <div className="card p-4 space-y-4">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Site Photos</h2>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Before ({beforePhotos.length})</h3>
          {beforePhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {beforePhotos.map(f => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.file_url} alt={f.file_name} className="w-full h-24 object-cover rounded-lg" />
                </a>
              ))}
            </div>
          )}
          {!isCompleted && <ProjectFileUpload projectId={id} fileType="before" label="Take Before Photo" />}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">After ({afterPhotos.length})</h3>
          {afterPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {afterPhotos.map(f => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.file_url} alt={f.file_name} className="w-full h-24 object-cover rounded-lg" />
                </a>
              ))}
            </div>
          )}
          {!isCompleted && <ProjectFileUpload projectId={id} fileType="after" label="Take After Photo" />}
        </div>
      </div>

      {/* Status update */}
      {!isCompleted && (
        <TechnicianStatusUpdate
          projectId={id}
          currentStatus={project.status}
          allChecklistComplete={allChecked}
        />
      )}
    </div>
  )
}
