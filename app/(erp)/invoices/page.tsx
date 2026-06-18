import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate, getInvoiceStatusClass, formatLabel } from '@/lib/utils/format'
import InvoiceActions from '@/components/modules/invoices/InvoiceActions'
import RecordPaymentModal from '@/components/modules/invoices/RecordPaymentModal'
import InvoicePDFButton from '@/components/modules/invoices/InvoicePDFButton'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('invoices').select('invoice_number').eq('id', id).single()
  return { title: `${data?.invoice_number ?? 'Invoice'} — Aura Plus ERP` }
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const isSales = currentUser?.role === 'sales'

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase.from('invoices').select(`
      *,
      customer:customer_id(id, company_name, contact_person, email, phone, physical_address),
      lines:invoice_lines(*),
      payments(*, recorded_by_user:recorded_by(full_name))
    `).eq('id', id).is('deleted_at', null).single(),
    supabase.from('system_settings').select('key, value'),
  ])

  if (!invoiceRes.data) notFound()

  const invoice = invoiceRes.data
  const sortedLines = [...(invoice.lines ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  const payments = [...(invoice.payments ?? [])].sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const settings: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settings[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  const customer = invoice.customer as Record<string, string> | null
  const isOverdue = invoice.status === 'overdue'
  const isPaid = invoice.status === 'paid'
  const canEdit = ['draft'].includes(invoice.status) && !isSales
  const canRecordPayment = !isPaid && !isSales
  const progressPercent = invoice.total > 0 ? Math.min(100, (invoice.amount_paid / invoice.total) * 100) : 0

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Invoices
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white font-mono">{invoice.invoice_number}</h1>
            {invoice.invoice_type === 'proforma' && (
              <span className="badge badge-info text-xs">Proforma</span>
            )}
            <span className={`badge ${getInvoiceStatusClass(invoice.status)} text-sm px-3 py-1`}>
              {formatLabel(invoice.status)}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Created {formatDate(invoice.created_at)}
            {invoice.due_date && ` · Due ${formatDate(invoice.due_date)}`}
            {invoice.quotation_id && (
              <Link href={`/quotations/${invoice.quotation_id}`} className="ml-2 text-[#0066FF] hover:underline">
                View source quote →
              </Link>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isSales && <InvoicePDFButton invoiceId={id} />}
          {canEdit && (
            <Link href={`/invoices/${id}/edit`} className="btn-secondary">
              <Edit2 className="w-4 h-4" /> Edit
            </Link>
          )}
          {!isSales && <InvoiceActions invoiceId={id} status={invoice.status} />}
        </div>
      </div>

      {/* Overdue banner */}
      {isOverdue && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">This invoice is overdue</p>
            <p className="text-xs text-red-600 dark:text-red-500">Due date was {formatDate(invoice.due_date)}{!isSales && ` · Outstanding: ${formatCurrency(invoice.outstanding_balance)}`}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoice document */}
        <div className={`${isSales ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-5`}>
          <div className="card overflow-hidden">
            <div className="bg-white dark:bg-[#0F1C2E] p-8">
              {/* Doc header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex-1">
                  {settings.company_logo_url && settings.company_logo_url !== 'null' ? (
                    <div className="w-40 h-24 bg-[#EBF2FF] rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={settings.company_logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                    </div>
                  ) : (
                    <div className="w-40 h-24 bg-[#EBF2FF] rounded-lg flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-[#0066FF]" />
                    </div>
                  )}
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 max-w-xs">
                    <div className="font-bold text-sm text-[#0A1628] dark:text-white">{settings.company_name}</div>
                    {settings.company_address && <div>{settings.company_address}</div>}
                    {settings.company_tpin && <div>TPIN-{settings.company_tpin}</div>}
                    {settings.company_phone && <div>{settings.company_phone}</div>}
                    {settings.company_email && <div>{settings.company_email}</div>}
                    {settings.company_website && <div>{settings.company_website}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-[#0A1628] dark:text-white tracking-tight">
                    {invoice.invoice_type === 'proforma' ? 'PROFORMA' : 'INVOICE'}
                  </div>
                  <div className="text-sm font-semibold text-slate-500 mt-1">#{invoice.invoice_number}</div>
                  {!isSales && (
                    <div className="mt-3">
                      <div className="text-xs text-slate-400">Balance Due</div>
                      <div className={`text-xl font-bold ${isPaid ? 'text-green-600' : isOverdue ? 'text-red-500' : 'text-[#0A1628] dark:text-white'}`}>
                        {isPaid ? 'ZMW0.00' : formatCurrency(invoice.outstanding_balance)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bill to + dates */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Bill To</div>
                  <div className="font-bold text-[#0A1628] dark:text-white">{customer?.company_name}</div>
                  {customer?.contact_person && <div className="text-sm text-slate-500">{customer.contact_person}</div>}
                  {customer?.phone && <div className="text-sm text-slate-500">{customer.phone}</div>}
                  {customer?.email && <div className="text-sm text-slate-500">{customer.email}</div>}
                  {customer?.physical_address && <div className="text-sm text-slate-500">{customer.physical_address}</div>}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <span className="text-slate-400 mr-3">Invoice Date :</span>
                    <span className="font-medium text-[#0A1628] dark:text-white">{formatDate(invoice.created_at)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400 mr-3">Terms :</span>
                    <span className="font-medium text-[#0A1628] dark:text-white">{invoice.payment_terms}</span>
                  </div>
                  {invoice.due_date && (
                    <div className="text-sm">
                      <span className="text-slate-400 mr-3">Due Date :</span>
                      <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-[#0A1628] dark:text-white'}`}>
                        {formatDate(invoice.due_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lines table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="bg-[#0A1628] dark:bg-[#0066FF]">
                    <th className="text-left text-white text-xs font-semibold px-4 py-3 w-8">#</th>
                    <th className="text-left text-white text-xs font-semibold px-4 py-3">Item & Description</th>
                    <th className="text-right text-white text-xs font-semibold px-4 py-3 w-16">Qty</th>
                    {!isSales && <th className="text-right text-white text-xs font-semibold px-4 py-3 w-28">Rate</th>}
                    {!isSales && <th className="text-right text-white text-xs font-semibold px-4 py-3 w-28">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedLines.map((line: {
                    id: string; description: string; line_type: string;
                    quantity: number; unit_price: number; line_total: number
                  }, i: number) => (
                    <tr key={line.id} className="border-b border-slate-100 dark:border-[#1E2A3B]">
                      <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[#0A1628] dark:text-white">{line.description}</div>
                        {line.line_type !== 'product' && (
                          <div className="text-xs text-slate-400 mt-0.5 capitalize">{line.line_type}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-300">
                        {Number(line.quantity).toFixed(2)}
                      </td>
                      {!isSales && (
                        <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-300">
                          {Number(line.unit_price).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {!isSales && (
                        <td className="px-4 py-3 text-sm text-right font-medium text-[#0A1628] dark:text-white">
                          {Number(line.line_total).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals — hidden from sales role */}
              {!isSales && (
                <div className="flex justify-end mb-8">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Sub Total</span>
                      <span>{Number(invoice.subtotal).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Discount</span>
                        <span className="text-red-500">-{Number(invoice.discount_amount).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between bg-slate-100 dark:bg-[#1E2A3B] rounded px-3 py-2 mt-2">
                      <span className="font-bold text-[#0A1628] dark:text-white">Total</span>
                      <span className="font-bold text-[#0A1628] dark:text-white">ZMW{Number(invoice.total).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoice.amount_paid > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Payment Made</span>
                        <span className="text-red-500 font-medium">(-) {Number(invoice.amount_paid).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between bg-slate-100 dark:bg-[#1E2A3B] rounded px-3 py-2">
                      <span className="font-bold text-[#0A1628] dark:text-white">Balance Due</span>
                      <span className={`font-bold ${isPaid ? 'text-green-600' : isOverdue ? 'text-red-500' : 'text-[#0A1628] dark:text-white'}`}>
                        ZMW{Number(invoice.outstanding_balance).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {invoice.tot_note && (
                      <div className="text-xs text-slate-400 text-right">{invoice.tot_note}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes + Terms */}
              <div className="space-y-5 text-sm">
                {invoice.notes && (
                  <div>
                    <div className="font-semibold text-[#0A1628] dark:text-white mb-1">Notes</div>
                    <div className="text-slate-500 whitespace-pre-wrap">{invoice.notes}</div>
                  </div>
                )}
                {invoice.terms_and_conditions && (
                  <div>
                    <div className="font-semibold text-[#0A1628] dark:text-white mb-1">Terms &amp; Conditions</div>
                    <div className="text-slate-500 whitespace-pre-wrap text-xs">{invoice.terms_and_conditions}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Payment panel — hidden from sales */}
        {!isSales && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-4">Payment Summary</h3>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Paid</span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-2">
                  <div
                    className="bg-green-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Invoice Total</span>
                  <span className="font-semibold text-[#0A1628] dark:text-white">{formatCurrency(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-semibold text-green-600">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[#E2E8F0] dark:border-[#1E2A3B] pt-2.5">
                  <span className="font-semibold text-[#0A1628] dark:text-white">Outstanding</span>
                  <span className={`font-bold text-base ${isPaid ? 'text-green-600' : isOverdue ? 'text-red-500' : 'text-[#0A1628] dark:text-white'}`}>
                    {formatCurrency(invoice.outstanding_balance)}
                  </span>
                </div>
              </div>
              {isPaid && (
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Paid in full {formatDate(invoice.paid_at)}
                </div>
              )}
              {invoice.stock_deducted && (
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Stock deducted {formatDate(invoice.stock_deducted_at)}
                </div>
              )}
            </div>

            {canRecordPayment && (
              <RecordPaymentModal invoiceId={id} outstanding={invoice.outstanding_balance} />
            )}

            {payments.length > 0 && (
              <div className="card">
                <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
                  <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Payment History</h3>
                </div>
                <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
                  {payments.map((payment: {
                    id: string; amount: number; payment_method: string;
                    payment_date: string; reference_number: string | null;
                    notes: string | null; recorded_by_user: { full_name: string } | null
                  }) => (
                    <div key={payment.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-green-600">+{formatCurrency(payment.amount)}</div>
                          <div className="text-xs text-slate-400 mt-0.5 capitalize">
                            {payment.payment_method.replace('_', ' ')}
                            {payment.reference_number && ` · Ref: ${payment.reference_number}`}
                          </div>
                          {payment.notes && <div className="text-xs text-slate-400 mt-0.5">{payment.notes}</div>}
                          {payment.recorded_by_user && <div className="text-xs text-slate-400 mt-0.5">by {payment.recorded_by_user.full_name}</div>}
                        </div>
                        <div className="text-xs text-slate-400 flex-shrink-0">{formatDate(payment.payment_date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
