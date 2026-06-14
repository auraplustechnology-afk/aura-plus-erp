import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CRMClient from '@/components/modules/crm/CRMClient'

export const metadata = { title: 'CRM & Leads — Aura Plus ERP' }

export default async function CRMPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role, id, full_name').eq('id', authUser.id).single()

  // Fetch all active leads with assigned user info
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_user:assigned_to(id, full_name, email)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Fetch all sales users for assignment dropdown
  const { data: salesUsers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('role', ['sales', 'super_admin', 'manager'])
    .eq('is_active', true)
    .order('full_name')

  // Dashboard metrics
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [totalLeads, leadsThisMonth, wonLeads, pipelineValue] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact' }).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).gte('created_at', startOfMonth).is('deleted_at', null),
    supabase.from('leads').select('id', { count: 'exact' }).eq('stage', 'won').is('deleted_at', null),
    supabase.from('leads').select('expected_value').is('deleted_at', null).not('stage', 'in', '("lost","ghosted")'),
  ])

  const pipeline = (pipelineValue.data ?? []).reduce((sum, l) => sum + (l.expected_value ?? 0), 0)
  const total = totalLeads.count ?? 0
  const won = wonLeads.count ?? 0
  const totalClosed = (leads ?? []).filter(l => ['won', 'lost'].includes(l.stage)).length
  const conversionRate = totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0

  return (
    <CRMClient
      initialLeads={leads ?? []}
      salesUsers={salesUsers ?? []}
      currentUserId={authUser.id}
      currentUserRole={currentUser?.role ?? 'sales'}
      metrics={{
        totalLeads: total,
        leadsThisMonth: leadsThisMonth.count ?? 0,
        wonLeads: won,
        pipelineValue: pipeline,
        conversionRate,
        lostLeads: (leads ?? []).filter(l => l.stage === 'lost').length,
      }}
    />
  )
}
