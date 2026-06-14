import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractForm from '@/components/modules/contracts/ContractForm'

export const metadata = { title: 'New Contract — Aura Plus ERP' }

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams

  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name, contact_person')
    .is('deleted_at', null)
    .order('company_name')

  return (
    <ContractForm
      mode="new"
      customers={customers ?? []}
      preselectedCustomerId={params.customer_id}
    />
  )
}
