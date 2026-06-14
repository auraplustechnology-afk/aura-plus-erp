'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContractStatus, BillingCycle } from '@/types'

// ── Create Contract ──────────────────────────────────────────
export async function createContract(input: {
  customer_id: string
  contract_name: string
  start_date: string
  end_date: string
  renewal_date?: string | null
  value: number
  billing_cycle: BillingCycle
  products_covered?: Array<{ name: string; description?: string }>
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: contractNum } = await supabase.rpc('generate_contract_number')

  const { data: contract, error } = await supabase
    .from('maintenance_contracts')
    .insert({
      contract_number: contractNum as string,
      customer_id: input.customer_id,
      contract_name: input.contract_name,
      start_date: input.start_date,
      end_date: input.end_date,
      renewal_date: input.renewal_date ?? null,
      value: input.value,
      billing_cycle: input.billing_cycle,
      status: 'active',
      products_covered: input.products_covered ?? [],
      notes: input.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'created', entity_type: 'contract',
    entity_id: contract.id, entity_label: contract.contract_number,
    new_values: { customer_id: input.customer_id, value: input.value },
  })

  revalidatePath('/contracts')
  revalidatePath(`/customers/${input.customer_id}`)
  return { data: contract }
}

// ── Update Contract ──────────────────────────────────────────
export async function updateContract(id: string, input: Partial<{
  contract_name: string
  start_date: string
  end_date: string
  renewal_date: string | null
  value: number
  billing_cycle: BillingCycle
  status: ContractStatus
  products_covered: Array<{ name: string; description?: string }>
  notes: string | null
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: before } = await supabase
    .from('maintenance_contracts').select('contract_number').eq('id', id).single()

  const { data, error } = await supabase
    .from('maintenance_contracts')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'updated', entity_type: 'contract',
    entity_id: id, entity_label: before?.contract_number,
    new_values: input,
  })

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${id}`)
  return { data }
}

// ── Generate Invoice from Contract ───────────────────────────
export async function generateContractInvoice(contractId: string, input: {
  period_start: string
  period_end: string
  due_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: contract } = await supabase
    .from('maintenance_contracts')
    .select('*, customer:customer_id(company_name)')
    .eq('id', contractId)
    .single()

  if (!contract) return { error: 'Contract not found' }
  if (contract.status !== 'active') return { error: 'Can only generate invoices for active contracts' }

  // Get settings for defaults
  const { data: settings } = await supabase
    .from('system_settings').select('key, value')
    .in('key', ['default_terms', 'default_notes'])

  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  // Generate invoice number
  const { data: invNum } = await supabase.rpc('generate_invoice_number')

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invNum as string,
      invoice_type: 'standard',
      customer_id: contract.customer_id,
      created_by: user.id,
      status: 'draft',
      subtotal: contract.value,
      discount_amount: 0,
      total: contract.value,
      amount_paid: 0,
      outstanding_balance: contract.value,
      tot_note: 'Subject to TOT',
      terms_and_conditions: settingsMap.default_terms ?? '',
      notes: `Maintenance contract: ${contract.contract_name}\nPeriod: ${input.period_start} to ${input.period_end}`,
      payment_terms: 'Due on Receipt',
      due_date: input.due_date ?? null,
    })
    .select()
    .single()

  if (invError) return { error: invError.message }

  // Add invoice line
  await supabase.from('invoice_lines').insert({
    invoice_id: invoice.id,
    line_type: 'service',
    description: `${contract.contract_name} — Maintenance (${input.period_start} to ${input.period_end})`,
    quantity: 1,
    unit_price: contract.value,
    line_total: contract.value,
    sort_order: 0,
  })

  // Link to contract
  await supabase.from('contract_invoices').insert({
    contract_id: contractId,
    invoice_id: invoice.id,
    period_start: input.period_start,
    period_end: input.period_end,
  })

  await supabase.from('activity_logs').insert({
    user_id: user.id, action: 'created', entity_type: 'invoice',
    entity_id: invoice.id, entity_label: invoice.invoice_number,
    new_values: { from_contract: contract.contract_number },
  })

  revalidatePath(`/contracts/${contractId}`)
  revalidatePath('/invoices')
  return { invoice }
}

// ── Delete Contract (soft) ────────────────────────────────────
export async function deleteContract(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase.from('maintenance_contracts')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id)

  revalidatePath('/contracts')
  return { success: true }
}
