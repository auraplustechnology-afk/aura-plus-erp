import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import POSTerminal from '@/components/modules/pos/POSTerminal'
import OpenShiftPrompt from '@/components/modules/pos/OpenShiftPrompt'
import type { User } from '@/types'

export const metadata = { title: 'Point of Sale — Aura Plus ERP' }

export default async function POSPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!currentUser) redirect('/login')

  // The till is only for roles that actually ring up sales — view-only
  // roles land on the sale history list instead.
  if (!['super_admin', 'sales', 'manager'].includes(currentUser.role)) {
    redirect('/pos/history')
  }

  const [productsRes, categoriesRes, customersRes, walkInRes, shiftRes] = await Promise.all([
    supabase.from('products')
      .select('id, sku, product_name, category_id, selling_price, quantity_in_stock, unit_of_measure, barcode, image_url')
      .eq('is_active', true)
      .order('product_name'),
    supabase.from('product_categories').select('id, name').order('name'),
    supabase.from('customers').select('id, company_name, contact_person, phone').is('deleted_at', null).order('company_name'),
    supabase.from('customers').select('id').eq('source', 'walk_in').limit(1).maybeSingle(),
    supabase.from('pos_shifts').select('*').eq('opened_by', authUser.id).eq('status', 'open').maybeSingle(),
  ])

  if (!shiftRes.data) {
    return <OpenShiftPrompt userName={currentUser.full_name} />
  }

  return (
    <POSTerminal
      user={currentUser as User}
      products={productsRes.data ?? []}
      categories={categoriesRes.data ?? []}
      customers={customersRes.data ?? []}
      walkInCustomerId={walkInRes.data?.id ?? ''}
      shift={shiftRes.data}
    />
  )
}
