import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectForm from '@/components/modules/projects/ProjectForm'

export const metadata = { title: 'New Project — Aura Plus ERP' }

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; quotation_id?: string; invoice_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams

  const [customersRes, techniciansRes, productsRes] = await Promise.all([
    supabase.from('customers').select('id, company_name, contact_person').is('deleted_at', null).order('company_name'),
    supabase.from('users').select('id, full_name').eq('role', 'technician').eq('is_active', true).order('full_name'),
    supabase.from('products').select('id, sku, product_name, selling_price, quantity_in_stock').eq('is_active', true).order('product_name'),
  ])

  return (
    <ProjectForm
      mode="new"
      customers={customersRes.data ?? []}
      technicians={techniciansRes.data ?? []}
      products={productsRes.data ?? []}
      preselectedCustomerId={params.customer_id}
      preselectedQuotationId={params.quotation_id}
      preselectedInvoiceId={params.invoice_id}
    />
  )
}
