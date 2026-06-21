import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoicePDFDocument from '@/components/pdf/InvoicePDFDocument'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase.from('invoices').select('*, customer:customer_id(*), lines:invoice_lines(*)')
      .eq('id', id).is('deleted_at', null).single(),
    supabase.from('system_settings').select('key, value'),
  ])

  if (!invoiceRes.data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const invoice = invoiceRes.data
  const lines = [...(invoice.lines ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )
  // Supabase may return joined relations as an array — normalize to a single object
  const rawCustomer = invoice.customer
  const customer = (Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer) as Record<string, string> | null

  const settings: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settings[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  try {
    const pdfBuffer = await renderToBuffer(
      InvoicePDFDocument({ invoice, lines, customer, settings })
    )

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[Invoice PDF] Generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
