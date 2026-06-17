'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'

export type ReminderType = 'whatsapp' | 'call' | 'email' | 'in_person'

// ── Log a payment reminder ────────────────────────────────────
export async function logPaymentReminder(input: {
  invoice_id: string
  customer_id: string
  reminder_type: ReminderType
  message_sent?: string
  response_received?: string
  next_follow_up_date?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('payment_reminders')
    .insert({
      invoice_id: input.invoice_id,
      customer_id: input.customer_id,
      reminder_type: input.reminder_type,
      message_sent: input.message_sent ?? null,
      response_received: input.response_received ?? null,
      next_follow_up_date: input.next_follow_up_date ?? null,
      sent_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'updated',
    module: 'invoice',
    entityId: input.invoice_id,
    entityLabel: `Payment reminder sent via ${input.reminder_type}`,
  })

  revalidatePath('/invoices/overdue')
  revalidatePath(`/invoices/${input.invoice_id}`)
  return { data }
}

// ── Mark invoice as disputed / write off ─────────────────────
export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .select('invoice_number')
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'status_changed',
    module: 'invoice',
    entityId: invoiceId,
    entityLabel: data.invoice_number,
    newValues: { status },
  })

  revalidatePath('/invoices')
  revalidatePath('/invoices/overdue')
  return { data }
}