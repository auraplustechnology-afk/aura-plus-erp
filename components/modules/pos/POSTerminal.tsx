'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, PauseCircle, Loader2,
  Printer, RotateCcw, X, PackageX, ListPlus, Clock,
  Wallet, History, BarChart3, LogOut,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { completePOSSale, type POSCartLine } from '@/lib/actions/pos'
import { holdSale, listHeldSales, resumeHeldSale, cancelHeldSale } from '@/lib/actions/pos-holds'
import CustomerCombobox, { type CustomerOption } from '@/components/modules/customers/CustomerCombobox'
import BarcodeScanInput from '@/components/modules/pos/BarcodeScanInput'
import CashMovementModal from '@/components/modules/pos/CashMovementModal'
import ShiftCloseModal from '@/components/modules/pos/ShiftCloseModal'
import type { PaymentMethod, PosShift, PosHeldSale, ProductCategory, User, UserRole } from '@/types'

interface POSProduct {
  id: string
  sku: string
  product_name: string
  category_id: string | null
  selling_price: number
  quantity_in_stock: number
  unit_of_measure: string
  barcode: string | null
  image_url: string | null
}

interface CartLine {
  key: string
  product_id: string | null
  description: string
  unit_price: number
  quantity: number
  max_stock: number | null
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

const SUPERVISOR_ROLES: UserRole[] = ['super_admin', 'manager']

let keyCounter = 0
function nextKey() {
  keyCounter += 1
  return `line-${Date.now()}-${keyCounter}`
}

export default function POSTerminal({
  user,
  products,
  categories,
  customers,
  walkInCustomerId,
  shift,
}: {
  user: User
  products: POSProduct[]
  categories: Pick<ProductCategory, 'id' | 'name'>[]
  customers: CustomerOption[]
  walkInCustomerId: string
  shift: PosShift
}) {
  const canDiscount = SUPERVISOR_ROLES.includes(user.role)

  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [scanError, setScanError] = useState('')

  const [cart, setCart] = useState<CartLine[]>([])
  const [customerId, setCustomerId] = useState(walkInCustomerId)
  const [discountAmount, setDiscountAmount] = useState(0)

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [tendered, setTendered] = useState<number | ''>('')
  const [reference, setReference] = useState('')

  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [completedSale, setCompletedSale] = useState<{ invoiceId: string; total: number; change: number } | null>(null)

  const [heldSales, setHeldSales] = useState<PosHeldSale[]>([])
  const [showHeldPanel, setShowHeldPanel] = useState(false)
  const [holding, setHolding] = useState(false)

  const [customField, setCustomField] = useState({ description: '', price: 0 })
  const [showCustomField, setShowCustomField] = useState(false)

  const [showCashModal, setShowCashModal] = useState(false)
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false)

  async function refreshHeldSales() {
    const result = await listHeldSales(shift.id)
    if (result.data) setHeldSales(result.data)
  }

