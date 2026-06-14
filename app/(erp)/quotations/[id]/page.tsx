import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2, FileText } from 'lucide-react'
import { formatCurrency, formatDate, getQuoteStatusClass, formatLabel } from '@/lib/utils/format'
import QuoteActions from '@/components/modules/quotations/QuoteActions'
import QuotePDFButton from '@/components/modules/quotations/QuotePDFButton'
import type { Quotation } from '@/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('quotations').select('quote_number').eq('id', id).single()
  return { title: `${data?.quote_number ?? 'Quote'} — Aura Plus ERP` }
}

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: quote } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customer_id(id, company_name, contact_person, email, phone, physical_address),
      lines:quotation_lines(*),
      salesperson:assigned_salesperson(id, full_name)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!quote) notFound()

  // Sort lines
  const sortedLines = [...(quote.lines ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  // Fetch company settings for PDF
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['company_name', 'company_address', 'company_phone', 'company_email', 'company_website', 'company_tpin', 'company_logo_url'])

  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => {
    settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status === 'sent'

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/quotations" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Quotations
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white font-mono">{quote.quote_number}</h1>
            <span className={`badge ${isExpired ? 'badge-danger' : getQuoteStatusClass(quote.status)} text-sm px-3 py-1`}>
              {isExpired ? 'Expired' : formatLabel(quote.status)}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Created {formatDate(quote.created_at)}
            {quote.salesperson && ` · ${(quote.salesperson as { full_name: string }).full_name}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <QuotePDFButton quote={quote as Quotation} settings={settingsMap} lines={sortedLines} />

          {['draft', 'sent'].includes(quote.status) && (
            <Link href={`/quotations/${id}/edit`} className="btn-secondary">
              <Edit2 className="w-4 h-4" /> Edit
            </Link>
          )}

          <QuoteActions quoteId={id} status={quote.status} customerId={quote.customer_id} />
        </div>
      </div>

      {/* Quote document preview — matches your exact QT-000249 layout */}
      <div className="card overflow-hidden">
        {/* Document header — white bg matches PDF */}
        <div className="bg-white dark:bg-[#0F1C2E] p-8">
          <div className="flex items-start justify-between mb-8">
            {/* Left: Company info */}
            <div className="flex-1">
              {settingsMap.company_logo_url && settingsMap.company_logo_url !== 'null' ? (
                <div className="w-40 h-24 bg-[#EBF2FF] rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settingsMap.company_logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                </div>
              ) : (
                <div className="w-40 h-24 bg-[#EBF2FF] rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-[#0066FF]" />
                </div>
              )}
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 max-w-xs">
                <div className="font-bold text-sm text-[#0A1628] dark:text-white">{settingsMap.company_name}</div>
                {settingsMap.company_address && <div>{settingsMap.company_address}</div>}
                {settingsMap.company_tpin && <div>TPIN-{settingsMap.company_tpin}</div>}
                {settingsMap.company_phone && <div>{settingsMap.company_phone}</div>}
                {settingsMap.company_email && <div>{settingsMap.company_email}</div>}
                {settingsMap.company_website && <div>{settingsMap.company_website}</div>}
              </div>
            </div>

            {/* Right: Quote title */}
            <div className="text-right">
              <div className="text-4xl font-black text-[#0A1628] dark:text-white tracking-tight">QUOTE</div>
              <div className="text-sm font-semibold text-slate-500 mt-1">#{quote.quote_number}</div>
            </div>
          </div>

          {/* Bill To + Date */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Bill To</div>
              <div className="font-bold text-[#0A1628] dark:text-white">
                {(quote.customer as { company_name: string } | null)?.company_name}
              </div>
              {(quote.customer as { contact_person: string | null } | null)?.contact_person && (
                <div className="text-sm text-slate-500">{(quote.customer as { contact_person: string }).contact_person}</div>
              )}
              {(quote.customer as { phone: string | null } | null)?.phone && (
                <div className="text-sm text-slate-500">{(quote.customer as { phone: string }).phone}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">
                <span className="mr-2">:</span>
                <span className="font-medium text-[#0A1628] dark:text-white">{formatDate(quote.created_at)}</span>
              </div>
              {quote.valid_until && (
                <div className={`text-xs mt-1 ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                  Valid until {formatDate(quote.valid_until)}
                </div>
              )}
            </div>
          </div>

          {/* Line items table — exact match of sample quote */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-[#0A1628] dark:bg-[#0066FF]">
                <th className="text-left text-white text-xs font-semibold px-4 py-3 w-8">#</th>
                <th className="text-left text-white text-xs font-semibold px-4 py-3">Item & Description</th>
                <th className="text-right text-white text-xs font-semibold px-4 py-3 w-16">Qty</th>
                <th className="text-right text-white text-xs font-semibold px-4 py-3 w-28">Rate</th>
                <th className="text-right text-white text-xs font-semibold px-4 py-3 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sortedLines.map((line, i) => (
                <tr key={line.id} className="border-b border-slate-100 dark:border-[#1E2A3B]">
                  <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-[#0A1628] dark:text-white">{line.description}</div>
                    {line.discount_percent > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">{line.discount_percent}% discount applied</div>
                    )}
                    {line.line_type !== 'product' && (
                      <div className="text-xs text-slate-400 mt-0.5 capitalize">{line.line_type}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-300">
                    {Number(line.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-300">
                    {Number(line.unit_price).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-[#0A1628] dark:text-white">
                    {Number(line.line_total).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals block */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sub Total</span>
                <span>{Number(quote.subtotal).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
              </div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount ({quote.discount_percent}%)</span>
                  <span className="text-red-500">-{Number(quote.discount_amount).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between bg-slate-100 dark:bg-[#1E2A3B] rounded px-3 py-2 mt-2">
                <span className="font-bold text-[#0A1628] dark:text-white">Total</span>
                <span className="font-bold text-[#0A1628] dark:text-white">ZMW{Number(quote.total).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}</span>
              </div>
              {quote.tot_note && (
                <div className="text-xs text-slate-400 text-right">{quote.tot_note}</div>
              )}
            </div>
          </div>

          {/* Notes + Terms */}
          <div className="space-y-5 text-sm">
            {quote.notes && (
              <div>
                <div className="font-semibold text-[#0A1628] dark:text-white mb-1">Notes</div>
                <div className="text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{quote.notes}</div>
              </div>
            )}
            {quote.terms_and_conditions && (
              <div>
                <div className="font-semibold text-[#0A1628] dark:text-white mb-1">Terms &amp; Conditions</div>
                <div className="text-slate-500 dark:text-slate-400 whitespace-pre-wrap text-xs">{quote.terms_and_conditions}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meta info */}
      {quote.accepted_at && (
        <div className="card p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓ Accepted on {formatDate(quote.accepted_at)}
          </p>
        </div>
      )}
    </div>
  )
}
