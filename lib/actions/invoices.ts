'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface InvoiceLineInput {
  line_type: 'product' | 'service' | 'labour' | 'installation'
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export interface InvoiceInput {
  customer_id: string
  invoice_type?: 'standard' | 'proforma'
  quotation_id?: string | null
  discount_amount?: number
  tot_note?: string
  terms_and_conditions?: string
  notes?: string
  payment_terms?: string
  due_date?: string | null
  lines: InvoiceLineInput[]
}

// ── Create Invoice (manual, no quote) ───────────────────────
export async function createInvoice(input: InvoiceInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: invNum } = await supabase.rpc('generate_invoice_number')

  const subtotal = input.lines.reduce((s, l) => s + l.line_total, 0)
  const discountAmount = input.discount_amount ?? 0
  const total = subtotal - discountAmount

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invNum as string,
      invoice_type: input.invoice_type ?? 'standard',
      quotation_id: input.quotation_id ?? null,
      customer_id: input.customer_id,
      created_by: user.id,
      status: 'draft',
      subtotal,
      discount_amount: discountAmount,
      total,
      amount_paid: 0,
      outstanding_balance: total,
      tot_note: input.tot_note ?? 'Subject to TOT',
      terms_and_conditions: input.terms_and_conditions ?? '',
      notes: input.notes ?? '',
      payment_terms: input.payment_terms ?? 'Due on Receipt',
      due_date: input.due_date ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  if (input.lines.length > 0) {
    await supabase.from('invoice_lines').insert(
      input.lines.map((l, i) => ({
        invoice_id: invoice.id,
        line_type: l.line_type,
        product_id: l.product_id ?? null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_total: l.line_total,
        sort_order: l.sort_order ?? i,
      }))
    )
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'created',
    entity_type: 'invoice',
    entity_id: invoice.id,
    entity_label: invoice.invoice_number,
    new_values: { customer_id: input.customer_id, total },
  })

  revalidatePath('/invoices')
  revalidatePath(`/customers/${input.customer_id}`)
  return { data: invoice }
}

// ── Update Invoice ───────────────────────────────────────────
export async function updateInvoice(id: string, input: InvoiceInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const subtotal = input.lines.reduce((s, l) => s + l.line_total, 0)
  const discountAmount = input.discount_amount ?? 0
  const total = subtotal - discountAmount

  // Get current amount_paid to recalculate outstanding
  const { data: current } = await supabase.from('invoices').select('amount_paid, invoice_number').eq('id', id).single()
  const amountPaid = current?.amount_paid ?? 0
  const outstanding = total - amountPaid

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      customer_id: input.customer_id,
      invoice_type: input.invoice_type ?? 'standard',
      subtotal,
      discount_amount: discountAmount,
      total,
      outstanding_balance: outstanding,
      tot_note: input.tot_note ?? 'Subject to TOT',
      terms_and_conditions: input.terms_and_conditions ?? '',
      notes: input.notes ?? '',
      payment_terms: input.payment_terms ?? 'Due on Receipt',
      due_date: input.due_date ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  // Replace lines
  await supabase.from('invoice_lines').delete().eq('invoice_id', id)
  if (input.lines.length > 0) {
    await supabase.from('invoice_lines').insert(
      input.lines.map((l, i) => ({
        invoice_id: id,
        line_type: l.line_type,
        product_id: l.product_id ?? null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_total: l.line_total,
        sort_order: i,
      }))
    )
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'updated',
    entity_type: 'invoice',
    entity_id: id,
    entity_label: current?.invoice_number,
    new_values: { total },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { data: invoice }
}

// ── Update Invoice Status ────────────────────────────────────
export async function updateInvoiceStatus(id: string, status: 'draft' | 'sent' | 'overdue') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const timestamps: Record<string, string> = {}
  if (status === 'sent') timestamps.sent_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('invoices')
    .update({ status, ...timestamps })
    .eq('id', id)
    .select('invoice_number, customer_id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'status_changed',
    entity_type: 'invoice',
    entity_id: id,
    entity_label: data.invoice_number,
    new_values: { status },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { data }
}

// ── Record Payment ───────────────────────────────────────────
export async function recordPayment(invoiceId: string, payment: {
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque'
  payment_date: string
  reference_number?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get invoice to validate amount
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('total, amount_paid, outstanding_balance, invoice_number, customer_id, status')
    .eq('id', invoiceId)
    .single()

  if (invErr || !invoice) return { error: 'Invoice not found' }
  if (payment.amount <= 0) return { error: 'Payment amount must be greater than zero' }
  if (payment.amount > invoice.outstanding_balance) {
    return { error: `Payment amount (ZMW${payment.amount.toFixed(2)}) exceeds outstanding balance (ZMW${invoice.outstanding_balance.toFixed(2)})` }
  }

  // Insert payment — the DB trigger handles balance update automatically
  const { data: paymentRecord, error: payErr } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      reference_number: payment.reference_number ?? null,
      notes: payment.notes ?? null,
      recorded_by: user.id,
    })
    .select()
    .single()

  if (payErr) return { error: payErr.message }

  // Check if now fully paid — trigger stock deduction
  const newAmountPaid = (invoice.amount_paid ?? 0) + payment.amount
  const isFullyPaid = newAmountPaid >= invoice.total

  if (isFullyPaid) {
    // Deduct stock for product lines (only if not already deducted)
    const { data: currentInv } = await supabase
      .from('invoices')
      .select('stock_deducted')
      .eq('id', invoiceId)
      .single()

    if (!currentInv?.stock_deducted) {
      await deductStockForInvoice(invoiceId, user.id)
    }

    // Update customer type to active
    await supabase
      .from('customers')
      .update({ customer_type: 'active' })
      .eq('id', invoice.customer_id)
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'payment_recorded',
    entity_type: 'invoice',
    entity_id: invoiceId,
    entity_label: invoice.invoice_number,
    new_values: {
      amount: payment.amount,
      method: payment.payment_method,
      reference: payment.reference_number,
    },
  })

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  return { data: paymentRecord }
}

