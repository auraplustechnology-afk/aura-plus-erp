import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewTicketForm from '@/components/modules/tickets/NewTicketForm'

export const metadata = { title: 'New Ticket — Aura Plus ERP' }

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; product_id?: string; project_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams

  const [customersRes, techniciansRes, productsRes] = await Promise.all([
    supabase.from('customers').select('id, company_name, contact_person')
      .is('deleted_at', null).order('company_name'),
    supabase.from('users').select('id, full_name')
      .eq('role', 'technician').eq('is_active', true).order('full_name'),
    supabase.from('products').select('id, sku, product_name')
      .eq('is_active', true).order('product_name'),
  ])

  return (
    <NewTicketForm
      customers={customersRes.data ?? []}
      technicians={techniciansRes.data ?? []}
      products={productsRes.data ?? []}
      preselectedCustomerId={params.customer_id}
      preselectedProductId={params.product_id}
      preselectedProjectId={params.project_id}
    />
  )
}
