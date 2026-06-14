'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProjectStatus, ProjectChecklist } from '@/types'

export interface ProjectInput {
  customer_id: string
  project_name: string
  quotation_id?: string | null
  invoice_id?: string | null
  scheduled_date?: string | null
  notes?: string | null
  technician_ids?: { id: string; role: 'lead' | 'assistant' }[]
  product_lines?: { product_id: string; quantity_used: number }[]
}

// ── Create Project ───────────────────────────────────────────
export async function createProject(input: ProjectInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: projNum } = await supabase.rpc('generate_project_number')

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      project_number: projNum as string,
      customer_id: input.customer_id,
      project_name: input.project_name,
      quotation_id: input.quotation_id ?? null,
      invoice_id: input.invoice_id ?? null,
      scheduled_date: input.scheduled_date ?? null,
      notes: input.notes ?? null,
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Assign technicians
  if (input.technician_ids && input.technician_ids.length > 0) {
    await supabase.from('project_technicians').insert(
      input.technician_ids.map(t => ({
        project_id: project.id,
        technician_id: t.id,
        role: t.role,
        assigned_by: user.id,
      }))
    )
  }

  // Add product lines
  if (input.product_lines && input.product_lines.length > 0) {
    await supabase.from('project_products').insert(
      input.product_lines.map(p => ({
        project_id: project.id,
        product_id: p.product_id,
        quantity_used: p.quantity_used,
      }))
    )
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'created', entity_type: 'project',
    entity_id: project.id, entity_label: project.project_number,
    new_values: { customer_id: input.customer_id, project_name: input.project_name },
  })

  revalidatePath('/projects')
  revalidatePath(`/customers/${input.customer_id}`)
  return { data: project }
}

// ── Update Project ───────────────────────────────────────────
export async function updateProject(id: string, input: Partial<ProjectInput> & { status?: ProjectStatus }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const updateData: Record<string, unknown> = {}
  if (input.project_name !== undefined) updateData.project_name = input.project_name
  if (input.customer_id !== undefined) updateData.customer_id = input.customer_id
  if (input.scheduled_date !== undefined) updateData.scheduled_date = input.scheduled_date
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.status !== undefined) updateData.status = input.status
  if (input.status === 'completed') updateData.completed_at = new Date().toISOString()

  const { data: project, error } = await supabase
    .from('projects').update(updateData).eq('id', id).select().single()

  if (error) return { error: error.message }

  // Re-assign technicians if provided
  if (input.technician_ids !== undefined) {
    await supabase.from('project_technicians').delete().eq('project_id', id)
    if (input.technician_ids.length > 0) {
      await supabase.from('project_technicians').insert(
        input.technician_ids.map(t => ({
          project_id: id, technician_id: t.id,
          role: t.role, assigned_by: user.id,
        }))
      )
    }
  }

  // Re-assign product lines if provided
  if (input.product_lines !== undefined) {
    await supabase.from('project_products').delete().eq('project_id', id)
    if (input.product_lines.length > 0) {
      await supabase.from('project_products').insert(
        input.product_lines.map(p => ({
          project_id: id, product_id: p.product_id,
          quantity_used: p.quantity_used,
        }))
      )
    }
  }

  // Trigger stock deduction on completion (standalone projects without invoice)
  if (input.status === 'completed') {
    const { data: full } = await supabase.from('projects')
      .select('invoice_id, stock_deducted_via').eq('id', id).single()

    if (!full?.invoice_id && !full?.stock_deducted_via) {
      await deductStockForProject(id, user.id)
    }
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: input.status ? 'status_changed' : 'updated',
    entity_type: 'project', entity_id: id, entity_label: project.project_number,
    new_values: updateData,
  })

  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  return { data: project }
}

// ── Update Checklist Item ────────────────────────────────────
export async function updateChecklistItem(
  projectId: string,
  item: keyof ProjectChecklist,
  value: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: project } = await supabase.from('projects')
    .select('checklist').eq('id', projectId).single()

  if (!project) return { error: 'Project not found' }

  const updatedChecklist = { ...project.checklist, [item]: value }

  const { error } = await supabase.from('projects')
    .update({ checklist: updatedChecklist }).eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true, checklist: updatedChecklist }
}

// ── Upload Project File ──────────────────────────────────────
export async function saveProjectFile(input: {
  project_id: string
  file_type: 'before' | 'after' | 'document'
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase.from('project_files')
    .insert({ ...input, uploaded_by: user.id }).select().single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${input.project_id}`)
  return { data }
}

// ── Delete Project (soft) ────────────────────────────────────
export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: p } = await supabase.from('projects').select('project_number, status').eq('id', id).single()
  if (p?.status === 'completed') return { error: 'Cannot delete a completed project' }

  await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/projects')
  return { success: true }
}

// ── Internal: Deduct stock on project completion ─────────────
async function deductStockForProject(projectId: string, userId: string) {
  const supabase = await createClient()

  const { data: items } = await supabase.from('project_products')
    .select('product_id, quantity_used').eq('project_id', projectId)

  if (!items || items.length === 0) {
    await supabase.from('projects').update({
      stock_deducted_via: 'project', stock_deducted_at: new Date().toISOString(),
    }).eq('id', projectId)
    return
  }

  for (const item of items) {
    if (!item.product_id) continue
    const { data: product } = await supabase.from('products')
      .select('quantity_in_stock, product_name').eq('id', item.product_id).single()
    if (!product) continue

    const qtyBefore = product.quantity_in_stock
    const qtyAfter = Math.max(0, qtyBefore - item.quantity_used)

    await supabase.from('products').update({ quantity_in_stock: qtyAfter }).eq('id', item.product_id)
    await supabase.from('stock_adjustments').insert({
      product_id: item.product_id, adjustment_type: 'project_use',
      quantity_before: qtyBefore, quantity_change: -item.quantity_used,
      quantity_after: qtyAfter, reference_type: 'project', reference_id: projectId,
      reason: 'Auto-deducted on project completion', adjusted_by: userId,
    })
  }

  await supabase.from('projects').update({
    stock_deducted_via: 'project', stock_deducted_at: new Date().toISOString(),
  }).eq('id', projectId)
}
