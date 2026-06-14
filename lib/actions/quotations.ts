'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface QuotationLineInput {
  id?: string
  line_type: 'product' | 'service' | 'labour' | 'installation'
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  line_total: number
  sort_order: number
}

export interface QuotationInput {
  customer_id: string
  lead_id?: string | null
  assigned_salesperson?: string | null
  discount_percent?: number
  discount_amount?: number
  tot_note?: string
  terms_and_conditions?: string
  notes?: string
  valid_until?: string | null
  lines: QuotationLineInput[]
}

// ── Create Quotation ─────────────────────────────────────────
export async function createQuotation(input: QuotationInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Generate quote number via DB function
  const { data: numData } = await supabase.rpc('generate_quote_number')
  const quoteNumber = numData as string

  // Calculate totals
  const subtotal = input.lines.reduce((s, l) => s + l.line_total, 0)
  const discountAmount = input.discount_percent
    ? subtotal * (input.discount_percent / 100)
    : (input.discount_amount ?? 0)
  const total = subtotal - discountAmount

  // Create quotation
  const { data: quote, error: quoteError } = await supabase
    .from('quotations')
    .insert({
      quote_number: quoteNumber,
      customer_id: input.customer_id,
      lead_id: input.lead_id ?? null,
      assigned_salesperson: input.assigned_salesperson ?? user.id,
      created_by: user.id,
      status: 'draft',
      subtotal,
      discount_percent: input.discount_percent ?? 0,
      discount_amount: discountAmount,
      total,
      tot_note: input.tot_note ?? 'Subject to TOT',
      terms_and_conditions: input.terms_and_conditions ?? '',
      notes: input.notes ?? '',
      valid_until: input.valid_until ?? null,
    })
    .select()
    .single()

  if (quoteError) return { error: quoteError.message }

  // Insert lines
  if (input.lines.length > 0) {
    const { error: linesError } = await supabase
      .from('quotation_lines')
      .insert(
        input.lines.map((line, i) => ({
          quotation_id: quote.id,
          line_type: line.line_type,
          product_id: line.product_id ?? null,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_percent: line.discount_percent,
          line_total: line.line_total,
          sort_order: line.sort_order ?? i,
        }))
      )
    if (linesError) return { error: linesError.message }
  }

  // If lead_id provided, update lead stage to quote_sent
  if (input.lead_id) {
    await supabase
      .from('leads')
      .update({ stage: 'quote_sent' })
      .eq('id', input.lead_id)
  }

  // Auto-create customer CRM record update (customer_type → active hint)
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'created',
    entity_type: 'quotation',
    entity_id: quote.id,
    entity_label: quote.quote_number,
    new_values: { customer_id: input.customer_id, total },
  })

  revalidatePath('/quotations')
  revalidatePath(`/customers/${input.customer_id}`)
  return { data: quote }
}

// ── Update Quotation ─────────────────────────────────────────
export async function updateQuotation(id: string, input: QuotationInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const subtotal = input.lines.reduce((s, l) => s + l.line_total, 0)
  const discountAmount = input.discount_percent
    ? subtotal * (input.discount_percent / 100)
    : (input.discount_amount ?? 0)
  const total = subtotal - discountAmount

  const { data: quote, error } = await supabase
    .from('quotations')
    .update({
      customer_id: input.customer_id,
      lead_id: input.lead_id ?? null,
      assigned_salesperson: input.assigned_salesperson ?? null,
      subtotal,
      discount_percent: input.discount_percent ?? 0,
      discount_amount: discountAmount,
      total,
      tot_note: input.tot_note ?? 'Subject to TOT',
      terms_and_conditions: input.terms_and_conditions ?? '',
      notes: input.notes ?? '',
      valid_until: input.valid_until ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  // Replace all lines
  await supabase.from('quotation_lines').delete().eq('quotation_id', id)
  if (input.lines.length > 0) {
    await supabase.from('quotation_lines').insert(
      input.lines.map((line, i) => ({
        quotation_id: id,
        line_type: line.line_type,
        product_id: line.product_id ?? null,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
        line_total: line.line_total,
        sort_order: i,
      }))
    )
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'updated',
    entity_type: 'quotation',
    entity_id: id,
    entity_label: quote.quote_number,
    new_values: { total },
  })

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${id}`)
  return { data: quote }
}

// ── Update Quote Status ──────────────────────────────────────
export async function updateQuoteStatus(
  id: string,
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const timestamps: Record<string, string | null> = {}
  if (status === 'sent') timestamps.sent_at = new Date().toISOString()
  if (status === 'accepted') timestamps.accepted_at = new Date().toISOString()
  if (status === 'rejected') timestamps.rejected_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('quotations')
    .update({ status, ...timestamps })
    .eq('id', id)
    .select('*, lead_id')
    .single()

  if (error) return { error: error.message }

  // If accepted, update lead stage to Won
  if (status === 'accepted' && data.lead_id) {
    await supabase.from('leads').update({ stage: 'won' }).eq('id', data.lead_id)
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'quotation',
    entity_id: id,
    entity_label: data.quote_number,
    new_values: { status },
  })

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${id}`)
  return { data }
}

// ── Delete Quotation (soft) ──────────────────────────────────
export async function deleteQuotation(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: q } = await supabase.from('quotations').select('quote_number').eq('id', id).single()
  await supabase.from('quotations').update({ deleted_at: new Date().toISOString() }).eq('id', id)

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'deleted',
    entity_type: 'quotation',
    entity_id: id,
    entity_label: q?.quote_number,
  })

  revalidatePath('/quotations')
  return { success: true }
}

// ── Convert Quote → Invoice ──────────────────────────────────
export async function convertQuoteToInvoice(quoteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch full quote with lines
  const { data: quote, error: qErr } = await supabase
    .from('quotations')
    .select('*, quotation_lines(*)')
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) return { error: 'Quote not found' }
  if (quote.status !== 'accepted') return { error: 'Only accepted quotes can be converted to invoices' }

  // Get default settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['default_terms', 'default_notes', 'invoice_due_days'])

  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  const dueDays = parseInt(settingsMap.invoice_due_days ?? '30')
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + dueDays)

  // Generate invoice number
  const { data: invNum } = await supabase.rpc('generate_invoice_number')

  // Create invoice
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invNum as string,
      invoice_type: 'standard',
      quotation_id: quoteId,
      customer_id: quote.customer_id,
      created_by: user.id,
      status: 'draft',
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      total: quote.total,
      amount_paid: 0,
      outstanding_balance: quote.total,
      tot_note: quote.tot_note,
      terms_and_conditions: quote.terms_and_conditions || settingsMap.default_terms,
      notes: quote.notes || settingsMap.default_notes,
      payment_terms: 'Due on Receipt',
      due_date: dueDate.toISOString().split('T')[0],
    })
    .select()
    .single()

  if (invErr) return { error: invErr.message }

  // Copy lines from quote to invoice
  const lines = (quote.quotation_lines ?? []).map((line: {
    line_type: string; product_id: string | null; description: string;
    quantity: number; unit_price: number; line_total: number; sort_order: number
  }) => ({
    invoice_id: invoice.id,
    line_type: line.line_type,
    product_id: line.product_id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    line_total: line.line_total,
    sort_order: line.sort_order,
  }))

  if (lines.length > 0) {
    await supabase.from('invoice_lines').insert(lines)
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'created',
    entity_type: 'invoice',
    entity_id: invoice.id,
    entity_label: invoice.invoice_number,
    new_values: { converted_from: quote.quote_number },
  })

  revalidatePath('/invoices')
  revalidatePath(`/quotations/${quoteId}`)
  return { invoice }
}
