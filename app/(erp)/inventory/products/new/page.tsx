'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Package } from 'lucide-react'
import { createProduct, createCategory, createSupplier } from '@/lib/actions/inventory'
import { createClient } from '@/lib/supabase/client'

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; company_name: string }[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [form, setForm] = useState({
    sku: '', product_name: '', category_id: '', supplier_id: '',
    cost_price: 0, selling_price: 0, quantity_in_stock: 0,
    reorder_level: 5, unit_of_measure: 'unit', description: '',
  })

  useEffect(() => {
    async function load() {
      const [cats, sups] = await Promise.all([
        supabase.from('product_categories').select('id, name').order('name'),
        supabase.from('suppliers').select('id, company_name').order('company_name'),
      ])
      setCategories(cats.data ?? [])
      setSuppliers(sups.data ?? [])
    }
    load()
  }, [])

  function set(key: string, value: string | number) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return
    const result = await createCategory(newCategory.trim())
    if (result.data) {
      setCategories(p => [...p, result.data!])
      setForm(p => ({ ...p, category_id: result.data!.id }))
      setNewCategory('')
      setShowNewCategory(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.sku.trim()) { setError('SKU is required'); return }
    if (!form.product_name.trim()) { setError('Product name is required'); return }
    setLoading(true)
    setError('')

    const result = await createProduct({
      ...form,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      description: form.description || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/inventory/products/${result.data?.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </Link>
        <h1 className="page-title">Add Product</h1>
        <p className="page-subtitle">Add a new product to your inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0066FF]" /> Product Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">SKU <span className="text-red-500">*</span></label>
              <input className="form-input font-mono" value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="e.g. TM-20" required />
            </div>
            <div>
              <label className="form-label">Unit of Measure</label>
              <select className="form-input" value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)}>
                {['unit', 'piece', 'set', 'box', 'roll', 'metre', 'kg', 'litre'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Product Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.product_name} onChange={e => set('product_name', e.target.value)} placeholder="e.g. AI Face Time Attendance Machine" required />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Description</label>
              <textarea className="form-input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description..." />
            </div>
          </div>
        </div>

        {/* Category + Supplier */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Category & Supplier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category</label>
              <div className="flex gap-2">
                <select className="form-input flex-1" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewCategory(!showNewCategory)} className="btn-secondary px-2.5 text-xs">+ New</button>
              </div>
              {showNewCategory && (
                <div className="flex gap-2 mt-2">
                  <input className="form-input flex-1 text-sm" placeholder="Category name..." value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                  <button type="button" onClick={handleAddCategory} className="btn-primary text-xs px-3">Add</button>
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Supplier</label>
              <select className="form-input" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                <option value="">No supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cost Price (ZMW)</label>
              <input type="number" min="0" step="0.01" className="form-input" value={form.cost_price} onChange={e => set('cost_price', parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">Selling Price (ZMW) <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" className="form-input" value={form.selling_price} onChange={e => set('selling_price', parseFloat(e.target.value) || 0)} placeholder="0.00" required />
            </div>
            {form.cost_price > 0 && form.selling_price > 0 && (
              <div className="sm:col-span-2 text-xs text-slate-500 bg-slate-50 dark:bg-[#1E2A3B] rounded-lg px-3 py-2">
                Margin: {(((form.selling_price - form.cost_price) / form.selling_price) * 100).toFixed(1)}% · 
                Markup: ZMW{(form.selling_price - form.cost_price).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Stock levels */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Stock Levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Opening Stock Quantity</label>
              <input type="number" min="0" step="0.01" className="form-input" value={form.quantity_in_stock} onChange={e => set('quantity_in_stock', parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-slate-400 mt-1">This will be recorded as initial stock entry</p>
            </div>
            <div>
              <label className="form-label">Reorder Level</label>
              <input type="number" min="0" step="1" className="form-input" value={form.reorder_level} onChange={e => set('reorder_level', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-slate-400 mt-1">Alert when stock falls at or below this</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/inventory" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Package className="w-4 h-4" /> Add Product</>}
          </button>
        </div>
      </form>
    </div>
  )
}
