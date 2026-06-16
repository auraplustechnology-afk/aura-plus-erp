'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'

export async function createExpense(input: {
  expense_date: string
  amount: number
  category_id: string
  description: string
  employee_id?: string | null
  receipt_url?: string | null
  receipt_name?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...input,
      employee_id: input.employee_id ?? null,
      receipt_url: input.receipt_url ?? null,
      receipt_name: input.receipt_name ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'created',
    module: 'payment',
    entityId: data.id,
    entityLabel: `Expense: ${input.description} — ZMW ${input.amount}`,
    newValues: { amount: input.amount, category_id: input.category_id },
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { data }
}

export async function updateExpense(id: string, input: Partial<{
  expense_date: string
  amount: number
  category_id: string
  description: string
  employee_id: string | null
  receipt_url: string | null
  receipt_name: string | null
  notes: string | null
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('expenses')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { data }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase.from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/expenses')
  return { success: true }
}
