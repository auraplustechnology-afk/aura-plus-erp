import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuotationBuilder from '@/components/modules/quotations/QuotationBuilder'
import type { Quotation } from '@/types'

export const metadata = { title: 'Edit Quotation — Aura Plus ERP' }

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [quoteRes, customersRes, salesUsersRes, settingsRes] = await Promise.all([
    supabase.from('quotations').select('*, lines:quotation_lines(*), customer:customer_id(id,company_name,contact_person,email,phone,physical_address)')
      .eq('id', id).is('deleted_at', null).single(),
    supabase.from('customers').select('id, company_name, contact_person, email, phone, physical_address')
      .is('deleted_at', null).order('company_name'),
    supabase.from('users').select('id, full_name').in('role', ['sales', 'super_admin', 'manager']).eq('is_active', true).order('full_name'),
    supabase.from('system_settings').select('key, value').in('key', ['default_terms', 'default_notes']),
  ])

  if (!quoteRes.data) notFound()
  if (quoteRes.data.status === 'accepted') redirect(`/quotations/${id}`)

  const settingsMap: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  return (
    <QuotationBuilder
      mode="edit"
      quote={quoteRes.data as Quotation}
      customers={customersRes.data ?? []}
      salesUsers={salesUsersRes.data ?? []}
      defaultTerms={settingsMap.default_terms ?? ''}
      defaultNotes={settingsMap.default_notes ?? ''}
    />
  )
}
