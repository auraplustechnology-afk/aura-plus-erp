import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ReceiptActions from '@/components/pdf/ReceiptActions'

export default async function POSReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [invoiceRes, settingsRes, paymentsRes] = await Promise.all([
    supabase.from('invoices')
      .select('*, customer:customer_id(*), lines:invoice_lines(*), created_by_user:created_by(full_name)')
      .eq('id', id).eq('invoice_type', 'pos').single(),
    supabase.from('system_settings').select('key, value'),
    supabase.from('payments').select('*').eq('invoice_id', id).order('created_at'),
  ])

  if (!invoiceRes.data) notFound()

  const invoice = invoiceRes.data
  const lines = [...(invoice.lines ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  const payments = paymentsRes.data ?? []
  const customer = invoice.customer as Record<string, string> | null
  const cashier = invoice.created_by_user as { full_name: string } | null
  const isVoided = invoice.status === 'voided'

  const settings: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settings[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  const fmtDateTime = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  const fmtAmt = (n: number) => Number(n).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const methodLabel: Record<string, string> = {
    cash: 'Cash', mobile_money: 'Mobile Money', card: 'Card', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Receipt {invoice.invoice_number}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background: #f1f5f9; }
          #receipt-content { width: 320px; margin: 24px auto; background: white; padding: 20px 18px; }
          @media print {
            body { background: white; }
            #receipt-content { margin: 0 auto; padding: 8px; width: 100%; }
            .no-print { display: none !important; }
            @page { margin: 4mm; }
          }
          .center { text-align: center; }
          .company-name { font-size: 15px; font-weight: 800; letter-spacing: 0.5px; }
          .company-meta { font-size: 10px; color: #444; line-height: 1.6; margin-top: 4px; }
          .divider { border-top: 1px dashed #999; margin: 10px 0; }
          .voided-banner { background: #dc2626; color: white; text-align: center; font-weight: 800; letter-spacing: 2px; padding: 6px; margin-bottom: 10px; font-size: 13px; }
          .meta-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
          .lines-table { width: 100%; font-size: 11px; margin-top: 6px; }
          .lines-table th { text-align: left; font-size: 10px; border-bottom: 1px dashed #999; padding-bottom: 4px; }
          .lines-table th:nth-child(2), .lines-table th:nth-child(3) { text-align: right; }
          .lines-table td { padding: 4px 0; vertical-align: top; }
          .lines-table td:nth-child(2), .lines-table td:nth-child(3) { text-align: right; white-space: nowrap; }
          .totals-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          .totals-final { font-weight: 800; font-size: 14px; border-top: 1px dashed #999; margin-top: 4px; padding-top: 6px; }
          .footer-note { text-align: center; font-size: 10px; color: #555; margin-top: 14px; line-height: 1.6; }
          .receipt-action-bar { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; }
          .receipt-action-btn { border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: Arial, sans-serif; }
          .receipt-action-btn-primary { background: #0066FF; color: white; box-shadow: 0 4px 12px rgba(0,102,255,0.3); }
          .receipt-action-btn-primary:hover { background: #0052CC; }
          .receipt-action-btn-primary:disabled { opacity: 0.7; cursor: default; }
          .receipt-action-btn-secondary { background: white; color: #0A1628; border: 1px solid #D1D5DB; }
          .receipt-action-btn-secondary:hover { background: #F5F7FA; }
        `}</style>
      </head>
      <body>
        <ReceiptActions fileName={`Receipt-${invoice.invoice_number}`} targetId="receipt-content" />

        <div id="receipt-content">
          {isVoided && <div className="voided-banner">VOIDED</div>}

          <div className="center">
            {settings.company_logo_url && settings.company_logo_url !== 'null' && (
              <img src={settings.company_logo_url} alt="Logo" style={{ maxHeight: 48, marginBottom: 6, display: 'inline-block' }} />
            )}
            <div className="company-name">{settings.company_name || 'AURA PLUS TECHNOLOGIES'}</div>
            <div className="company-meta">
              {settings.company_address && <>{settings.company_address}<br /></>}
              {settings.company_phone && <>{settings.company_phone}<br /></>}
              {settings.company_tpin && <>TPIN-{settings.company_tpin}</>}
            </div>
          </div>

          <div className="divider" />

          <div className="meta-row"><span>Receipt #</span><span>{invoice.invoice_number}</span></div>
          <div className="meta-row"><span>Date</span><span>{fmtDateTime(invoice.created_at)}</span></div>
          <div className="meta-row"><span>Cashier</span><span>{cashier?.full_name ?? '—'}</span></div>
          <div className="meta-row"><span>Customer</span><span>{customer?.company_name ?? 'Walk-in'}</span></div>

          <div className="divider" />

          <table className="lines-table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Amt</th></tr>
            </thead>
            <tbody>
              {lines.map((line: {
                id: string; description: string; quantity: number; unit_price: number; line_total: number
              }) => (
                <tr key={line.id}>
                  <td>{line.description}<div style={{ fontSize: 9, color: '#888' }}>{fmtAmt(Number(line.unit_price))} x {Number(line.quantity)}</div></td>
                  <td>{Number(line.quantity)}</td>
                  <td>{fmtAmt(Number(line.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="divider" />

          <div className="totals-row"><span>Subtotal</span><span>{fmtAmt(Number(invoice.subtotal))}</span></div>
          {Number(invoice.discount_amount) > 0 && (
            <div className="totals-row"><span>Discount</span><span>-{fmtAmt(Number(invoice.discount_amount))}</span></div>
          )}
          <div className="totals-row totals-final"><span>TOTAL</span><span>ZMW {fmtAmt(Number(invoice.total))}</span></div>

          <div className="divider" />

          {payments.map((p: { id: string; payment_method: string; amount: number }) => (
            <div className="totals-row" key={p.id}>
              <span>{methodLabel[p.payment_method] ?? p.payment_method}</span>
              <span>{Number(p.amount) < 0 ? '-' : ''}{fmtAmt(Math.abs(Number(p.amount)))}</span>
            </div>
          ))}

          {invoice.tot_note && <div className="footer-note">{invoice.tot_note}</div>}
          <div className="footer-note">Thank you for your business!</div>
        </div>
      </body>
    </html>
  )
}