  useEffect(() => { refreshHeldSales() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false
      if (!q) return true
      return p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    })
  }, [products, categoryFilter, search])

  const subtotal = cart.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  const total = Math.max(subtotal - (discountAmount || 0), 0)
  const change = method === 'cash' && tendered !== '' ? Math.max(Number(tendered) - total, 0) : 0
  const tenderedShort = method === 'cash' && tendered !== '' && Number(tendered) < total

  function addToCart(product: POSProduct) {
    setError('')
    setCart(prev => {
      const existing = prev.find(l => l.product_id === product.id)
      if (existing) {
        if (existing.max_stock !== null && existing.quantity + 1 > existing.max_stock) return prev
        return prev.map(l => l.product_id === product.id ? { ...l, quantity: l.quantity + 1 } : l)
      }
      if (product.quantity_in_stock < 1) return prev
      return [...prev, {
        key: nextKey(),
        product_id: product.id,
        description: product.product_name,
        unit_price: product.selling_price,
        quantity: 1,
        max_stock: product.quantity_in_stock,
      }]
    })
  }

  function handleScan(code: string) {
    const lower = code.toLowerCase()
    const match = products.find(p => (p.barcode && p.barcode.toLowerCase() === lower) || p.sku.toLowerCase() === lower)
    if (!match) {
      setScanError(`No product found for "${code}"`)
      setTimeout(() => setScanError(''), 3000)
      return
    }
    if (match.quantity_in_stock < 1) {
      setScanError(`${match.product_name} is out of stock`)
      setTimeout(() => setScanError(''), 3000)
      return
    }
    addToCart(match)
  }

  function addCustomLine() {
    if (!customField.description.trim() || customField.price <= 0) return
    setCart(prev => [...prev, {
      key: nextKey(),
      product_id: null,
      description: customField.description.trim(),
      unit_price: customField.price,
      quantity: 1,
      max_stock: null,
    }])
    setCustomField({ description: '', price: 0 })
    setShowCustomField(false)
  }

  function updateQty(key: string, delta: number) {
    setCart(prev => prev.map(l => {
      if (l.key !== key) return l
      const next = l.quantity + delta
      if (next <= 0) return l
      if (l.max_stock !== null && next > l.max_stock) return l
      return { ...l, quantity: next }
    }))
  }

  function removeLine(key: string) {
    setCart(prev => prev.filter(l => l.key !== key))
  }

  function resetTill() {
    setCart([])
    setCustomerId(walkInCustomerId)
    setDiscountAmount(0)
    setMethod('cash')
    setTendered('')
    setReference('')
    setError('')
    setCompletedSale(null)
  }

  async function handleHold() {
    if (!cart.length) return
    setHolding(true)
    setError('')
    const result = await holdSale({
      shift_id: shift.id,
      customer_id: customerId || null,
      cart: { lines: cart, customer_id: customerId, discount_amount: discountAmount },
    })
    setHolding(false)
    if (result.error) { setError(result.error); return }
    resetTill()
    refreshHeldSales()
  }

  async function handleResumeHold(hold: PosHeldSale) {
    const result = await resumeHeldSale(hold.id)
    if (result.error) { setError(result.error); return }
    const snapshot = hold.cart as { lines: CartLine[]; customer_id: string; discount_amount: number }
    setCart(snapshot.lines ?? [])
    setCustomerId(snapshot.customer_id || walkInCustomerId)
    setDiscountAmount(snapshot.discount_amount ?? 0)
    setShowHeldPanel(false)
    refreshHeldSales()
  }

  async function handleCancelHold(holdId: string) {
    await cancelHeldSale(holdId)
    refreshHeldSales()
  }

  async function handleCompleteSale() {
    if (!cart.length) { setError('Cart is empty'); return }
    if (!customerId) { setError('Select a customer'); return }
    if (tenderedShort) { setError('Amount tendered is less than the total due'); return }

    setCompleting(true)
    setError('')

    const lines: POSCartLine[] = cart.map(l => ({
      line_type: l.product_id ? 'product' : 'service',
      product_id: l.product_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
    }))

    const result = await completePOSSale({
      customer_id: customerId,
      shift_id: shift.id,
      lines,
      discount_amount: canDiscount ? discountAmount : 0,
      payments: [{ method, amount: total, reference_number: reference || undefined }],
    })

    setCompleting(false)
    if (result.error) { setError(result.error); return }

    const invoiceId = result.data!.invoiceId
    setCompletedSale({ invoiceId, total, change })
    setCart([])
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Shift bar ────────────────────────────────────────── */}
      <div className="card px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">
          Shift opened <span className="font-medium text-[#0A1628] dark:text-white">{new Date(shift.opened_at).toLocaleTimeString()}</span>
          {' '}· Float <span className="font-medium text-[#0A1628] dark:text-white">{formatCurrency(shift.opening_float)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/pos/history" className="btn-secondary text-xs py-1.5 px-2.5"><History className="w-3.5 h-3.5" /> History</Link>
          {(user.role === 'super_admin' || user.role === 'manager') && (
            <Link href="/pos/reports" className="btn-secondary text-xs py-1.5 px-2.5"><BarChart3 className="w-3.5 h-3.5" /> Reports</Link>
          )}
          <Link href="/pos/shifts" className="btn-secondary text-xs py-1.5 px-2.5"><Clock className="w-3.5 h-3.5" /> Shifts</Link>
          <button onClick={() => setShowCashModal(true)} className="btn-secondary text-xs py-1.5 px-2.5"><Wallet className="w-3.5 h-3.5" /> Cash In/Out</button>
          <button onClick={() => setShowCloseShiftModal(true)} className="btn-secondary text-xs py-1.5 px-2.5 text-red-600 dark:text-red-400"><LogOut className="w-3.5 h-3.5" /> Close Shift</button>
        </div>
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 h-[calc(100vh-11rem)]">
      {/* ── Left: catalog ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" className="form-input pl-9"
              placeholder="Search products..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-72">
            <BarcodeScanInput onScan={handleScan} />
          </div>
          <button
            type="button" onClick={() => setShowHeldPanel(true)}
            className="btn-secondary relative"
          >
            <PauseCircle className="w-4 h-4" /> Held
            {heldSales.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#0066FF] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {heldSales.length}
              </span>
            )}
          </button>
        </div>

        {scanError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-2 flex items-center gap-2">
            <PackageX className="w-4 h-4" /> {scanError}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
              categoryFilter === 'all' ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
                categoryFilter === c.id ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="card flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(p => {
              const outOfStock = p.quantity_in_stock < 1
              return (
                <button
                  key={p.id}
                  disabled={outOfStock}
                  onClick={() => addToCart(p)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    outOfStock
                      ? 'border-[#E2E8F0] dark:border-[#1E2A3B] opacity-40 cursor-not-allowed'
                      : 'border-[#E2E8F0] dark:border-[#1E2A3B] hover:border-[#0066FF] hover:shadow-md'
                  }`}
                >
                  <div className="aspect-square rounded-lg bg-slate-50 dark:bg-[#1E2A3B] mb-2 flex items-center justify-center overflow-hidden">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                      : <ShoppingCart className="w-6 h-6 text-slate-300" />}
                  </div>
                  <div className="text-sm font-medium text-[#0A1628] dark:text-white line-clamp-2 leading-tight">{p.product_name}</div>
                  <div className="text-xs text-slate-400 mt-1">{p.sku}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-bold text-[#0066FF]">{formatCurrency(p.selling_price)}</span>
                    <span className={`text-[10px] font-medium ${outOfStock ? 'text-red-500' : p.quantity_in_stock <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {outOfStock ? 'Out of stock' : `${p.quantity_in_stock} left`}
                    </span>
                  </div>
                </button>
              )
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm">No products found</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: cart + payment ────────────────────────────── */}
      <div className="card flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <label className="form-label">Customer</label>
          <CustomerCombobox customers={customers} value={customerId} onChange={setCustomerId} required />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {cart.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Cart is empty — tap a product to add it
            </div>
          )}
          {cart.map(line => (
            <div key={line.key} className="flex items-center gap-2 py-2 border-b border-[#F0F0F0] dark:border-[#1E2A3B]/60 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#0A1628] dark:text-white truncate">{line.description}</div>
                <div className="text-xs text-slate-400">{formatCurrency(line.unit_price)} each</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(line.key, -1)} className="w-6 h-6 rounded-md border border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center justify-center text-slate-500 hover:border-[#0066FF]/40">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center text-sm font-semibold">{line.quantity}</span>
                <button onClick={() => updateQty(line.key, 1)} className="w-6 h-6 rounded-md border border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center justify-center text-slate-500 hover:border-[#0066FF]/40">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="w-20 text-right text-sm font-semibold text-[#0A1628] dark:text-white">{formatCurrency(line.unit_price * line.quantity)}</div>
              <button onClick={() => removeLine(line.key)} className="text-slate-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {showCustomField ? (
            <div className="flex items-center gap-2 pt-2">
              <input className="form-input text-sm py-1.5 flex-1" placeholder="Description"
                value={customField.description} onChange={e => setCustomField(p => ({ ...p, description: e.target.value }))} />
              <input type="number" min="0" step="0.01" className="form-input text-sm py-1.5 w-24" placeholder="Price"
                value={customField.price || ''} onChange={e => setCustomField(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
              <button onClick={addCustomLine} className="btn-primary text-xs py-1.5 px-2.5">Add</button>
              <button onClick={() => setShowCustomField(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => setShowCustomField(true)} className="flex items-center gap-1.5 text-xs text-[#0066FF] font-medium pt-1">
              <ListPlus className="w-3.5 h-3.5" /> Add custom item
            </button>
          )}
        </div>

        <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] px-4 py-3 space-y-3">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-xs rounded-lg px-3 py-2">{error}</div>}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Discount</span>
              <input
                type="number" min="0" step="0.01" disabled={!canDiscount}
                className="form-input w-24 text-right text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                value={discountAmount || ''} placeholder="0.00"
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                title={canDiscount ? undefined : 'Only managers or super admins can apply a discount'}
              />
            </div>
            <div className="flex justify-between font-bold text-base text-[#0A1628] dark:text-white pt-1 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.value} onClick={() => setMethod(m.value)}
                className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  method === m.value ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === 'cash' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">Tendered</label>
                <input type="number" min="0" step="0.01" className="form-input py-1.5"
                  value={tendered} onChange={e => setTendered(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="form-label">Change</label>
                <div className={`form-input py-1.5 flex items-center font-semibold ${change > 0 ? 'text-green-600' : ''}`}>
                  {formatCurrency(change)}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="form-label">Reference Number</label>
              <input className="form-input py-1.5" placeholder="Transaction / reference ID"
                value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleHold} disabled={!cart.length || holding} className="btn-secondary flex-1 justify-center">
              {holding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />} Hold
            </button>
            <button onClick={handleCompleteSale} disabled={!cart.length || completing} className="btn-primary flex-[2] justify-center">
              {completing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : `Complete Sale — ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Held sales panel ─────────────────────────────────── */}
      {showHeldPanel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowHeldPanel(false)}>
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h2 className="font-semibold text-[#0A1628] dark:text-white">Held Sales</h2>
              <button onClick={() => setShowHeldPanel(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {heldSales.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No held sales</div>}
              {heldSales.map(hold => {
                const snapshot = hold.cart as { lines: CartLine[] }
                const holdTotal = (snapshot.lines ?? []).reduce((s, l) => s + l.unit_price * l.quantity, 0)
                return (
                  <div key={hold.id} className="border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#0A1628] dark:text-white">{hold.hold_reference}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(hold.held_at).toLocaleTimeString()} · {(snapshot.lines ?? []).length} items · {formatCurrency(holdTotal)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleResumeHold(hold)} className="btn-primary text-xs py-1.5 px-2.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Resume
                      </button>
                      <button onClick={() => handleCancelHold(hold.id)} className="text-slate-300 hover:text-red-500 p-1.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Post-sale confirmation ───────────────────────────── */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✓</div>
            <h2 className="text-lg font-semibold text-[#0A1628] dark:text-white">Sale Complete</h2>
            <p className="text-2xl font-bold text-[#0066FF] mt-2">{formatCurrency(completedSale.total)}</p>
            {completedSale.change > 0 && (
              <p className="text-sm text-slate-500 mt-1">Change due: <span className="font-semibold text-[#0A1628] dark:text-white">{formatCurrency(completedSale.change)}</span></p>
            )}
            <div className="flex gap-2 mt-6">
              <a
                href={`/pos/${completedSale.invoiceId}/receipt`} target="_blank" rel="noopener noreferrer"
                className="btn-secondary flex-1 justify-center"
              >
                <Printer className="w-4 h-4" /> Receipt
              </a>
              <button onClick={resetTill} className="btn-primary flex-1 justify-center">New Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>

      {showCashModal && (
        <CashMovementModal
          shiftId={shift.id}
          onClose={() => setShowCashModal(false)}
          onDone={() => setShowCashModal(false)}
        />
      )}

      {showCloseShiftModal && (
        <ShiftCloseModal shiftId={shift.id} onClose={() => setShowCloseShiftModal(false)} />
      )}
    </div>
  )
}
