import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate, formatLabel, getInvoiceStatusClass } from '@/lib/utils/format'
import POSHistoryActions from '@/components/modules/pos/POSHistoryActions'

export const metadata = { title: 'POS Sale History — Aura Plus ERP' }

export default async function POSHistoryPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!currentUser || !['super_admin', 'sales', 'manager', 'accountant'].includes(currentUser.role)) redirect('/dashboard')

  const canManage = ['super_admin', 'manager'].includes(currentUser.role)

  const { data: sales } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, amount_paid, created_at, customer:customer_id(company_name), created_by_user:created_by(full_name)')
    .eq('invoice_type', 'pos')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/pos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Till
        </Link>
        <h1 className="page-title">POS Sale History</h1>
        <p className="page-subtitle">Every over-the-counter sale — reprint receipts, refund or void with permission</p>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt #</th><th>Customer</th><th>Cashier</th><th>Date</th>
              <th>Total</th><th>Status</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(sales ?? []).map(sale => {
              const customer = sale.customer as { company_name: string } | null
              const cashier = sale.created_by_user as { full_name: string } | null
              return (
                <tr key={sale.id}>
                  <td className="font-medium text-sm text-[#0A1628] dark:text-white">{sale.invoice_number}</td>
                  <td className="text-sm text-slate-500">{customer?.company_name ?? '—'}</td>
                  <td className="text-sm text-slate-500">{cashier?.full_name ?? '—'}</td>
                  <td className="text-xs text-slate-400">{formatDate(sale.created_at)} {new Date(sale.created_at).toLocaleTimeString()}</td>
                  <td className="text-sm font-semibold text-[#0A1628] dark:text-white">{formatCurrency(sale.total)}</td>
                  <td><span className={`badge ${getInvoiceStatusClass(sale.status)}`}>{formatLabel(sale.status)}</span></td>
                  <td>
                    <POSHistoryActions invoiceId={sale.id} invoiceNumber={sale.invoice_number} status={sale.status} canManage={canManage} />
                  </td>
                </tr>
              )
            })}
            {(!sales || sales.length === 0) && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No POS sales yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
