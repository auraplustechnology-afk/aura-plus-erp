'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TicketPriority, TicketStatus } from '@/types'

// ── Create Ticket ────────────────────────────────────────────
export async function createTicket(input: {
  customer_id: string
  product_id?: string | null
  project_id?: string | null
  issue_description: string
  priority: TicketPriority
  assigned_technician_id?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: ticketNum } = await supabase.rpc('generate_ticket_number')

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      ticket_number: ticketNum as string,
      customer_id: input.customer_id,
      product_id: input.product_id ?? null,
      project_id: input.project_id ?? null,
      issue_description: input.issue_description,
      priority: input.priority,
      assigned_technician_id: input.assigned_technician_id ?? null,
      status: input.assigned_technician_id ? 'assigned' : 'open',
      created_by: user.id,
      // SLA auto-set by DB trigger
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'created', entity_type: 'ticket',
    entity_id: ticket.id, entity_label: ticket.ticket_number,
    new_values: { customer_id: input.customer_id, priority: input.priority },
  })

  revalidatePath('/tickets')
  revalidatePath(`/customers/${input.customer_id}`)
  return { data: ticket }
}

// ── Update Ticket ────────────────────────────────────────────
export async function updateTicket(id: string, input: Partial<{
  customer_id: string
  product_id: string | null
  project_id: string | null
  issue_description: string
  priority: TicketPriority
  assigned_technician_id: string | null
  status: TicketStatus
  resolution_notes: string | null
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: before } = await supabase
    .from('support_tickets').select('status, ticket_number').eq('id', id).single()

  // Set timestamps based on status changes
  const extra: Record<string, string | null> = {}
  if (input.status === 'resolved' && before?.status !== 'resolved') {
    extra.resolved_at = new Date().toISOString()
  }
  if (input.status === 'closed' && before?.status !== 'closed') {
    extra.closed_at = new Date().toISOString()
  }
  // Auto-assign status when technician assigned
  if (input.assigned_technician_id && input.status === undefined) {
    input.status = 'assigned'
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .update({ ...input, ...extra })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: input.status && input.status !== before?.status ? 'status_changed' : 'updated',
    entity_type: 'ticket',
    entity_id: id, entity_label: before?.ticket_number,
    old_values: before ? { status: before.status } : undefined,
    new_values: input,
  })

  revalidatePath('/tickets')
  revalidatePath(`/tickets/${id}`)
  return { data: ticket }
}

// ── Add Comment ──────────────────────────────────────────────
export async function addTicketComment(ticketId: string, comment: string, isInternal: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      comment,
      is_internal: isInternal,
      created_by: user.id,
    })
    .select('*, created_by_user:created_by(id, full_name, avatar_url)')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/tickets/${ticketId}`)
  return { data }
}

// ── Escalate to Project ──────────────────────────────────────
export async function escalateTicketToProject(ticketId: string, projectInput: {
  customer_id: string
  project_name: string
  scheduled_date?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: ticket } = await supabase
    .from('support_tickets').select('ticket_number, assigned_technician_id').eq('id', ticketId).single()

  // Generate project number
  const { data: projNum } = await supabase.rpc('generate_project_number')

  // Create project from ticket
  const { data: project, error: projError } = await supabase
    .from('projects')
    .insert({
      project_number: projNum as string,
      customer_id: projectInput.customer_id,
      project_name: projectInput.project_name,
      scheduled_date: projectInput.scheduled_date ?? null,
      status: 'pending',
      notes: `Escalated from ticket ${ticket?.ticket_number}`,
      created_by: user.id,
    })
    .select()
    .single()

  if (projError) return { error: projError.message }

  // Assign the ticket's technician to the new project
  if (ticket?.assigned_technician_id) {
    await supabase.from('project_technicians').insert({
      project_id: project.id,
      technician_id: ticket.assigned_technician_id,
      role: 'lead',
      assigned_by: user.id,
    })
  }

  // Link ticket to project
  await supabase.from('support_tickets').update({
    escalated_to_project_id: project.id,
    status: 'in_progress',
  }).eq('id', ticketId)

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'created', entity_type: 'project',
    entity_id: project.id, entity_label: project.project_number,
    new_values: { escalated_from_ticket: ticket?.ticket_number },
  })

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/projects')
  return { project }
}

// ── Delete Ticket (soft) ─────────────────────────────────────
export async function deleteTicket(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: t } = await supabase.from('support_tickets')
    .select('ticket_number').eq('id', id).single()

  await supabase.from('support_tickets')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id)

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'deleted', entity_type: 'ticket',
    entity_id: id, entity_label: t?.ticket_number,
  })

  revalidatePath('/tickets')
  return { success: true }
}
