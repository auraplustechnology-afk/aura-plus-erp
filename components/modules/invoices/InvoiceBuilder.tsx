'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, GripVertical, Search, Loader2,
  Save, ArrowLeft, X, Package, Calendar
} from 'lucide-react'
import { createInvoice, updateInvoice } from '@/lib/actions/invoices'
import { formatCurrency } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import CustomerCombobox from '@/components/modules/customers/CustomerCombobox'
import type { Invoice, InvoiceLine, Product, Customer, User } from '@/types'

interface LineItem {
  id: string
  line_type: 'product' | 'service' | 'labour' | 'installation'
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

interface InvoiceBuilderProps {
  mode: 'new' | 'edit'
  invoice?: Invoice
  customers: Pick<Customer, 'id' | 'company_name' | 'contact_person' | 'email' | 'phone' | 'physical_address'>[]
  defaultTerms: string
  defaultNotes: string
  preselectedCustomerId?: string
  invoiceType?: 'standard' | 'proforma'
}

const LINE_TYPES = [
  { value: 'product',      label: 'Product' },
  { value: 'service',      label: 'Service' },
  { value: 'labour',       label: 'Labour' },
  { value: 'installation', label: 'Installation' },
]

const PAYMENT_TERMS_OPTIONS = [
  'Due on Receipt',
  'Net 7',
  'Net 14',
  'Net 30',
  'Net 60',
  '50% Advance, 50% on Delivery',
]

function makeId() { return Math.random().toString(36).slice(2) }

function makeBlankLine(order: number): LineItem {
  return {
    id: makeId(), line_type: 'product', product_id: null,
    description: '', quantity: 1, unit_price: 0, line_total: 0, sort_order: order,
  }
}

export default function InvoiceBuilder({
  mode, invoice, customers, defaultTerms, defaultNotes, preselectedCustomerId, invoiceType
}: InvoiceBuilderProps) {
  const router = useRouter()
  const supabase = createClient()

  const [customerId, setCustomerId] = useState(invoice?.customer_id ?? preselectedCustomerId ?? '')
  const [type, setType] = useState<'standard' | 'proforma'>(invoice?.invoice_type ?? invoiceType ?? 'standard')
  const [discountAmount, setDiscountAmount] = useState(invoice?.discount_amount ?? 0)
  const [totNote, setTotNote] = useState(invoice?.tot_note ?? 'Subject to TOT')
  const [notes, setNotes] = useState(invoice?.notes ?? defaultNotes)
  const [terms, setTerms] = useState(invoice?.terms_and_conditions ?? defaultTerms)
  const [paymentTerms, setPaymentTerms] = useState(invoice?.payment_terms ?? 'Due on Receipt')
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '')
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (invoice?.lines && invoice.lines.length > 0) {
      return invoice.lines.map(l => ({
        id: makeId(), line_type: l.line_type, product_id: l.product_id,
        description: l.description, quantity: l.quantity,
        unit_price: l.unit_price, line_total: l.line_total, sort_order: l.sort_order,
      }))
    }
    return [makeBlankLine(0)]
  })

  const [productSearchIndex, setProductSearchIndex] = useState<number | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Totals
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0)
  const total = subtotal - discountAmount

  // Product search
  useEffect(() => {
    if (productSearchIndex === null || productQuery.length < 1) { setProductResults([]); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      const { data } = await supabase.from('products')
        .select('id, sku, product_name, selling_price, quantity_in_stock')
        .or(`product_name.ilike.%${productQuery}%,sku.ilike.%${productQuery}%`)
        .eq('is_active', true).limit(8)
      setProductResults(data ?? [])
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [productQuery, productSearchIndex])

  function selectProduct(i: number, product: Product) {
    updateLine(i, {
      product_id: product.id,
      description: product.product_name,
      unit_price: product.selling_price,
      line_total: lines[i].quantity * product.selling_price,
    })
    setProductSearchIndex(null)
    setProductQuery('')
    setProductResults([])
  }

  function addLine() { setLines(p => [...p, makeBlankLine(p.length)]) }
  function removeLine(i: number) { setLines(p => p.filter((_, idx) => idx !== i)) }

  function updateLine(index: number, changes: Partial<LineItem>) {
    setLines(prev => prev.map((line, i) => {
      if (i !== index) return line
      const u = { ...line, ...changes }
      if ('quantity' in changes || 'unit_price' in changes) {
        u.line_total = (('quantity' in changes ? changes.quantity : line.quantity) ?? 0) *
                       (('unit_price' in changes ? changes.unit_price : line.unit_price) ?? 0)
      }
      return u
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) { setError('Please select a customer'); return }
    if (lines.some(l => !l.description.trim())) { setError('All line items need a description'); return }

    setSaving(true)
    setError('')

    const payload = {
      customer_id: customerId,
      invoice_type: type,
      discount_amount: discountAmount,
      tot_note: totNote,
      notes,
      terms_and_conditions: terms,
      payment_terms: paymentTerms,
      due_date: dueDate || null,
      lines: lines.map((l, i) => ({ ...l, sort_order: i })),
    }

    const result = mode === 'new'
      ? await createInvoice(payload)
      : await updateInvoice(invoice!.id, payload)

    if (result.error) { setError(result.error); setSaving(false); return }
    router.push(`/invoices/${result.data?.id ?? invoice?.id}`)
  }

  const selectedCustomer = customers.find(c => c.id === customerId)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="page-title">{mode === 'new' ? 'New Invoice' : `Edit ${invoice?.invoice_number}`}</h1>
        <p className="page-subtitle">{mode === 'new' ? 'Create a professional invoice' : 'Update this invoice'}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Customer + Meta */}
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="form-label">Customer <span className="text-red-500">*</span></label>
            <CustomerCombobox customers={customers} value={customerId} onChange={setCustomerId} required />
            {selectedCustomer && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-[#1E2A3B] rounded-lg text-xs text-slate-500 space-y-0.5">
                {selectedCustomer.contact_person && <div><strong>Contact:</strong> {selectedCustomer.contact_person}</div>}
                {selectedCustomer.phone && <div><strong>Phone:</strong> {selectedCustomer.phone}</div>}
                {selectedCustomer.email && <div><strong>Email:</strong> {selectedCustomer.email}</div>}
                {selectedCustomer.physical_address && <div><strong>Address:</strong> {selectedCustomer.physical_address}</div>}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Invoice Type</label>
            <select className="form-input" value={type} onChange={e => setType(e.target.value as 'standard' | 'proforma')}>
              <option value="standard">Standard Invoice</option>
              <option value="proforma">Proforma Invoice</option>
            </select>
          </div>

          <div>
            <label className="form-label">Payment Terms</label>
            <select className="form-input" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
              {PAYMENT_TERMS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Due Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                className="form-input pl-9"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Discount Amount (ZMW)</label>
            <input
              type="number" min="0" step="0.01"
              className="form-input"
              value={discountAmount}
              onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="form-label">TOT Note</label>
            <input className="form-input" value={totNote} onChange={e => setTotNote(e.target.value)} />
          </div>
        </div>

        {/* Line Items */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Line Items</h2>
            <button type="button" onClick={addLine} className="btn-secondary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          {/* Table header - desktop */}
          <div className="hidden md:grid grid-cols-[32px_120px_1fr_90px_110px_100px_36px] gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#0A0F1A] border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <div />
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Qty</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Unit Price</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Total</div>
            <div />
          </div>

          <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
            {lines.map((line, index) => (
              <div key={line.id}>
                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-[32px_120px_1fr_90px_110px_100px_36px] gap-2 px-4 py-3 items-start">
                  <div className="flex items-center justify-center h-9 text-slate-300 cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <select
                    className="form-input text-xs py-2"
                    value={line.line_type}
                    onChange={e => updateLine(index, { line_type: e.target.value as LineItem['line_type'], product_id: null })}
                  >
                    {LINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>

                  {/* Description + product search */}
                  <div className="relative">
                    <div className="flex gap-1">
                      <input
                        className="form-input text-sm flex-1"
                        value={line.description}
                        onChange={e => updateLine(index, { description: e.target.value })}
                        placeholder={line.line_type === 'product' ? 'Product name...' : 'Description...'}
                        required
                      />
                      {line.line_type === 'product' && (
                        <button
                          type="button"
                          onClick={() => { setProductSearchIndex(productSearchIndex === index ? null : index); setProductQuery(''); setProductResults([]) }}
                          className={`px-2 rounded-lg border transition-colors ${productSearchIndex === index ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-400 hover:text-[#0066FF] hover:border-[#0066FF]'}`}
                          title="Search inventory"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {productSearchIndex === index && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-lg shadow-xl z-30">
                        <div className="p-2 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input autoFocus className="form-input pl-8 text-sm py-1.5" placeholder="Search by name or SKU..." value={productQuery} onChange={e => setProductQuery(e.target.value)} />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {searchLoading && <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" /></div>}
                          {!searchLoading && productResults.length === 0 && productQuery.length > 0 && <div className="px-4 py-3 text-sm text-slate-400">No products found</div>}
                          {!searchLoading && productQuery.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">Type to search inventory...</div>}
                          {productResults.map(p => (
                            <button key={p.id} type="button" onClick={() => selectProduct(index, p)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1E2A3B] transition-colors text-left">
                              <div>
                                <div className="text-sm font-medium text-[#0A1628] dark:text-white">{p.product_name}</div>
                                <div className="text-xs text-slate-400">{p.sku} · Stock: {p.quantity_in_stock}</div>
                              </div>
                              <span className="text-sm font-semibold text-[#0066FF] ml-4 flex-shrink-0">{formatCurrency(p.selling_price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <input type="number" min="0" step="0.01" className="form-input text-sm text-right" value={line.quantity}
                    onChange={e => updateLine(index, { quantity: parseFloat(e.target.value) || 0 })} />

                  <input type="number" min="0" step="0.01" className="form-input text-sm text-right" value={line.unit_price}
                    onChange={e => updateLine(index, { unit_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />

                  <div className="flex items-center justify-end h-9">
                    <span className="text-sm font-semibold text-[#0A1628] dark:text-white">{formatCurrency(line.line_total)}</span>
                  </div>

                  <button type="button" onClick={() => removeLine(index)} disabled={lines.length === 1}
                    className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-slate-400">Line {index + 1}</span>
                    <button type="button" onClick={() => removeLine(index)} disabled={lines.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <select className="form-input text-sm" value={line.line_type} onChange={e => updateLine(index, { line_type: e.target.value as LineItem['line_type'] })}>
                    {LINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input className="form-input text-sm" value={line.description} onChange={e => updateLine(index, { description: e.target.value })} placeholder="Description..." required />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="form-label text-xs">Qty</label><input type="number" className="form-input text-sm" value={line.quantity} onChange={e => updateLine(index, { quantity: parseFloat(e.target.value) || 0 })} /></div>
                    <div><label className="form-label text-xs">Unit Price</label><input type="number" className="form-input text-sm" value={line.unit_price} onChange={e => updateLine(index, { unit_price: parseFloat(e.target.value) || 0 })} /></div>
                  </div>
                  <div className="text-right text-sm font-semibold text-[#0066FF]">{formatCurrency(line.line_total)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
            <button type="button" onClick={addLine} className="text-sm text-[#0066FF] hover:text-[#0052CC] font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] px-5 py-4">
            <div className="ml-auto max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sub Total</span>
                <span className="font-medium text-[#0A1628] dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <span className="font-bold text-[#0A1628] dark:text-white">Total</span>
                <span className="font-bold text-lg text-[#0A1628] dark:text-white">{formatCurrency(total)}</span>
              </div>
              {totNote && <div className="text-xs text-slate-400 text-right">{totNote}</div>}
            </div>
          </div>
        </div>

        {/* Notes + Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5">
            <label className="form-label">Notes</label>
            <textarea className="form-input resize-none" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes visible to the customer..." />
          </div>
          <div className="card p-5">
            <label className="form-label">Terms & Conditions</label>
            <textarea className="form-input resize-none" rows={4} value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms, bank details..." />
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 bg-white dark:bg-[#0A0F1A] border-t border-[#E2E8F0] dark:border-[#1E2A3B] -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            Total: <span className="font-bold text-[#0A1628] dark:text-white text-base">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {mode === 'new' ? 'Create Invoice' : 'Save Changes'}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
