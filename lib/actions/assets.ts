'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'

export async function createAsset(input: {
  customer_id: string
  project_id?: string | null
  invoice_id?: string | null
  product_id?: string | null
  asset_name: string
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  installation_date: string
  warranty_months: number
  location_description?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('customer_assets')
    .insert({ ...input, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'created',
    module: 'customer',
    entityId: data.id,
    entityLabel: `Asset: ${input.asset_name}`,
    newValues: { customer_id: input.customer_id, warranty_months: input.warranty_months },
  })

  revalidatePath('/assets')
  revalidatePath(`/customers/${input.customer_id}`)
  return { data }
}

export async function updateAsset(id: string, input: Partial<{
  asset_name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  installation_date: string
  warranty_months: number
  location_description: string | null
  notes: string | null
  status: string
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('customer_assets')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  return { data }
}

export async function addServiceLog(input: {
  asset_id: string
  service_date: string
  service_type: string
  description: string
  technician_id?: string | null
  ticket_id?: string | null
  cost?: number
  parts_used?: string | null
  next_service_date?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('asset_service_logs')
    .insert({ ...input, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/assets/${input.asset_id}`)
  return { data }
}

export async function deleteAsset(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase.from('customer_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/assets')
  return { success: true }
}
