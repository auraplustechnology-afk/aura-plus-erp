import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Building2, FileText, Receipt,
  FolderKanban, Headphones, Package, Users
} from 'lucide-react'
import { formatCurrency, formatDate, getQuoteStatusClass, getInvoiceStatusClass, getProjectStatusClass, getTicketStatusClass, formatLabel } from '@/lib/utils/format'
import GlobalSearchBar from '@/components/modules/GlobalSearchBar'

export const metadata = { title: 'Search — Aura Plus ERP' }

interface SearchResults {
  customers: Array<{ id: string; company_name: string; contact_person: string | null; customer_type: string }>
  leads: Array<{ id: string; company_name: string; stage: string; expected_value: number }>
  quotations: Array<{ id: string; quote_number: string; total: number; status: string; customers: { company_name: string } | null }>
  invoices: Array<{ id: string; invoice_number: string; total: number; status: string; customers: { company_name: string } | null }>
  projects: Array<{ id: string; project_number: string; project_name: string; status: string; customers: { company_name: string } | null }>
  tickets: Array<{ id: string; ticket_number: string; issue_description: string; status: string; priority: string; customers: { company_name: string } | null }>
  products: Array<{ id: string; sku: string; product_name: string; selling_price: number; quantity_in_stock: number }>
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const role = currentUser?.role ?? 'sales'

  const params = await searchParams
  const query = params.q?.trim() ?? ''

  let results: SearchResults = {
    customers: [], leads: [], quotations: [], invoices: [],
    projects: [], tickets: [], products: [],
  }

  if (query.length >= 2) {
    const q = `%${query}%`

    const searches = await Promise.all([
      // Customers
      supabase.from('customers').select('id, company_name, contact_person, customer_type')
        .or(`company_name.ilike.${q},contact_person.ilike.${q},phone.ilike.${q},email.ilike.${q}`)
        .is('deleted_at', null).limit(5),

      // Leads
      ['super_admin', 'sales', 'manager'].includes(role)
        ? supabase.from('leads').select('id, company_name, stage, expected_value')
            .or(`company_name.ilike.${q},contact_person.ilike.${q},phone.ilike.${q}`)
            .is('deleted_at', null).limit(5)
        : { data: [] },

      // Quotations
      ['super_admin', 'sales', 'accountant', 'manager'].includes(role)
        ? supabase.from('quotations').select('id, quote_number, total, status, customers:customer_id(company_name)')
            .or(`quote_number.ilike.${q}`)
            .is('deleted_at', null).limit(5)
        : { data: [] },

      // Invoices
      ['super_admin', 'accountant', 'manager', 'sales'].includes(role)
        ? supabase.from('invoices').select('id, invoice_number, total, status, customers:customer_id(company_name)')
            .or(`invoice_number.ilike.${q}`)
            .is('deleted_at', null).limit(5)
        : { data: [] },

      // Projects
      ['super_admin', 'sales', 'manager'].includes(role)
        ? supabase.from('projects').select('id, project_number, project_name, status, customers:customer_id(company_name)')
            .or(`project_number.ilike.${q},project_name.ilike.${q}`)
            .is('deleted_at', null).limit(5)
        : { data: [] },

      // Tickets
      ['super_admin', 'sales', 'manager'].includes(role)
        ? supabase.from('support_tickets').select('id, ticket_number, issue_description, status, priority, customers:customer_id(company_name)')
            .or(`ticket_number.ilike.${q},issue_description.ilike.${q}`)
            .is('deleted_at', null).limit(5)
        : { data: [] },

      // Products
      supabase.from('products').select('id, sku, product_name, selling_price, quantity_in_stock')
        .or(`product_name.ilike.${q},sku.ilike.${q}`)
        .eq('is_active', true).limit(5),
    ])

    results = {
      customers: (searches[0].data ?? []) as SearchResults['customers'],
      leads:      (searches[1].data ?? []) as SearchResults['leads'],
      quotations: (searches[2].data ?? []) as SearchResults['quotations'],
      invoices:   (searches[3].data ?? []) as SearchResults['invoices'],
      projects:   (searches[4].data ?? []) as SearchResults['projects'],
      tickets:    (searches[5].data ?? []) as SearchResults['tickets'],
      products:   (searches[6].data ?? []) as SearchResults['products'],
    }
  }

  const totalResults = Object.values(results).reduce((s, arr) => s + arr.length, 0)

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="page-title">Global Search</h1>
        <p className="page-subtitle">Search across customers, quotes, invoices, projects, tickets and products</p>
      </div>

      {/* Search bar */}
      <GlobalSearchBar defaultValue={query} />

