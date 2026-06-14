import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TechnicianShell from '@/components/modules/technician/TechnicianShell'

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_active')
    .eq('id', authUser.id)
    .single()

  if (!userData || !userData.is_active) redirect('/login')

  // Only technicians access this portal
  // Other roles get redirected to main ERP dashboard
  if (userData.role !== 'technician') redirect('/dashboard')

  // Counts for the portal nav
  const [projectsRes, ticketsRes] = await Promise.all([
    supabase.from('projects')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'scheduled', 'in_progress'])
      .is('deleted_at', null)
      .in('id', supabase.from('project_technicians').select('project_id').eq('technician_id', authUser.id) as never),
    supabase.from('support_tickets')
      .select('id', { count: 'exact' })
      .eq('assigned_technician_id', authUser.id)
      .in('status', ['open', 'assigned', 'in_progress'])
      .is('deleted_at', null),
  ])

  return (
    <TechnicianShell
      user={userData}
      activeProjectsCount={projectsRes.count ?? 0}
      openTicketsCount={ticketsRes.count ?? 0}
    >
      {children}
    </TechnicianShell>
  )
}
