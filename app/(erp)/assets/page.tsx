import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

export const metadata = { title: 'Asset Register — Aura Plus ERP' }

const STATUS_COLORS: Record<string, string> = {
  active:             'badge-success',
  under_warranty:     'badge-info',
  warranty_expired:   'badge-danger',
  under_maintenance:  'badge-warning',
  decommissioned:     'badge-default',
}

const STATUS_LABELS: Record<string, string> = {
  active:             'Active',
  under_warranty:     'Under Warranty',
  warranty_expired:   'Warranty Expired',
  under_maintenance:  'Under Maintenance',
  decommissioned:     'Decommissioned',
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? ''
  const searchQuery  = params.search ?? ''
  const page         = parseInt(params.page ?? '1')
  const pageSize     = 25

  const now = new Date()
  const thirtyDays = new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0]

  let query = supabase
    .from('customer_assets')
    .select(`
      id, asset_name, brand, model, serial_number,
      installation_date, warranty_months, warranty_expiry_date, status,
      location_description, created_at,
      customer:customer_id(id, company_name, contact_person),
      product:product_id(product_name, sku)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('warranty_expiry_date', { ascending: true, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (searchQuery)  query = query.or(`asset_name.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%`)

  const { data: assets, count } = await query

  // Summary counts
  const [expiringSoon, expired, active] = await Promise.all([
    supabase.from('customer_assets').select('id', { count: 'exact' })
      .eq('status', 'under_warranty')
      .lte('warranty_expiry_date', thirtyDays)
      .is('deleted_at', null),
    supabase.from('customer_assets').select('id', { count: 'exact' })
      .eq('status', 'warranty_expired').is('deleted_at', null),
    supabase.from('customer_assets').select('id', { count: 'exact' })
      .in('status', ['active', 'under_warranty']).is('deleted_at', null),
  ])

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  const STATUS_TABS = [
    { value: '', label: 'All Assets' },
    { value: 'under_warranty', label: 'Under Warranty' },
    { value: 'warranty_expired', label: 'Warranty Expired' },
    { value: 'active', label: 'Active' },
    { value: 'under_maintenance', label: 'Maintenance' },
    { value: 'decommissioned', label: 'Decommissioned' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Asset Register</h1>
          <p className="page-subtitle">{count ?? 0} installed assets tracked</p>
        </div>
        <Link href="/assets/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Register Asset
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-green-200 dark:border-green-900">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{active.count ?? 0}</div>
          <div className="text-xs text-slate-400">Assets in service</div>
        </div>
        <div className={`stat-card ${(expiringSoon.count ?? 0) > 0 ? 'border-amber-200 dark:border-amber-900' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Expiring Soon</span>
          </div>
          <div className={`text-2xl font-bold ${(expiringSoon.count ?? 0) > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
            {expiringSoon.count ?? 0}
          </div>
          <div className="text-xs text-slate-400">Warranty ends in 30 days</div>
        </div>
        <div className={`stat-card ${(expired.count ?? 0) > 0 ? 'border-red-200 dark:border-red-900' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Expired</span>
          </div>
          <div className={`text-2xl font-bold ${(expired.count ?? 0) > 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {expired.count ?? 0}
          </div>
          <div className="text-xs text-slate-400">Warranty expired → sell contract</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B] overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <Link key={tab.value}
            href={`/assets${tab.value ? `?status=${tab.value}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
            }`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Assets table */}
      <div className="card overflow-hidden">
        {(assets ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No assets registered</h3>
            <p className="text-sm text-slate-400 mb-4">
              Start tracking installed equipment for each customer.
            </p>
            <Link href="/assets/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Register First Asset
            </Link>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Customer</th>
                  <th className="hidden sm:table-cell">Serial No.</th>
                  <th className="hidden md:table-cell">Installed</th>
                  <th>Warranty Expiry</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(assets ?? []).map(asset => {
                  const customer = (asset.customer as unknown) as { id: string; company_name: string; contact_person: string | null } | null
                  const product  = (asset.product as unknown) as { product_name: string; sku: string } | null
                  const expiry   = asset.warranty_expiry_date ? new Date(asset.warranty_expiry_date) : null
                  const isExpiringSoon = expiry && expiry > now && expiry < new Date(thirtyDays)
                  const isExpired = expiry && expiry < now

                  return (
                    <tr key={asset.id}
                      className={isExpired ? 'bg-red-50/30 dark:bg-red-950/10' : isExpiringSoon ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                      <td>
                        <Link href={`/assets/${asset.id}`}
                          className="font-medium text-sm text-[#0066FF] hover:underline block">
                          {asset.asset_name}
                        </Link>
                        {(asset.brand || asset.model) && (
                          <div className="text-xs text-slate-400">
                            {[asset.brand, asset.model].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {product && (
                          <div className="text-xs text-slate-400 font-mono">{product.sku}</div>
                        )}
                      </td>
                      <td>
                        <Link href={`/customers/${customer?.id}`}
                          className="text-sm font-medium text-[#0A1628] dark:text-white hover:text-[#0066FF]">
                          {customer?.company_name ?? '—'}
                        </Link>
                        {customer?.contact_person && (
                          <div className="text-xs text-slate-400">{customer.contact_person}</div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell text-xs text-slate-400 font-mono">
                        {asset.serial_number ?? '—'}
                      </td>
                      <td className="hidden md:table-cell text-xs text-slate-400">
                        {formatDate(asset.installation_date)}
                      </td>
                      <td>
                        {expiry ? (
                          <span className={`text-xs font-medium ${
                            isExpired ? 'text-red-500' :
                            isExpiringSoon ? 'text-amber-500' :
                            'text-slate-500 dark:text-slate-400'
                          }`}>
                            {isExpiringSoon && '⚠ '}
                            {isExpired && '🔴 '}
                            {formatDate(asset.warranty_expiry_date!)}
                          </span>
                        ) : <span className="text-xs text-slate-400">No warranty</span>}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[asset.status] ?? 'badge-default'} text-xs`}>
                          {STATUS_LABELS[asset.status] ?? asset.status}
                        </span>
                      </td>
                      <td>
                        <Link href={`/assets/${asset.id}`}
                          className="text-xs text-[#0066FF] hover:underline font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <p className="text-sm text-slate-400">
                  {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count}
                </p>
                <div className="flex gap-2">
                  {page > 1 && <Link href={`/assets?page=${page-1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>}
                  {page < totalPages && <Link href={`/assets?page=${page+1}${statusFilter ? `&status=${statusFilter}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
