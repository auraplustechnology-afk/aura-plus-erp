import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ERPShell from '@/components/layout/ERPShell'
import type { User } from '@/types'

export default async function ERPLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userData) redirect('/login')

  // Fetch quick stats for sidebar
  const [ticketsRes, stockRes, projectsRes] = await Promise.all([
    supabase.from('support_tickets').select('id', { count: 'exact' }).in('status', ['open', 'assigned', 'in_progress']),
    supabase.from('products').select('id', { count: 'exact' }).filter('quantity_in_stock', 'lte', 'reorder_level').eq('is_active', true),
    supabase.from('projects').select('id', { count: 'exact' }).in('status', ['in_progress', 'scheduled']),
  ])

  return (
    <ERPShell
      user={userData as User}
      stats={{
        openTickets: ticketsRes.count ?? 0,
        lowStock: stockRes.count ?? 0,
        activeProjects: projectsRes.count ?? 0,
      }}
    >
      {children}
    </ERPShell>
  )
}
