import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#EEF0F3', fg: '#4B5563' },
  sent: { bg: '#E6F0FF', fg: '#0066FF' },
  accepted: { bg: '#E6F9EF', fg: '#16A34A' },
  rejected: { bg: '#FDECEC', fg: '#DC2626' },
  expired: { bg: '#EEF0F3', fg: '#4B5563' },
}

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  accentBar: { height: 8, backgroundColor: '#0066FF' },
  body: { padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logoBox: { width: 140, height: 80, backgroundColor: '#EBF2FF', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  logoPlaceholder: { color: '#0066FF', fontSize: 20, fontWeight: 700 },
  logoImg: { width: 120, height: 64, objectFit: 'contain' },
  companyInfo: { fontSize: 9, color: '#555', lineHeight: 1.5 },
  companyName: { fontSize: 10, fontWeight: 700, color: '#0A1628', marginBottom: 3 },
  docTitleBox: { alignItems: 'flex-end' },
  docTitle: { fontSize: 30, fontWeight: 700, color: '#0A1628' },
  docNum: { fontSize: 10, color: '#666', marginTop: 2 },
  statusBadge: { marginTop: 8, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, fontSize: 8, fontWeight: 700 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  billLabel: { fontSize: 9, color: '#888', marginBottom: 2 },
  billName: { fontSize: 12, fontWeight: 700, color: '#0A1628', marginBottom: 1 },
  billLine: { fontSize: 9, color: '#555', marginBottom: 1 },
  metaCol: { alignItems: 'flex-end' },
  metaLine: { fontSize: 9, color: '#555', marginBottom: 3 },
  metaValue: { fontWeight: 700, color: '#0A1628' },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0A1628', paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderCell: { color: '#fff', fontSize: 9, fontWeight: 700 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  cellNum: { width: 24, fontSize: 9, color: '#999' },
  cellDesc: { flex: 1, fontSize: 9, color: '#0A1628' },
  cellSub: { fontSize: 8, color: '#888' },
  cellQty: { width: 50, fontSize: 9, textAlign: 'right', color: '#333' },
  cellRate: { width: 80, fontSize: 9, textAlign: 'right', color: '#333' },
  cellAmt: { width: 80, fontSize: 9, textAlign: 'right', color: '#0A1628', fontWeight: 700 },
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 24 },
  totalsBox: { width: 220 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 9, color: '#555' },
  totalsValue: { fontSize: 9, color: '#333' },
  totalsBoxBorder: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, padding: 10 },
  totalFinal: { backgroundColor: '#0A1628', padding: 8, borderRadius: 4, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  totalFinalText: { fontWeight: 700, fontSize: 11, color: '#ffffff' },
  totNote: { fontSize: 8, color: '#999', textAlign: 'right', marginTop: 4 },
  footerSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  footerTitle: { fontSize: 10, fontWeight: 700, color: '#0A1628', marginBottom: 4 },
  footerText: { fontSize: 9, color: '#555', lineHeight: 1.5 },
  validUntil: { fontSize: 8, color: '#888', marginTop: 4 },
  expiredFlag: { color: '#DC2626', fontWeight: 700 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 48 },
  signatureBox: { width: '45%', borderTopWidth: 1, borderTopColor: '#999', paddingTop: 6 },
  signatureText: { fontSize: 8, color: '#888' },
  thanks: { textAlign: 'center', marginTop: 28, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', borderStyle: 'dashed', fontSize: 10, fontWeight: 700, color: '#0066FF' },
})

interface QuoteLine {
  id: string
  description: string
  line_type: string
  quantity: number
  unit_price: number
  line_total: number
  discount_percent: number
}

interface QuotePDFProps {
  quote: {
    quote_number: string
    status: string
    created_at: string
    valid_until: string | null
    subtotal: number
    discount_amount: number
    discount_percent: number
    total: number
    tot_note: string | null
    notes: string | null
    terms_and_conditions: string | null
  }
  lines: QuoteLine[]
  customer: {
    company_name?: string
    contact_person?: string
    phone?: string
    email?: string
    physical_address?: string
  } | null
  settings: Record<string, string>
}

const fmtAmt = (n: number) => Number(n ?? 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string | null) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function QuotePDFDocument({ quote, lines, customer, settings }: QuotePDFProps) {
  const hasLogo = settings.company_logo_url && settings.company_logo_url !== 'null' && settings.company_logo_url !== ''

  const isExpired = !!quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status === 'sent'
  const effectiveStatus = isExpired ? 'expired' : quote.status
  const statusLabel = effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)
  const statusStyle = STATUS_STYLES[effectiveStatus] ?? STATUS_STYLES.draft

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.logoBox}>
              {hasLogo ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={settings.company_logo_url} style={styles.logoImg} />
              ) : (
                <Text style={styles.logoPlaceholder}>A+</Text>
              )}
            </View>
            <Text style={styles.companyName}>{settings.company_name || 'AURA PLUS TECHNOLOGIES'}</Text>
            <View style={styles.companyInfo}>
              {settings.company_address && <Text>{settings.company_address}</Text>}
              {settings.company_tpin && <Text>TPIN-{settings.company_tpin}</Text>}
              {settings.company_phone && <Text>{settings.company_phone}</Text>}
              {settings.company_email && <Text>{settings.company_email}</Text>}
              {settings.company_website && <Text>{settings.company_website}</Text>}
            </View>
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>QUOTE</Text>
            <Text style={styles.docNum}># {quote.quote_number}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: statusStyle.bg, color: statusStyle.fg }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Bill to + date */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.billLabel}>Bill To</Text>
            <Text style={styles.billName}>{customer?.company_name}</Text>
            {customer?.contact_person && <Text style={styles.billLine}>{customer.contact_person}</Text>}
            {customer?.phone && <Text style={styles.billLine}>{customer.phone}</Text>}
            {customer?.email && <Text style={styles.billLine}>{customer.email}</Text>}
            {customer?.physical_address && <Text style={styles.billLine}>{customer.physical_address}</Text>}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLine}>Quote Date: {fmtDate(quote.created_at)}</Text>
            {quote.valid_until && (
              <Text style={isExpired ? [styles.validUntil, styles.expiredFlag] : styles.validUntil}>Valid Until {fmtDate(quote.valid_until)}</Text>
            )}
          </View>
        </View>

        {/* Lines table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: 24 }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Item & Description</Text>
            <Text style={[styles.tableHeaderCell, { width: 50, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: 80, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { width: 80, textAlign: 'right' }]}>Amount</Text>
          </View>
          {lines.map((line, i) => (
            <View key={line.id} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={styles.cellNum}>{i + 1}</Text>
              <View style={styles.cellDesc}>
                <Text>{line.description}</Text>
                {line.line_type !== 'product' && <Text style={styles.cellSub}>{line.line_type}</Text>}
                {line.discount_percent > 0 && <Text style={styles.cellSub}>{line.discount_percent}% discount applied</Text>}
              </View>
              <Text style={styles.cellQty}>{Number(line.quantity).toFixed(2)}</Text>
              <Text style={styles.cellRate}>{fmtAmt(line.unit_price)}</Text>
              <Text style={styles.cellAmt}>{fmtAmt(line.line_total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={[styles.totalsBox, styles.totalsBoxBorder]}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sub Total</Text>
              <Text style={styles.totalsValue}>{fmtAmt(quote.subtotal)}</Text>
            </View>
            {quote.discount_amount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount ({quote.discount_percent}%)</Text>
                <Text style={[styles.totalsValue, { color: '#dc2626' }]}>-{fmtAmt(quote.discount_amount)}</Text>
              </View>
            )}
            <View style={styles.totalFinal}>
              <Text style={styles.totalFinalText}>Total</Text>
              <Text style={styles.totalFinalText}>ZMW{fmtAmt(quote.total)}</Text>
            </View>
            {quote.tot_note && <Text style={styles.totNote}>{quote.tot_note}</Text>}
          </View>
        </View>

        {/* Notes + Terms */}
        {quote.notes && (
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Notes</Text>
            <Text style={styles.footerText}>{quote.notes}</Text>
          </View>
        )}
        {quote.terms_and_conditions && (
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Terms & Conditions</Text>
            <Text style={styles.footerText}>{quote.terms_and_conditions}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Authorized Signature — {settings.company_name || 'AURA PLUS TECHNOLOGIES'}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Customer Acceptance & Date</Text>
          </View>
        </View>

        <Text style={styles.thanks}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  )
}
