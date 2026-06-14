import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function InvoicePDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [invoiceRes, settingsRes, paymentsRes] = await Promise.all([
    supabase.from('invoices').select('*, customer:customer_id(*), lines:invoice_lines(*)')
      .eq('id', id).is('deleted_at', null).single(),
    supabase.from('system_settings').select('key, value'),
    supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date'),
  ])

  if (!invoiceRes.data) notFound()

  const invoice = invoiceRes.data
  const lines = [...(invoice.lines ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  const payments = paymentsRes.data ?? []
  const customer = invoice.customer as Record<string, string> | null

  const settings: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settings[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  const fmt = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const fmtAmt = (n: number) => n.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const isPaid = invoice.status === 'paid'
  const docTitle = invoice.invoice_type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{invoice.invoice_number}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
          @media print { body { padding: 24px; } .no-print { display: none !important; } @page { margin: 1cm; } }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
          .logo-box { width: 160px; height: 90px; background: #EBF2FF; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; padding: 8px; }
          .logo-placeholder { color: #0066FF; font-size: 24px; font-weight: 900; }
          .company-info { margin-top: 12px; font-size: 11px; color: #555; line-height: 1.6; }
          .company-info strong { color: #0A1628; font-size: 12px; }
          .doc-title { text-align: right; }
          .doc-title h1 { font-size: 38px; font-weight: 900; color: #0A1628; letter-spacing: -1px; }
          .doc-title .doc-num { font-size: 13px; color: #666; margin-top: 4px; font-weight: 600; }
          .balance-due { margin-top: 8px; }
          .balance-due .label { font-size: 11px; color: #888; }
          .balance-due .amount { font-size: 18px; font-weight: 700; color: ${isPaid ? '#16a34a' : '#0A1628'}; }
          .meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #E5E7EB; }
          .bill-to label { font-size: 11px; color: #888; margin-bottom: 3px; display: block; }
          .bill-to strong { font-size: 14px; font-weight: 700; color: #0A1628; display: block; }
          .bill-to span { font-size: 12px; color: #555; display: block; }
          .dates-col { text-align: right; font-size: 12px; color: #555; line-height: 2; }
          .dates-col span { color: #0A1628; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #0A1628; }
          thead th { color: white; font-size: 11px; font-weight: 600; padding: 10px 12px; text-align: left; }
          thead th:nth-child(n+3) { text-align: right; }
          tbody tr { border-bottom: 1px solid #F0F0F0; }
          tbody tr:nth-child(even) { background: #FAFAFA; }
          tbody td { padding: 10px 12px; font-size: 12px; color: #333; vertical-align: top; }
          tbody td:nth-child(1) { color: #999; width: 32px; }
          tbody td:nth-child(3), tbody td:nth-child(4), tbody td:nth-child(5) { text-align: right; }
          .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
          .totals-box { width: 260px; }
          .t-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #555; }
          .t-final { background: #F3F4F6; padding: 8px 12px; border-radius: 4px; margin-top: 4px; }
          .t-final span { font-weight: 700; font-size: 14px; color: #0A1628; }
          .t-paid { color: #dc2626; font-weight: 500; }
          .t-balance { background: #F3F4F6; padding: 8px 12px; border-radius: 4px; margin-top: 4px; }
          .t-balance span:last-child { font-weight: 700; font-size: 14px; color: ${isPaid ? '#16a34a' : '#0A1628'}; }
          .tot-note { font-size: 10px; color: #999; text-align: right; margin-top: 4px; }
          .footer-section { margin-top: 8px; border-top: 1px solid #E5E7EB; padding-top: 16px; }
          .footer-section h4 { font-size: 12px; font-weight: 700; color: #0A1628; margin-bottom: 6px; }
          .footer-section p { font-size: 11px; color: #555; line-height: 1.7; white-space: pre-wrap; }
          .print-btn { position: fixed; top: 16px; right: 16px; background: #0066FF; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,102,255,0.3); }
        `}</style>
      </head>
      <body>
        <button className="no-print print-btn" onClick={() => { if (typeof window !== 'undefined') window.print() }}>
          🖨 Print / Save PDF
        </button>

        {/* Header */}
        <div className="header">
          <div>
            <div className="logo-box">
              {settings.company_logo_url && settings.company_logo_url !== 'null'
                ? <img src={settings.company_logo_url} alt="Logo" />
                : <div className="logo-placeholder">A+</div>
              }
            </div>
            <div className="company-info">
              <strong>{settings.company_name || 'AURA PLUS TECHNOLOGIES'}</strong><br />
              {settings.company_address && <>{settings.company_address}<br /></>}
              {settings.company_tpin && <>TPIN-{settings.company_tpin}<br /></>}
              {settings.company_phone && <>{settings.company_phone}<br /></>}
              {settings.company_email && <>{settings.company_email}<br /></>}
              {settings.company_website && <>{settings.company_website}</>}
            </div>
          </div>
          <div className="doc-title">
            <h1>{docTitle}</h1>
            <div className="doc-num"># {invoice.invoice_number}</div>
            <div className="balance-due">
              <div className="label">Balance Due</div>
              <div className="amount">ZMW{fmtAmt(Number(invoice.outstanding_balance))}</div>
            </div>
          </div>
        </div>

        {/* Bill to + dates — matching INV-000087 exactly */}
        <div className="meta-row">
          <div className="bill-to">
            <label>Bill To</label>
            <strong>{customer?.company_name}</strong>
            {customer?.contact_person && <span>{customer.contact_person}</span>}
            {customer?.phone && <span>{customer.phone}</span>}
            {customer?.email && <span>{customer.email}</span>}
            {customer?.physical_address && <span>{customer.physical_address}</span>}
          </div>
          <div className="dates-col">
            Invoice Date : <span>{fmt(invoice.created_at)}</span><br />
            Terms : <span>{invoice.payment_terms}</span><br />
            {invoice.due_date && <>Due Date : <span>{fmt(invoice.due_date)}</span></>}
          </div>
        </div>

        {/* Lines */}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item &amp; Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line: {
              id: string; description: string; line_type: string;
              quantity: number; unit_price: number; line_total: number
            }, i: number) => (
              <tr key={line.id}>
                <td>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 500, color: '#0A1628' }}>{line.description}</div>
                  {line.line_type !== 'product' && <div style={{ fontSize: 11, color: '#888', textTransform: 'capitalize' }}>{line.line_type}</div>}
                </td>
                <td>{Number(line.quantity).toFixed(2)}</td>
                <td>{fmtAmt(Number(line.unit_price))}</td>
                <td>{fmtAmt(Number(line.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals — matching INV-000087 with "Payment Made" in red */}
        <div className="totals">
          <div className="totals-box">
            <div className="t-row"><span>Sub Total</span><span>{fmtAmt(Number(invoice.subtotal))}</span></div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="t-row"><span>Discount</span><span style={{ color: '#dc2626' }}>-{fmtAmt(Number(invoice.discount_amount))}</span></div>
            )}
            <div className="t-row t-final"><span>Total</span><span>ZMW{fmtAmt(Number(invoice.total))}</span></div>
            {Number(invoice.amount_paid) > 0 && (
              <div className="t-row t-paid"><span>Payment Made</span><span>(-) {fmtAmt(Number(invoice.amount_paid))}</span></div>
            )}
            <div className="t-row t-balance"><span>Balance Due</span><span>ZMW{fmtAmt(Number(invoice.outstanding_balance))}</span></div>
            {invoice.tot_note && <div className="tot-note">{invoice.tot_note}</div>}
          </div>
        </div>

        {invoice.notes && (
          <div className="footer-section">
            <h4>Notes</h4>
            <p>{invoice.notes}</p>
          </div>
        )}
        {invoice.terms_and_conditions && (
          <div className="footer-section">
            <h4>Terms &amp; Conditions</h4>
            <p>{invoice.terms_and_conditions}</p>
          </div>
        )}

        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 800); });` }} />
      </body>
    </html>
  )
}
