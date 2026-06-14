import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ContractForm from '@/components/modules/contracts/ContractForm'
import type { MaintenanceContract } from '@/types'

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [contractRes, customersRes] = await Promise.all([
    supabase.from('maintenance_contracts').select('*').eq('id', id).is('deleted_at', null).single(),
    supabase.from('customers').select('id, company_name, contact_person').is('deleted_at', null).order('company_name'),
  ])

  if (!contractRes.data) notFound()

  return (
    <ContractForm
      mode="edit"
      contract={contractRes.data as MaintenanceContract}
      customers={customersRes.data ?? []}
    />
  )
}
