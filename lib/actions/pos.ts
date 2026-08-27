'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'
import type { PaymentMethod } from '@/types'

const CASHIER_ROLES = ['super_admin', 'sales', 'manager']
const SUPERVISOR_ROLES = ['super_admin', 'manager']

export interface POSCartLine {
  line_type?: 'product' | 'service' | 'labour' | 'installation'
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
}

export interface POSPaymentInput {
  method: PaymentMethod
  amount: number
  reference_number?: string
  notes?: string
}

export interface CompletePOSSaleInput {
  customer_id: string
  shift_id: string
  lines: POSCartLine[]
  discount_amount?: number
  payments: POSPaymentInput[]
  tot_note?: string
}

// ── Exact-match barcode/SKU lookup for the scanner input ───────
export async function lookupProductByCode(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const trimmed = code.trim()
  if (!trimmed) return { error: 'Empty code' }

  const { data, error } = await supabase
    .from('products')
    .select('id, sku, product_name, barcode, selling_price, quantity_in_stock, unit_of_measure, image_url, is_active')
    .or(`barcode.eq.${trimmed},sku.eq.${trimmed}`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: `No product found for "${trimmed}"` }
  return { data }
}

// ── Complete a sale — the atomic complete_pos_sale() RPC does the
//    stock-locking/invoice/payment work; this wraps it with the
//    standard permission-check + audit-log + revalidate pattern ──
export async function completePOSSale(input: CompletePOSSaleInput) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!caller || !CASHIER_ROLES.includes(caller.role)) {
    return { error: 'Not authorized to complete POS sales' }
  }

  const discount = input.discount_amount ?? 0
  if (discount > 0 && !SUPERVISOR_ROLES.includes(caller.role)) {
    return { error: 'Only managers or super admins can apply a discount' }
  }
  if (!input.lines.length) return { error: 'Cart is empty' }
  if (!input.payments.length) return { error: 'At least one payment is required' }

  const { data: invoiceId, error } = await supabase.rpc('complete_pos_sale', {
    p_customer_id: input.customer_id,
    p_shift_id: input.shift_id,
    p_lines: input.lines.map(l => ({
      line_type: l.line_type ?? 'product',
      product_id: l.product_id ?? null,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
    })),
    p_discount_amount: discount,
    p_payments: input.payments.map(p => ({
      method: p.method,
      amount: p.amount,
      reference_number: p.reference_number ?? null,
      notes: p.notes ?? null,
    })),
    p_tot_note: input.tot_note ?? 'Subject to TOT',
  })

  if (error) return { error: error.message }

  const { data: invoice } = await supabase
    .from('invoices').select('invoice_number, total').eq('id', invoiceId).single()

  await logActivity({
    action: 'created',
    module: 'pos_sale',
    entityId: invoiceId,
    entityLabel: invoice?.invoice_number,
    newValues: { total: invoice?.total, lines: input.lines.length, discount },
  })

  if (discount > 0) {
    await logActivity({
      action: 'discount_applied',
      module: 'pos_sale',
      entityId: invoiceId,
      entityLabel: invoice?.invoice_number,
      newValues: { discount_amount: discount },
    })
  }

  revalidatePath('/pos')
  revalidatePath('/pos/history')
  revalidatePath('/invoices')
  revalidatePath('/inventory')

  return { data: { invoiceId } }
}

// ── Void a completed POS sale (super_admin / manager only) ─────
export async function voidPOSSale(invoiceId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!caller || !SUPERVISOR_ROLES.includes(caller.role)) {
    return { error: 'Only managers or super admins can void a sale' }
  }
  if (!reason.trim()) return { error: 'A void reason is required' }

  const { error } = await supabase.rpc('void_pos_sale', { p_invoice_id: invoiceId, p_reason: reason.trim() })
  if (error) return { error: error.message }

  const { data: invoice } = await supabase.from('invoices').select('invoice_number').eq('id', invoiceId).single()

  await logActivity({
    action: 'voided',
    module: 'pos_sale',
    entityId: invoiceId,
    entityLabel: invoice?.invoice_number,
    newValues: { reason },
  })

  revalidatePath('/pos/history')
  revalidatePath('/invoices')
  revalidatePath('/inventory')
  revalidatePath(`/invoices/${invoiceId}`)

  return { success: true }
}

// ── Fetch a POS sale with per-line remaining-refundable quantity
//    (used to populate the refund modal) ────────────────────────
export async function getSaleForRefund(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!caller || !SUPERVISOR_ROLES.includes(caller.role)) {
    return { error: 'Only managers or super admins can process refunds' }
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, amount_paid, total, lines:invoice_lines(id, description, quantity, unit_price, product_id)')
    .eq('id', invoiceId).eq('invoice_type', 'pos').single()

  if (error || !invoice) return { error: 'Sale not found' }

  const lineIds = (invoice.lines ?? []).map((l: { id: string }) => l.id)
  const { data: refundLines } = lineIds.length
    ? await supabase.from('pos_refund_lines').select('invoice_line_id, quantity').in('invoice_line_id', lineIds)
    : { data: [] }

  const refundedByLine: Record<string, number> = {}
  ;(refundLines ?? []).forEach(rl => {
    refundedByLine[rl.invoice_line_id] = (refundedByLine[rl.invoice_line_id] ?? 0) + Number(rl.quantity)
  })

  const lines = (invoice.lines ?? []).map((l: { id: string; description: string; quantity: number; unit_price: number; product_id: string | null }) => ({
    ...l,
    already_refunded: refundedByLine[l.id] ?? 0,
    remaining: Number(l.quantity) - (refundedByLine[l.id] ?? 0),
  }))

  return { data: { ...invoice, lines } }
}

export interface RefundLineInput {
  invoice_line_id: string
  quantity: number
  restock?: boolean
}

// ── Process a refund against an existing POS sale (super_admin /
//    manager only) — process_pos_refund() RPC validates + writes ─
export async function processPOSRefund(input: {
  invoice_id: string
  shift_id?: string | null
  lines: RefundLineInput[]
  refund_method: PaymentMethod
  reason: string
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!caller || !SUPERVISOR_ROLES.includes(caller.role)) {
    return { error: 'Only managers or super admins can process refunds' }
  }
  if (!input.lines.length) return { error: 'Select at least one line to refund' }
  if (!input.reason.trim()) return { error: 'A refund reason is required' }

  const { data: refundId, error } = await supabase.rpc('process_pos_refund', {
    p_invoice_id: input.invoice_id,
    p_shift_id: input.shift_id ?? null,
    p_lines: input.lines.map(l => ({
      invoice_line_id: l.invoice_line_id,
      quantity: l.quantity,
      restock: l.restock ?? true,
    })),
    p_refund_method: input.refund_method,
    p_reason: input.reason.trim(),
  })

  if (error) return { error: error.message }

  const [{ data: refund }, { data: invoice }] = await Promise.all([
    supabase.from('pos_refunds').select('refund_number, amount').eq('id', refundId).single(),
    supabase.from('invoices').select('invoice_number').eq('id', input.invoice_id).single(),
  ])

  await logActivity({
    action: 'refunded',
    module: 'refund',
    entityId: refundId,
    entityLabel: refund?.refund_number,
    newValues: { invoice_number: invoice?.invoice_number, amount: refund?.amount, reason: input.reason },
  })

  revalidatePath('/pos/history')
  revalidatePath('/invoices')
  revalidatePath('/inventory')
  revalidatePath(`/invoices/${input.invoice_id}`)

  return { data: { refundId } }
}
