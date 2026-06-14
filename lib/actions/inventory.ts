'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Create Product ───────────────────────────────────────────
export async function createProduct(input: {
  sku: string
  product_name: string
  category_id?: string | null
  supplier_id?: string | null
  cost_price: number
  selling_price: number
  quantity_in_stock: number
  reorder_level: number
  unit_of_measure?: string
  description?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check SKU unique
  const { data: existing } = await supabase.from('products').select('id').eq('sku', input.sku).single()
  if (existing) return { error: `SKU "${input.sku}" already exists` }

  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, created_by: user.id, unit_of_measure: input.unit_of_measure ?? 'unit' })
    .select()
    .single()

  if (error) return { error: error.message }

  // Record initial stock if > 0
  if (input.quantity_in_stock > 0) {
    await supabase.from('stock_adjustments').insert({
      product_id: data.id,
      adjustment_type: 'in',
      quantity_before: 0,
      quantity_change: input.quantity_in_stock,
      quantity_after: input.quantity_in_stock,
      reference_type: 'manual',
      reason: 'Initial stock entry',
      adjusted_by: user.id,
    })
  }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'created', entity_type: 'product',
    entity_id: data.id, entity_label: data.product_name,
    new_values: input,
  })

  revalidatePath('/inventory')
  return { data }
}

// ── Update Product ───────────────────────────────────────────
export async function updateProduct(id: string, input: Partial<{
  sku: string
  product_name: string
  category_id: string | null
  supplier_id: string | null
  cost_price: number
  selling_price: number
  reorder_level: number
  unit_of_measure: string
  description: string | null
  is_active: boolean
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: before } = await supabase.from('products').select('*').eq('id', id).single()
  const { data, error } = await supabase.from('products').update(input).eq('id', id).select().single()
  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'updated', entity_type: 'product',
    entity_id: id, entity_label: data.product_name,
    old_values: before, new_values: input,
  })

  revalidatePath('/inventory')
  revalidatePath(`/inventory/products/${id}`)
  return { data }
}

// ── Record Stock Adjustment ──────────────────────────────────
export async function recordStockAdjustment(input: {
  product_id: string
  adjustment_type: 'in' | 'out' | 'correction' | 'write_off'
  quantity_change: number
  reason: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: product } = await supabase
    .from('products').select('quantity_in_stock, product_name').eq('id', input.product_id).single()
  if (!product) return { error: 'Product not found' }

  const qtyBefore = product.quantity_in_stock
  let qtyAfter: number

  if (input.adjustment_type === 'correction') {
    qtyAfter = input.quantity_change // correction sets absolute value
  } else if (input.adjustment_type === 'in') {
    qtyAfter = qtyBefore + Math.abs(input.quantity_change)
  } else {
    qtyAfter = Math.max(0, qtyBefore - Math.abs(input.quantity_change))
  }

  const actualChange = qtyAfter - qtyBefore

  await supabase.from('products').update({ quantity_in_stock: qtyAfter }).eq('id', input.product_id)

  const { data, error } = await supabase.from('stock_adjustments').insert({
    product_id: input.product_id,
    adjustment_type: input.adjustment_type,
    quantity_before: qtyBefore,
    quantity_change: actualChange,
    quantity_after: qtyAfter,
    reference_type: 'manual',
    reason: input.reason,
    adjusted_by: user.id,
  }).select().single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'stock_adjusted', entity_type: 'stock_adjustment',
    entity_id: input.product_id, entity_label: product.product_name,
    new_values: { type: input.adjustment_type, before: qtyBefore, after: qtyAfter, change: actualChange },
  })

  revalidatePath('/inventory')
  revalidatePath(`/inventory/products/${input.product_id}`)
  return { data }
}

// ── Create Category ──────────────────────────────────────────
export async function createCategory(name: string, description?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('product_categories')
    .insert({ name, description }).select().single()
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { data }
}

// ── Create Supplier ──────────────────────────────────────────
export async function createSupplier(input: {
  company_name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('suppliers').insert(input).select().single()
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { data }
}
