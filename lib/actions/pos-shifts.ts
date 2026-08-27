'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'

const CASHIER_ROLES = ['super_admin', 'sales', 'manager']

// ── Open a new shift for the current cashier ────────────────────
export async function openShift(openingFloat: number) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role, full_name').eq('id', authUser.id).single()
  if (!caller || !CASHIER_ROLES.includes(caller.role)) return { error: 'Not authorized to open a POS shift' }

  if (openingFloat < 0) return { error: 'Opening float cannot be negative' }

  const { data: existing } = await supabase
    .from('pos_shifts').select('id').eq('opened_by', authUser.id).eq('status', 'open').maybeSingle()
  if (existing) return { error: 'You already have an open shift' }

  const { data, error } = await supabase
    .from('pos_shifts')
    .insert({ opened_by: authUser.id, opening_float: openingFloat })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'shift_opened',
    module: 'shift',
    entityId: data.id,
    entityLabel: `Shift opened by ${caller.full_name}`,
    newValues: { opening_float: openingFloat },
  })

  revalidatePath('/pos')
  revalidatePath('/pos/shifts')
  return { data }
}

// ── The caller's currently open shift, if any ───────────────────
export async function getOpenShift() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('pos_shifts').select('*').eq('opened_by', authUser.id).eq('status', 'open').maybeSingle()
  if (error) return { error: error.message }
  return { data }
}

// ── Record a cash-in / cash-out during an open shift ─────────────
export async function recordCashMovement(input: {
  shift_id: string
  movement_type: 'cash_in' | 'cash_out'
  amount: number
  reason: string
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!caller || !CASHIER_ROLES.includes(caller.role)) return { error: 'Not authorized' }

  if (input.amount <= 0) return { error: 'Amount must be greater than zero' }
  if (!input.reason.trim()) return { error: 'A reason is required' }

  const { data: shift } = await supabase.from('pos_shifts').select('status, opened_by').eq('id', input.shift_id).single()
  if (!shift) return { error: 'Shift not found' }
  if (shift.status !== 'open') return { error: 'Shift is already closed' }
  if (caller.role === 'sales' && shift.opened_by !== authUser.id) {
    return { error: 'You can only record cash movements on your own shift' }
  }

  const { data, error } = await supabase
    .from('pos_cash_movements')
    .insert({
      shift_id: input.shift_id,
      movement_type: input.movement_type,
      amount: input.amount,
      reason: input.reason.trim(),
      recorded_by: authUser.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: input.movement_type,
    module: 'shift',
    entityId: input.shift_id,
    entityLabel: input.reason,
    newValues: { amount: input.amount },
  })

  revalidatePath('/pos')
  revalidatePath('/pos/shifts')
  return { data }
}

// ── Close a shift, computing expected cash and variance ──────────
export async function closeShift(input: { shift_id: string; closing_cash_counted: number; notes?: string }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!caller || !CASHIER_ROLES.includes(caller.role)) return { error: 'Not authorized' }

  const { data: shift } = await supabase.from('pos_shifts').select('*').eq('id', input.shift_id).single()
  if (!shift) return { error: 'Shift not found' }
  if (shift.status !== 'open') return { error: 'Shift is already closed' }
  if (caller.role === 'sales' && shift.opened_by !== authUser.id) {
    return { error: 'You can only close your own shift' }
  }
  if (input.closing_cash_counted < 0) return { error: 'Closing cash cannot be negative' }

  // Cash sales during this shift, net of any cash refunds (refunds
  // are inserted as negative-amount payments, so a plain SUM nets them out)
  const { data: invoiceIdsRes } = await supabase.from('invoices').select('id').eq('shift_id', input.shift_id)
  const invoiceIds = (invoiceIdsRes ?? []).map(i => i.id)

  let cashSalesNet = 0
  if (invoiceIds.length) {
    const { data: payments } = await supabase
      .from('payments').select('amount').in('invoice_id', invoiceIds).eq('payment_method', 'cash')
    cashSalesNet = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  }

  const { data: movements } = await supabase
    .from('pos_cash_movements').select('movement_type, amount').eq('shift_id', input.shift_id)
  const cashIn = (movements ?? []).filter(m => m.movement_type === 'cash_in').reduce((s, m) => s + Number(m.amount), 0)
  const cashOut = (movements ?? []).filter(m => m.movement_type === 'cash_out').reduce((s, m) => s + Number(m.amount), 0)

  const expectedCash = Number(shift.opening_float) + cashSalesNet + cashIn - cashOut
  const variance = input.closing_cash_counted - expectedCash

  const { data, error } = await supabase
    .from('pos_shifts')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: authUser.id,
      expected_cash: expectedCash,
      closing_cash_counted: input.closing_cash_counted,
      cash_variance: variance,
      notes: input.notes ?? null,
    })
    .eq('id', input.shift_id)
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'shift_closed',
    module: 'shift',
    entityId: input.shift_id,
    entityLabel: 'Shift closed',
    newValues: { expected_cash: expectedCash, closing_cash_counted: input.closing_cash_counted, variance },
  })

  revalidatePath('/pos')
  revalidatePath('/pos/shifts')
  return { data }
}
