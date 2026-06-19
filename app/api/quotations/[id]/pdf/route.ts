import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import QuotePDFDocument from '@/components/pdf/QuotePDFDocument'

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

  const [quoteRes, settingsRes] = await Promise.all([
    supabase.from('quotations')
      .select('*, customer:customer_id(*), lines:quotation_lines(*)')
      .eq('id', id).is('deleted_at', null).single(),
    supabase.from('system_settings').select('key, value'),
  ])

  if (!quoteRes.data) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const quote = quoteRes.data
  const lines = [...(quote.lines ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )
  const customer = quote.customer as Record<string, string> | null

  const settings: Record<string, string> = {}
  settingsRes.data?.forEach(s => {
    settings[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value ?? '')
  })

  try {
    const pdfBuffer = await renderToBuffer(
      QuotePDFDocument({ quote, lines, customer, settings })
    )

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quote_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[Quote PDF] Generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
