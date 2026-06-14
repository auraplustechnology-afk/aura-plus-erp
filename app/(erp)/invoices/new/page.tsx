import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvoiceBuilder from '@/components/modules/invoices/InvoiceBuilder'

export const metadata = { title: 'New Invoice — Aura Plus ERP' }

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; type?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams

  const [customersRes, settingsRes] = await Promise.all([
    supabase.from('customers').select('id, company_name, contact_person, email, phone, physical_address')
      .is('deleted_at', null).order('company_name'),
    supabase.from('system_settings').select('key, value')
      .in('key', ['default_terms', 'default_notes', 'invoice_due_days']),
  ])

  const settingsMap: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  return (
    <InvoiceBuilder
      mode="new"
      customers={customersRes.data ?? []}
      defaultTerms={settingsMap.default_terms ?? ''}
      defaultNotes={settingsMap.default_notes ?? ''}
      preselectedCustomerId={params.customer_id}
      invoiceType={(params.type as 'standard' | 'proforma') ?? 'standard'}
    />
  )
}
