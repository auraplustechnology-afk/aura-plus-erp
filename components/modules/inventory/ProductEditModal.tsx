'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, X, Loader2 } from 'lucide-react'
import { updateProduct } from '@/lib/actions/inventory'

export default function ProductEditModal({ product, categories, suppliers }: {
  product: {
    id: string; sku: string; product_name: string; category_id: string | null;
    supplier_id: string | null; cost_price: number; selling_price: number;
    reorder_level: number; unit_of_measure: string; description: string | null; is_active: boolean
  }
  categories: { id: string; name: string }[]
  suppliers: { id: string; company_name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    sku: product.sku, product_name: product.product_name,
    category_id: product.category_id ?? '', supplier_id: product.supplier_id ?? '',
    cost_price: product.cost_price, selling_price: product.selling_price,
    reorder_level: product.reorder_level, unit_of_measure: product.unit_of_measure,
    description: product.description ?? '', is_active: product.is_active,
  })

  function set(key: string, value: string | number | boolean) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const result = await updateProduct(product.id, {
      ...form,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      description: form.description || null,
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary"><Edit2 className="w-4 h-4" /> Edit</button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B] sticky top-0 bg-white dark:bg-[#0F1C2E]">
              <h2 className="font-semibold text-[#0A1628] dark:text-white">Edit Product</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">SKU</label><input className="form-input font-mono" value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} required /></div>
                <div><label className="form-label">Unit</label>
                  <select className="form-input" value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)}>
                    {['unit','piece','set','box','roll','metre','kg','litre'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="form-label">Product Name</label><input className="form-input" value={form.product_name} onChange={e => set('product_name', e.target.value)} required /></div>
                <div><label className="form-label">Category</label>
                  <select className="form-input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Supplier</label>
                  <select className="form-input" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                    <option value="">None</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Cost Price</label><input type="number" min="0" step="0.01" className="form-input" value={form.cost_price} onChange={e => set('cost_price', parseFloat(e.target.value)||0)} /></div>
                <div><label className="form-label">Selling Price</label><input type="number" min="0" step="0.01" className="form-input" value={form.selling_price} onChange={e => set('selling_price', parseFloat(e.target.value)||0)} /></div>
                <div><label className="form-label">Reorder Level</label><input type="number" min="0" className="form-input" value={form.reorder_level} onChange={e => set('reorder_level', parseInt(e.target.value)||0)} /></div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-[#0066FF] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">Active</span>
                  </label>
                </div>
                <div className="col-span-2"><label className="form-label">Description</label><textarea className="form-input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
