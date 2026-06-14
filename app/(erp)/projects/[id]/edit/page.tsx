import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectForm from '@/components/modules/projects/ProjectForm'
import type { Project } from '@/types'

export const metadata = { title: 'Edit Project — Aura Plus ERP' }

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [projectRes, customersRes, techniciansRes, productsRes] = await Promise.all([
    supabase.from('projects').select(`
      *, 
      project_technicians(id, technician_id, role),
      project_products(id, product_id, quantity_used)
    `).eq('id', id).is('deleted_at', null).single(),
    supabase.from('customers').select('id, company_name, contact_person').is('deleted_at', null).order('company_name'),
    supabase.from('users').select('id, full_name').eq('role', 'technician').eq('is_active', true).order('full_name'),
    supabase.from('products').select('id, sku, product_name, selling_price, quantity_in_stock').eq('is_active', true).order('product_name'),
  ])

  if (!projectRes.data) notFound()
  if (projectRes.data.status === 'completed') redirect(`/projects/${id}`)

  const project = {
    ...projectRes.data,
    technicians: projectRes.data.project_technicians?.map((t: { technician_id: string; role: string }) => ({
      id: t.technician_id,
      technician_id: t.technician_id,
      role: t.role,
      project_id: id,
      assigned_at: new Date().toISOString(),
      assigned_by: null,
    })),
    products: projectRes.data.project_products?.map((p: { product_id: string; quantity_used: number }) => ({
      id: p.product_id,
      project_id: id,
      product_id: p.product_id,
      quantity_used: p.quantity_used,
      created_at: new Date().toISOString(),
    })),
  } as Project

  return (
    <ProjectForm
      mode="edit"
      project={project}
      customers={customersRes.data ?? []}
      technicians={techniciansRes.data ?? []}
      products={productsRes.data ?? []}
    />
  )
}
