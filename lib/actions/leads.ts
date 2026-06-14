'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LeadStage } from '@/types'

// ── Create Lead ──────────────────────────────────────────────
export async function createLead(formData: {
  company_name: string
  contact_person?: string
  phone?: string
  email?: string
  physical_address?: string
  lead_source: string
  assigned_to?: string
  expected_value?: number
  stage?: LeadStage
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...formData,
      expected_value: formData.expected_value ?? 0,
      stage: formData.stage ?? 'new_lead',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'created',
    entity_type: 'lead',
    entity_id: data.id,
    entity_label: data.company_name,
    new_values: formData,
  })

  revalidatePath('/crm')
  return { data }
}

// ── Update Lead ──────────────────────────────────────────────
export async function updateLead(id: string, formData: Partial<{
  company_name: string
  contact_person: string
  phone: string
  email: string
  physical_address: string
  lead_source: string
  assigned_to: string
  expected_value: number
  stage: LeadStage
  notes: string
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: before } = await supabase.from('leads').select('*').eq('id', id).single()

  const { data, error } = await supabase
    .from('leads')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'updated',
    entity_type: 'lead',
    entity_id: id,
    entity_label: data.company_name,
    old_values: before,
    new_values: formData,
  })

  revalidatePath('/crm')
  return { data }
}

// ── Update Lead Stage ────────────────────────────────────────
export async function updateLeadStage(id: string, stage: LeadStage) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: before } = await supabase.from('leads').select('stage, company_name').eq('id', id).single()

  const { data, error } = await supabase
    .from('leads')
    .update({ stage })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'lead',
    entity_id: id,
    entity_label: before?.company_name,
    old_values: { stage: before?.stage },
    new_values: { stage },
  })

  revalidatePath('/crm')
  return { data }
}

// ── Delete Lead (soft) ───────────────────────────────────────
export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: lead } = await supabase.from('leads').select('company_name').eq('id', id).single()

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'deleted',
    entity_type: 'lead',
    entity_id: id,
    entity_label: lead?.company_name,
  })

  revalidatePath('/crm')
  return { success: true }
}

// ── Convert Lead to Customer ─────────────────────────────────
export async function convertLeadToCustomer(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get the lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { error: 'Lead not found' }
  if (lead.converted_to_customer_id) return { error: 'Lead already converted' }

  // Create customer from lead data
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      company_name: lead.company_name,
      contact_person: lead.contact_person,
      phone: lead.phone,
      email: lead.email,
      physical_address: lead.physical_address,
      customer_type: 'active',
      source: 'lead_conversion',
      created_by: user.id,
    })
    .select()
    .single()

  if (customerError) return { error: customerError.message }

  // Update lead with conversion info
  await supabase
    .from('leads')
    .update({
      converted_to_customer_id: customer.id,
      converted_at: new Date().toISOString(),
      stage: 'won',
    })
    .eq('id', leadId)

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'converted',
    entity_type: 'lead',
    entity_id: leadId,
    entity_label: lead.company_name,
    new_values: { converted_to_customer_id: customer.id, stage: 'won' },
  })

  revalidatePath('/crm')
  revalidatePath('/customers')
  return { customer }
}
