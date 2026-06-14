import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationBuilder from '@/components/modules/quotations/QuotationBuilder'

export const metadata = { title: 'New Quotation — Aura Plus ERP' }

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; lead_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams

  const [customersRes, salesUsersRes, settingsRes] = await Promise.all([
    supabase.from('customers').select('id, company_name, contact_person, email, phone, physical_address')
      .is('deleted_at', null).order('company_name'),
    supabase.from('users').select('id, full_name').in('role', ['sales', 'super_admin', 'manager']).eq('is_active', true).order('full_name'),
    supabase.from('system_settings').select('key, value').in('key', ['default_terms', 'default_notes']),
  ])

  const settingsMap: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  return (
    <QuotationBuilder
      mode="new"
      customers={customersRes.data ?? []}
      salesUsers={salesUsersRes.data ?? []}
      defaultTerms={settingsMap.default_terms ?? ''}
      defaultNotes={settingsMap.default_notes ?? ''}
      preselectedCustomerId={params.customer_id}
    />
  )
}
