'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Create Customer ──────────────────────────────────────────
export async function createCustomer(formData: {
  company_name: string
  contact_person?: string
  phone?: string
  email?: string
  physical_address?: string
  customer_type?: string
  source?: string
  tpin?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...formData, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'created',
    entity_type: 'customer',
    entity_id: data.id,
    entity_label: data.company_name,
    new_values: formData,
  })

  revalidatePath('/customers')
  return { data }
}

// ── Update Customer ──────────────────────────────────────────
export async function updateCustomer(id: string, formData: Partial<{
  company_name: string
  contact_person: string
  phone: string
  email: string
  physical_address: string
  customer_type: string
  tpin: string
  notes: string
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()

  const { data, error } = await supabase
    .from('customers')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'updated',
    entity_type: 'customer',
    entity_id: id,
    entity_label: data.company_name,
    old_values: before,
    new_values: formData,
  })

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return { data }
}

// ── Delete Customer (soft) ───────────────────────────────────
export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: customer } = await supabase.from('customers').select('company_name').eq('id', id).single()

  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'deleted',
    entity_type: 'customer',
    entity_id: id,
    entity_label: customer?.company_name,
  })

  revalidatePath('/customers')
  return { success: true }
}
