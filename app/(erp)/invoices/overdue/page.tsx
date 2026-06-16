import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Clock, CheckCircle2, MessageCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import PaymentReminderModal from '@/components/modules/payments/PaymentReminderModal'

export const metadata = { title: 'Overdue Invoices — Aura Plus ERP' }

export default async function OverdueInvoicesPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Get all unpaid invoices with due dates
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total, amount_paid, outstanding_balance,
      status, due_date, created_at, sent_at,
      customer:customer_id(id, company_name, contact_person, phone, email),
      payment_reminders(id, reminder_type, created_at, next_follow_up_date,
        sent_by_user:sent_by(full_name))
    `)
    .in('status', ['sent', 'partially_paid', 'overdue'])
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  // Get company settings for WhatsApp message
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['company_name', 'company_phone'])

  const settingsMap: Record<string, string> = {}
  ;(settings ?? []).forEach(s => {
    settingsMap[s.key] = String(s.value ?? '').replace(/^"|"$/g, '')
  })

  // Categorise invoices
  const now_ms = now.getTime()

  const categorised = (overdueInvoices ?? []).map(inv => {
    const dueDate = inv.due_date ? new Date(inv.due_date) : null
    const daysOverdue = dueDate
      ? Math.floor((now_ms - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const customer = (inv.customer as unknown) as {
      id: string; company_name: string; contact_person: string | null
      phone: string | null; email: string | null
    } | null
    const reminders = (inv.payment_reminders as unknown) as Array<{
      id: string; reminder_type: string; created_at: string
      next_follow_up_date: string | null
      sent_by_user: { full_name: string } | null
    }> ?? []
    const lastReminder = reminders.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    return { ...inv, daysOverdue, customer, reminders, lastReminder }
  })

  const critical = categorised.filter(i => (i.daysOverdue ?? 0) > 30)
  const warning  = categorised.filter(i => (i.daysOverdue ?? 0) > 7 && (i.daysOverdue ?? 0) <= 30)
  const upcoming = categorised.filter(i => (i.daysOverdue ?? 0) <= 7)

  const totalOutstanding = categorised.reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Follow-Up</h1>
          <p className="page-subtitle">
            {categorised.length} outstanding invoices · {formatCurrency(totalOutstanding)} uncollected
          </p>
        </div>
        <Link href="/invoices" className="btn-secondary">All Invoices</Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Critical</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{critical.length}</div>
          <div className="text-xs text-slate-400">Over 30 days</div>
          <div className="text-sm font-semibold text-red-500 mt-1">
            {formatCurrency(critical.reduce((s, i) => s + (i.outstanding_balance ?? 0), 0))}
          </div>
        </div>
        <div className="stat-card border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{warning.length}</div>
          <div className="text-xs text-slate-400">7–30 days</div>
          <div className="text-sm font-semibold text-amber-500 mt-1">
            {formatCurrency(warning.reduce((s, i) => s + (i.outstanding_balance ?? 0), 0))}
          </div>
        </div>
        <div className="stat-card border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/10">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Due Soon</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{upcoming.length}</div>
          <div className="text-xs text-slate-400">Within 7 days</div>
          <div className="text-sm font-semibold text-blue-500 mt-1">
            {formatCurrency(upcoming.reduce((s, i) => s + (i.outstanding_balance ?? 0), 0))}
          </div>
        </div>
      </div>

      {/* Critical invoices */}
      {critical.length > 0 && (
        <InvoiceGroup
          title="🔴 Critical — Over 30 Days Overdue"
          invoices={critical}
          companyName={settingsMap.company_name}
          companyPhone={settingsMap.company_phone}
          borderColor="border-red-200 dark:border-red-900"
          headerColor="bg-red-50 dark:bg-red-950/20"
        />
      )}

      {/* Warning invoices */}
      {warning.length > 0 && (
        <InvoiceGroup
          title="🟡 Overdue — 7 to 30 Days"
          invoices={warning}
          companyName={settingsMap.company_name}
          companyPhone={settingsMap.company_phone}
          borderColor="border-amber-200 dark:border-amber-900"
          headerColor="bg-amber-50 dark:bg-amber-950/20"
        />
      )}

      {/* Upcoming invoices */}
      {upcoming.length > 0 && (
        <InvoiceGroup
          title="🔵 Due Soon — Within 7 Days"
          invoices={upcoming}
          companyName={settingsMap.company_name}
          companyPhone={settingsMap.company_phone}
          borderColor="border-blue-200 dark:border-blue-900"
          headerColor="bg-blue-50 dark:bg-blue-950/20"
        />
      )}

      {categorised.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-400 mb-4" />
          <h2 className="text-xl font-bold text-[#0A1628] dark:text-white mb-2">All invoices are paid!</h2>
          <p className="text-slate-400 text-sm">No outstanding payments at this time.</p>
        </div>
      )}
    </div>
  )
}

// ── Invoice Group Component ──────────────────────────────────
function InvoiceGroup({ title, invoices, companyName, companyPhone, borderColor, headerColor }: {
  title: string
  invoices: Array<{
    id: string; invoice_number: string; total: number
    outstanding_balance: number; due_date: string | null
    daysOverdue: number | null; status: string
    customer: { id: string; company_name: string; contact_person: string | null; phone: string | null; email: string | null } | null
    reminders: Array<{ id: string; reminder_type: string; created_at: string; next_follow_up_date: string | null; sent_by_user: { full_name: string } | null }>
    lastReminder: { id: string; reminder_type: string; created_at: string; next_follow_up_date: string | null; sent_by_user: { full_name: string } | null } | undefined
  }>
  companyName: string
  companyPhone: string
  borderColor: string
  headerColor: string
}) {
  return (
    <div className={`card overflow-hidden border ${borderColor}`}>
      <div className={`px-5 py-3.5 ${headerColor} border-b ${borderColor}`}>
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
        {invoices.map(inv => (
          <div key={inv.id} className="px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link href={`/invoices/${inv.id}`}
                    className="font-mono text-sm font-bold text-[#0066FF] hover:underline">
                    {inv.invoice_number}
                  </Link>
                  {inv.daysOverdue !== null && inv.daysOverdue > 0 && (
                    <span className="badge badge-danger text-xs">
                      {inv.daysOverdue} day{inv.daysOverdue !== 1 ? 's' : ''} overdue
                    </span>
                  )}
                  {inv.status === 'partially_paid' && (
                    <span className="badge badge-warning text-xs">Partially Paid</span>
                  )}
                </div>

                <div className="text-base font-bold text-[#0A1628] dark:text-white">
                  {inv.customer?.company_name ?? '—'}
                </div>
                {inv.customer?.contact_person && (
                  <div className="text-xs text-slate-400">{inv.customer.contact_person}</div>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>Invoice total: <strong className="text-[#0A1628] dark:text-white">{formatCurrency(inv.total)}</strong></span>
                  <span>Outstanding: <strong className="text-red-500">{formatCurrency(inv.outstanding_balance)}</strong></span>
                  {inv.due_date && <span>Due: {formatDate(inv.due_date)}</span>}
                </div>

                {/* Last reminder info */}
                {inv.lastReminder && (
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                    <MessageCircle className="w-3 h-3" />
                    Last chased via {inv.lastReminder.reminder_type} on {formatDate(inv.lastReminder.created_at)}
                    {inv.lastReminder.next_follow_up_date && (
                      <span> · Follow up: {formatDate(inv.lastReminder.next_follow_up_date)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* WhatsApp quick button */}
                {inv.customer?.phone && (
                  <a
                    href={`https://wa.me/${inv.customer.phone.replace(/\s+/g, '').replace('+', '')}?text=${encodeURIComponent(
                      `Dear ${inv.customer.company_name},\n\nThis is a reminder that Invoice *${inv.invoice_number}* for *${formatCurrency(inv.outstanding_balance)}* ${(inv.daysOverdue ?? 0) > 0 ? `is *${inv.daysOverdue} days overdue*` : `is due on *${inv.due_date ? formatDate(inv.due_date) : 'soon'}*`}.\n\nKindly arrange payment at your earliest convenience.\n\nThank you.\n${companyName || 'Aura Plus Technologies'}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}

                {/* Log reminder modal */}
                <PaymentReminderModal
                  invoiceId={inv.id}
                  invoiceNumber={inv.invoice_number}
                  customerId={inv.customer?.id ?? ''}
                  customerName={inv.customer?.company_name ?? ''}
                  customerPhone={inv.customer?.phone ?? ''}
                  outstanding={inv.outstanding_balance}
                  dueDate={inv.due_date ?? ''}
                  daysOverdue={inv.daysOverdue ?? 0}
                  companyName={companyName}
                  companyPhone={companyPhone}
                  reminderCount={inv.reminders.length}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