      {/* Results */}
      {query.length < 2 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">Start searching</h3>
          <p className="text-sm text-slate-400">Type at least 2 characters to search across the entire system</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No results</h3>
          <p className="text-sm text-slate-400">Nothing found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{totalResults} result{totalResults !== 1 ? 's' : ''} for &quot;<strong className="text-[#0A1628] dark:text-white">{query}</strong>&quot;</p>

          {/* Customers */}
          {results.customers.length > 0 && (
            <ResultSection title="Customers" icon={<Building2 className="w-4 h-4" />} count={results.customers.length}>
              {results.customers.map(c => (
                <Link key={c.id} href={`/customers/${c.id}`} className="result-item group">
                  <div className="w-8 h-8 bg-[#0066FF]/10 rounded-lg flex items-center justify-center text-[#0066FF] font-bold text-sm flex-shrink-0">
                    {c.company_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Highlight text={c.company_name} query={query} />
                    {c.contact_person && <div className="text-xs text-slate-400">{c.contact_person}</div>}
                  </div>
                  <span className="badge badge-default text-xs capitalize flex-shrink-0">{c.customer_type}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {/* Quotations */}
          {results.quotations.length > 0 && (
            <ResultSection title="Quotations" icon={<FileText className="w-4 h-4" />} count={results.quotations.length}>
              {results.quotations.map(q => {
                const customer = q.customers as { company_name: string } | null
                return (
                  <Link key={q.id} href={`/quotations/${q.id}`} className="result-item group">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-semibold text-[#0066FF]">{q.quote_number}</span>
                      <div className="text-xs text-slate-400">{customer?.company_name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold">{formatCurrency(q.total)}</div>
                      <span className={`badge ${getQuoteStatusClass(q.status)} text-xs`}>{formatLabel(q.status)}</span>
                    </div>
                  </Link>
                )
              })}
            </ResultSection>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <ResultSection title="Invoices" icon={<Receipt className="w-4 h-4" />} count={results.invoices.length}>
              {results.invoices.map(inv => {
                const customer = inv.customers as { company_name: string } | null
                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="result-item group">
                    <Receipt className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-semibold text-[#0066FF]">{inv.invoice_number}</span>
                      <div className="text-xs text-slate-400">{customer?.company_name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold">{formatCurrency(inv.total)}</div>
                      <span className={`badge ${getInvoiceStatusClass(inv.status)} text-xs`}>{formatLabel(inv.status)}</span>
                    </div>
                  </Link>
                )
              })}
            </ResultSection>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <ResultSection title="Projects" icon={<FolderKanban className="w-4 h-4" />} count={results.projects.length}>
              {results.projects.map(p => {
                const customer = p.customers as { company_name: string } | null
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="result-item group">
                    <FolderKanban className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-semibold text-[#0066FF]">{p.project_number}</span>
                      <div className="text-xs text-slate-400"><Highlight text={p.project_name} query={query} /> · {customer?.company_name}</div>
                    </div>
                    <span className={`badge ${getProjectStatusClass(p.status)} text-xs flex-shrink-0`}>{formatLabel(p.status)}</span>
                  </Link>
                )
              })}
            </ResultSection>
          )}

          {/* Tickets */}
          {results.tickets.length > 0 && (
            <ResultSection title="Support Tickets" icon={<Headphones className="w-4 h-4" />} count={results.tickets.length}>
              {results.tickets.map(t => {
                const customer = t.customers as { company_name: string } | null
                return (
                  <Link key={t.id} href={`/tickets/${t.id}`} className="result-item group">
                    <Headphones className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-semibold text-[#0066FF]">{t.ticket_number}</span>
                      <div className="text-xs text-slate-400 truncate"><Highlight text={t.issue_description} query={query} /></div>
                      <div className="text-xs text-slate-400">{customer?.company_name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`badge ${getTicketStatusClass(t.status)} text-xs`}>{formatLabel(t.status)}</span>
                    </div>
                  </Link>
                )
              })}
            </ResultSection>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <ResultSection title="Products" icon={<Package className="w-4 h-4" />} count={results.products.length}>
              {results.products.map(p => (
                <Link key={p.id} href={`/inventory/products/${p.id}`} className="result-item group">
                  <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Highlight text={p.product_name} query={query} />
                    <div className="text-xs text-slate-400 font-mono">{p.sku}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-[#0066FF]">{formatCurrency(p.selling_price)}</div>
                    <div className="text-xs text-slate-400">{p.quantity_in_stock} in stock</div>
                  </div>
                </Link>
              ))}
            </ResultSection>
          )}

          {/* Leads */}
          {results.leads.length > 0 && (
            <ResultSection title="Leads" icon={<Users className="w-4 h-4" />} count={results.leads.length}>
              {results.leads.map(l => (
                <Link key={l.id} href="/crm" className="result-item group">
                  <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Highlight text={l.company_name} query={query} />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold">{formatCurrency(l.expected_value)}</div>
                    <div className="text-xs text-slate-400 capitalize">{l.stage.replace('_', ' ')}</div>
                  </div>
                </Link>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────
function ResultSection({ title, icon, count, children }: {
  title: string; icon: React.ReactNode; count: number; children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        <span className="text-slate-400">{icon}</span>
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">{title}</h2>
        <span className="text-xs bg-slate-100 dark:bg-[#1E2A3B] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
        {children}
      </div>
    </div>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span className="text-sm font-medium text-[#0A1628] dark:text-white">{text}</span>
  return (
    <span className="text-sm font-medium text-[#0A1628] dark:text-white">
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-900/50 text-[#0A1628] dark:text-white rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}
