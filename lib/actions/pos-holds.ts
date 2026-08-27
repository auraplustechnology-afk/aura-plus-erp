'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'

export interface HoldCartInput {
  shift_id: string
  customer_id?: string | null
  cart: unknown
  note?: string
}

// ── Suspend the current cart so the till is free for another sale ─
export async function holdSale(input: HoldCartInput) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: ref, error: refError } = await supabase.rpc('generate_hold_reference')
  if (refError) return { error: refError.message }

  const { data, error } = await supabase
    .from('pos_held_sales')
    .insert({
      hold_reference: ref,
      shift_id: input.shift_id,
      customer_id: input.customer_id ?? null,
      cart: input.cart,
      note: input.note ?? null,
      held_by: authUser.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'sale_held',
    module: 'held_sale',
    entityId: data.id,
    entityLabel: ref,
  })

  revalidatePath('/pos')
  return { data }
}

// ── List held sales for the active shift ──────────────────────────
export async function listHeldSales(shiftId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('pos_held_sales')
    .select('*, customer:customer_id(id, company_name)')
    .eq('shift_id', shiftId)
    .eq('status', 'held')
    .order('held_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}

// ── Restore a held cart back onto the till ─────────────────────────
export async function resumeHeldSale(holdId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: hold } = await supabase.from('pos_held_sales').select('*').eq('id', holdId).single()
  if (!hold) return { error: 'Held sale not found' }
  if (hold.status !== 'held') return { error: 'This sale has already been resumed or cancelled' }

  const { error } = await supabase
    .from('pos_held_sales')
    .update({ status: 'resumed', resumed_at: new Date().toISOString() })
    .eq('id', holdId)

  if (error) return { error: error.message }

  await logActivity({
    action: 'sale_resumed',
    module: 'held_sale',
    entityId: holdId,
    entityLabel: hold.hold_reference,
  })

  revalidatePath('/pos')
  return { data: hold }
}

// ── Discard a held cart without completing it ─────────────────────
export async function cancelHeldSale(holdId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: hold } = await supabase.from('pos_held_sales').select('hold_reference, status').eq('id', holdId).single()
  if (!hold) return { error: 'Held sale not found' }
  if (hold.status !== 'held') return { error: 'This sale has already been resumed or cancelled' }

  const { error } = await supabase
    .from('pos_held_sales')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', holdId)

  if (error) return { error: error.message }

  revalidatePath('/pos')
  return { success: true }
}
