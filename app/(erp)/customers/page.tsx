import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import CustomerSearchBar from '@/components/modules/customers/CustomerSearchBar'

export const metadata = { title: 'Customers — Aura Plus ERP' }

const TYPE_COLORS: Record<string, string> = {
  prospect: 'badge-info',
  active: 'badge-success',
  inactive: 'badge-default',
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const search = params.q ?? ''
  const typeFilter = params.type ?? ''
  const page = parseInt(params.page ?? '1')
  const pageSize = 20

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('company_name', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (typeFilter) {
    query = query.eq('customer_type', typeFilter)
  }

  const { data: customers, count } = await query

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // Counts for filter tabs
  const [activeCount, prospectCount, inactiveCount] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact' }).eq('customer_type', 'active').is('deleted_at', null),
    supabase.from('customers').select('id', { count: 'exact' }).eq('customer_type', 'prospect').is('deleted_at', null),
    supabase.from('customers').select('id', { count: 'exact' }).eq('customer_type', 'inactive').is('deleted_at', null),
  ])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{count ?? 0} total customers</p>
        </div>
        <Link href="/customers/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Customer
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        {[
          { label: 'All', value: '', count: count ?? 0 },
          { label: 'Active', value: 'active', count: activeCount.count ?? 0 },
          { label: 'Prospects', value: 'prospect', count: prospectCount.count ?? 0 },
          { label: 'Inactive', value: 'inactive', count: inactiveCount.count ?? 0 },
        ].map(tab => (
          <Link
            key={tab.value}
            href={`/customers?type=${tab.value}${search ? `&q=${search}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              typeFilter === tab.value
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500 hover:text-[#0A1628] dark:hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              typeFilter === tab.value
                ? 'bg-[#0066FF]/10 text-[#0066FF]'
                : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <CustomerSearchBar defaultValue={search} typeFilter={typeFilter} />

      {/* Table */}
      <div className="card overflow-hidden">
        {(customers ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No customers found</h3>
            <p className="text-sm text-slate-400 mb-4">
              {search ? `No results for "${search}"` : 'Add your first customer to get started.'}
            </p>
            {!search && (
              <Link href="/customers/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Add Customer
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="hidden sm:table-cell">Contact</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th className="hidden lg:table-cell">Location</th>
                  <th>Type</th>
                  <th className="hidden sm:table-cell">Since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(customers ?? []).map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#0066FF]/10 rounded-lg flex items-center justify-center text-[#0066FF] font-bold text-sm flex-shrink-0">
                          {customer.company_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-medium text-[#0A1628] dark:text-white hover:text-[#0066FF] transition-colors block truncate"
                          >
                            {customer.company_name}
                          </Link>
                          {customer.email && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 sm:hidden">
                              <Mail className="w-3 h-3" />{customer.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="text-sm text-[#0A1628] dark:text-slate-200">{customer.contact_person ?? '—'}</div>
                      {customer.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3" />{customer.email}
                        </div>
                      )}
                    </td>
                    <td className="hidden md:table-cell">
                      {customer.phone ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Phone className="w-3.5 h-3.5" />{customer.phone}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="hidden lg:table-cell">
                      {customer.physical_address ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{customer.physical_address}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${TYPE_COLORS[customer.customer_type] ?? 'badge-default'}`}>
                        {customer.customer_type.charAt(0).toUpperCase() + customer.customer_type.slice(1)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-slate-500 text-sm">
                      {formatDate(customer.created_at)}
                    </td>
                    <td>
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-xs text-[#0066FF] hover:underline font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <p className="text-sm text-slate-400">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count} customers
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/customers?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ''}${search ? `&q=${search}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">
                      ← Prev
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/customers?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ''}${search ? `&q=${search}` : ''}`} className="btn-primary text-xs py-1.5 px-3">
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
