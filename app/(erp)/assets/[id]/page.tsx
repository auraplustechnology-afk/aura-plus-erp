import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Calendar, MapPin, Hash, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import AddServiceLogModal from '@/components/modules/assets/AddServiceLogModal'
import AssetEditModal from '@/components/modules/assets/AssetEditModal'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('customer_assets').select('asset_name').eq('id', id).single()
  return { title: `${data?.asset_name ?? 'Asset'} — Aura Plus ERP` }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: asset } = await supabase
    .from('customer_assets')
    .select(`
      *,
      customer:customer_id(id, company_name, contact_person, phone),
      product:product_id(product_name, sku),
      project:project_id(project_number, project_name),
      invoice:invoice_id(invoice_number),
      service_logs:asset_service_logs(
        id, service_date, service_type, description, cost, parts_used, next_service_date,
        technician:technician_id(full_name),
        created_at
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!asset) notFound()

  const { data: technicians } = await supabase
    .from('users').select('id, full_name').eq('role', 'technician').eq('is_active', true)

  const customer = (asset.customer as unknown) as { id: string; company_name: string; contact_person: string | null; phone: string | null } | null
  const product  = (asset.product as unknown) as { product_name: string; sku: string } | null
  const project  = (asset.project as unknown) as { project_number: string; project_name: string } | null
  const invoice  = (asset.invoice as unknown) as { invoice_number: string } | null
  const serviceLogs = [...((asset.service_logs as unknown) as Array<{
    id: string; service_date: string; service_type: string; description: string
    cost: number; parts_used: string | null; next_service_date: string | null
    technician: { full_name: string } | null; created_at: string
  }> ?? [])].sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())

  const now = new Date()
  const expiryDate = asset.warranty_expiry_date ? new Date(asset.warranty_expiry_date) : null
  const isExpired = expiryDate && expiryDate < now
  const isExpiringSoon = expiryDate && expiryDate > now &&
    expiryDate < new Date(Date.now() + 30 * 24 * 3600000)

  const STATUS_COLORS: Record<string, string> = {
    active: 'badge-success', under_warranty: 'badge-info',
    warranty_expired: 'badge-danger', under_maintenance: 'badge-warning',
    decommissioned: 'badge-default',
  }
  const STATUS_LABELS: Record<string, string> = {
    active: 'Active', under_warranty: 'Under Warranty',
    warranty_expired: 'Warranty Expired', under_maintenance: 'Under Maintenance',
    decommissioned: 'Decommissioned',
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/assets" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Asset Register
          </Link>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white">{asset.asset_name}</h1>
            <span className={`badge ${STATUS_COLORS[asset.status] ?? 'badge-default'} text-sm px-3 py-1`}>
              {STATUS_LABELS[asset.status] ?? asset.status}
            </span>
          </div>
          {(asset.brand || asset.model) && (
            <p className="text-slate-400 text-sm">{[asset.brand, asset.model].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AssetEditModal
            assetId={id}
            currentStatus={asset.status}
            currentNotes={asset.notes ?? ''}
            currentLocation={asset.location_description ?? ''}
          />
          <AddServiceLogModal
            assetId={id}
            technicians={(technicians ?? []) as { id: string; full_name: string }[]}
          />
        </div>
      </div>

      {/* Warranty alerts */}
      {isExpired && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Warranty Expired</p>
              <p className="text-xs text-red-600">Expired on {formatDate(asset.warranty_expiry_date!)} — consider offering a maintenance contract</p>
            </div>
          </div>
          <Link href="/contracts/new" className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0 border-red-200 text-red-600 hover:bg-red-50">
            Sell Contract →
          </Link>
        </div>
      )}
      {isExpiringSoon && !isExpired && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Warranty expires {formatDate(asset.warranty_expiry_date!)} — contact customer about renewal
            </p>
          </div>
          <Link href="/contracts/new" className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
            New Contract →
          </Link>
        </div>
      )}
      {!isExpired && !isExpiringSoon && expiryDate && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Under warranty until {formatDate(asset.warranty_expiry_date!)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Service history */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div>
                <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Service History</h2>
                <p className="text-xs text-slate-400 mt-0.5">{serviceLogs.length} service records</p>
              </div>
              <AddServiceLogModal
                assetId={id}
                technicians={(technicians ?? []) as { id: string; full_name: string }[]}
                compact
              />
            </div>

            {serviceLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No service records yet</p>
                <p className="text-xs text-slate-400 mt-1">Log the installation as the first service entry</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
                {serviceLogs.map(log => (
                  <div key={log.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#0066FF]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Wrench className="w-4 h-4 text-[#0066FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge badge-default text-xs capitalize">
                            {log.service_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(log.service_date)}</span>
                          {log.cost > 0 && (
                            <span className="text-xs font-semibold text-[#0066FF]">{formatCurrency(log.cost)}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#0A1628] dark:text-white mt-1">{log.description}</p>
                        {log.parts_used && <p className="text-xs text-slate-400 mt-0.5">Parts: {log.parts_used}</p>}
                        {log.technician && <p className="text-xs text-slate-400 mt-0.5">👨‍🔧 {(log.technician as unknown as { full_name: string }).full_name}</p>}
                        {log.next_service_date && (
                          <p className="text-xs text-amber-500 mt-0.5">⏰ Next service: {formatDate(log.next_service_date)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Asset info */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Asset Info</h3>
            {[
              { icon: <Shield className="w-4 h-4" />,   label: 'Status',     value: STATUS_LABELS[asset.status] },
              { icon: <Calendar className="w-4 h-4" />, label: 'Installed',  value: formatDate(asset.installation_date) },
              { icon: <Calendar className="w-4 h-4" />, label: 'Warranty',   value: asset.warranty_expiry_date ? `${asset.warranty_months}m · expires ${formatDate(asset.warranty_expiry_date)}` : 'No warranty' },
              { icon: <Hash className="w-4 h-4" />,     label: 'Serial No.', value: asset.serial_number ?? '—' },
              { icon: <MapPin className="w-4 h-4" />,   label: 'Location',   value: asset.location_description ?? '—' },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-slate-400 flex-shrink-0 mt-0.5">{row.icon}</span>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">{row.label}</div>
                  <div className="text-sm text-[#0A1628] dark:text-white">{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {customer && (
            <div className="card p-5 space-y-2">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Customer</h3>
              <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-[#0066FF] hover:underline block">
                {customer.company_name}
              </Link>
              {customer.contact_person && <div className="text-xs text-slate-400">{customer.contact_person}</div>}
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="text-xs text-slate-400 hover:text-[#0066FF]">{customer.phone}</a>
              )}
            </div>
          )}

          {(project || invoice) && (
            <div className="card p-5 space-y-2">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Linked Records</h3>
              {project && (
                <Link href={`/projects/${asset.project_id}`} className="text-sm text-[#0066FF] hover:underline flex items-center gap-1">
                  🔧 {project.project_number}
                </Link>
              )}
              {invoice && (
                <Link href={`/invoices/${asset.invoice_id}`} className="text-sm text-[#0066FF] hover:underline flex items-center gap-1">
                  🧾 {invoice.invoice_number}
                </Link>
              )}
            </div>
          )}

          {asset.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-slate-500 whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
