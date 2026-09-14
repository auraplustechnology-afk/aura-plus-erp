'use client'

import { useMemo, useState } from 'react'
import { X, Search, Link2, PackagePlus, Loader2 } from 'lucide-react'
import { linkBarcodeToProduct } from '@/lib/actions/inventory'
import { formatCurrency } from '@/lib/utils/format'

interface LinkableProduct {
  id: string
  sku: string
  product_name: string
  selling_price: number
  barcode: string | null
}

export default function UnmatchedBarcodeModal({
  code, products, onClose, onLinked,
}: {
  code: string
  products: LinkableProduct[]
  onClose: () => void
  onLinked: (productId: string, barcode: string) => void
}) {
  const [query, setQuery] = useState('')
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? products.filter(p => p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      : products
    return list.slice(0, 8)
  }, [products, query])

  async function handleLink(product: LinkableProduct) {
    setLinkingId(product.id)
    setError('')
    const result = await linkBarcodeToProduct(product.id, code)
    setLinkingId(null)
    if (result.error) { setError(result.error); return }
    onLinked(product.id, code)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <div>
            <h2 className="font-semibold text-[#0A1628] dark:text-white">Unrecognized Code</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{code}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B] space-y-3">
          <p className="text-sm text-slate-500">
            This code isn&apos;t saved against any product yet. Link it to an existing product so the next scan
            finds it instantly, or add it as a brand new product.
          </p>
          <a
            href={`/inventory/products/new?barcode=${encodeURIComponent(code)}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-primary w-full justify-center"
          >
            <PackagePlus className="w-4 h-4" /> Add as New Product
          </a>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus className="form-input pl-9"
              placeholder="Or search a product to link this code to..."
              value={query} onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => handleLink(p)}
              disabled={linkingId !== null}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2A3B] hover:border-[#0066FF] text-left disabled:opacity-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#0A1628] dark:text-white truncate">{p.product_name}</div>
                <div className="text-xs text-slate-400">
                  {p.sku} · {formatCurrency(p.selling_price)}
                  {p.barcode && <span className="text-amber-500"> · already linked to {p.barcode}</span>}
                </div>
              </div>
              {linkingId === p.id
                ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-[#0066FF]" />
                : <Link2 className="w-4 h-4 text-slate-300 flex-shrink-0" />}
            </button>
          ))}
          {results.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No products match</div>}
        </div>
      </div>
    </div>
  )
}
