import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import InvoiceBuilder from '@/components/modules/invoices/InvoiceBuilder'
import type { Invoice } from '@/types'

export const metadata = { title: 'Edit Invoice — Aura Plus ERP' }

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [invoiceRes, customersRes, settingsRes] = await Promise.all([
    supabase.from('invoices').select('*, lines:invoice_lines(*), customer:customer_id(*)')
      .eq('id', id).is('deleted_at', null).single(),
    supabase.from('customers').select('id, company_name, contact_person, email, phone, physical_address')
      .is('deleted_at', null).order('company_name'),
    supabase.from('system_settings').select('key, value').in('key', ['default_terms', 'default_notes']),
  ])

  if (!invoiceRes.data) notFound()
  if (invoiceRes.data.status === 'paid') redirect(`/invoices/${id}`)

  const settingsMap: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  return (
    <InvoiceBuilder
      mode="edit"
      invoice={invoiceRes.data as Invoice}
      customers={customersRes.data ?? []}
      defaultTerms={settingsMap.default_terms ?? ''}
      defaultNotes={settingsMap.default_notes ?? ''}
    />
  )
}