// ── Delete Payment ───────────────────────────────────────────
export async function deletePayment(paymentId: string, invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) return { error: error.message }

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  return { success: true }
}

// ── Internal: Deduct stock when invoice paid ─────────────────
async function deductStockForInvoice(invoiceId: string, userId: string) {
  const supabase = await createClient()

  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('product_id, quantity')
    .eq('invoice_id', invoiceId)
    .not('product_id', 'is', null)

  if (!lines || lines.length === 0) {
    // Mark deducted even if no products (services/labour only)
    await supabase.from('invoices').update({
      stock_deducted: true,
      stock_deducted_at: new Date().toISOString(),
    }).eq('id', invoiceId)
    return
  }

  for (const line of lines) {
    if (!line.product_id) continue

    const { data: product } = await supabase
      .from('products')
      .select('quantity_in_stock, product_name')
      .eq('id', line.product_id)
      .single()

    if (!product) continue

    const qtyBefore = product.quantity_in_stock
    const qtyAfter = Math.max(0, qtyBefore - line.quantity)

    // Update stock
    await supabase
      .from('products')
      .update({ quantity_in_stock: qtyAfter })
      .eq('id', line.product_id)

    // Record adjustment
    await supabase.from('stock_adjustments').insert({
      product_id: line.product_id,
      adjustment_type: 'sale',
      quantity_before: qtyBefore,
      quantity_change: -line.quantity,
      quantity_after: qtyAfter,
      reference_type: 'invoice',
      reference_id: invoiceId,
      reason: `Auto-deducted on invoice payment`,
      adjusted_by: userId,
    })

    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'stock_adjusted',
      entity_type: 'stock_adjustment',
      entity_id: line.product_id,
      entity_label: product.product_name,
      new_values: { qty_before: qtyBefore, qty_change: -line.quantity, qty_after: qtyAfter },
    })
  }

  // Mark invoice stock as deducted
  await supabase.from('invoices').update({
    stock_deducted: true,
    stock_deducted_at: new Date().toISOString(),
  }).eq('id', invoiceId)
}

// ── Delete Invoice (soft) ────────────────────────────────────
export async function deleteInvoice(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: inv } = await supabase.from('invoices').select('invoice_number, status').eq('id', id).single()
  if (inv?.status === 'paid') return { error: 'Cannot delete a paid invoice' }

  await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id)

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'deleted',
    entity_type: 'invoice',
    entity_id: id,
    entity_label: inv?.invoice_number,
  })

  revalidatePath('/invoices')
  return { success: true }
}
