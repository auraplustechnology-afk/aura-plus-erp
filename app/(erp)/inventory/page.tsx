import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, TrendingDown, BarChart3 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import InventorySearchBar from '@/components/modules/inventory/InventorySearchBar'
import InventoryCategoryFilter from '@/components/modules/inventory/InventoryCategoryFilter'

export const metadata = { title: 'Inventory — Aura Plus ERP' }

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; stock?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const params = await searchParams
  const search = params.q ?? ''
  const categoryFilter = params.category ?? ''
  const stockFilter = params.stock ?? ''
  const page = parseInt(params.page ?? '1')
  const pageSize = 25

  let query = supabase
    .from('products')
    .select(`
      id, sku, product_name, cost_price, selling_price,
      quantity_in_stock, reorder_level, unit_of_measure, is_active,
      updated_at,
      category:category_id(id, name),
      supplier:supplier_id(id, company_name)
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('product_name')
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) query = query.ilike('product_name', `%${search}%`)
  if (categoryFilter) query = query.eq('category_id', categoryFilter)
  if (stockFilter === 'low') query = query.filter('quantity_in_stock', 'lte', 'reorder_level')
  if (stockFilter === 'out') query = query.eq('quantity_in_stock', 0)

  const { data: products, count } = await query

  const [categories, lowStockCount, totalValue, outOfStock] = await Promise.all([
    supabase.from('product_categories').select('id, name').order('name'),
    supabase.from('products').select('id', { count: 'exact' })
      .eq('is_active', true).filter('quantity_in_stock', 'lte', 'reorder_level').gt('reorder_level', 0),
    supabase.from('products').select('quantity_in_stock, cost_price').eq('is_active', true),
    supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true).eq('quantity_in_stock', 0),
  ])

  const stockValue = (totalValue.data ?? []).reduce((s, p) => s + (p.quantity_in_stock * p.cost_price), 0)
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{count ?? 0} products · Stock value: {formatCurrency(stockValue)}</p>
        </div>
        <Link href="/inventory/products/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-[#0066FF]" />
            <span className="stat-label">Total Products</span>
          </div>
          <div className="stat-value">{count ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="stat-label">Stock Value</span>
          </div>
          <div className="text-lg font-bold text-[#0A1628] dark:text-white">{formatCurrency(stockValue)}</div>
        </div>
        <div className={`stat-card ${(lowStockCount.count ?? 0) > 0 ? 'border-amber-200 dark:border-amber-900' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="stat-label">Low Stock</span>
          </div>
          <div className={`stat-value ${(lowStockCount.count ?? 0) > 0 ? 'text-amber-500' : ''}`}>
            {lowStockCount.count ?? 0}
          </div>
        </div>
        <div className={`stat-card ${(outOfStock.count ?? 0) > 0 ? 'border-red-200 dark:border-red-900' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="stat-label">Out of Stock</span>
          </div>
          <div className={`stat-value ${(outOfStock.count ?? 0) > 0 ? 'text-red-500' : ''}`}>
            {outOfStock.count ?? 0}
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <InventorySearchBar defaultValue={search} />
        <div className="flex gap-2">
          <InventoryCategoryFilter categories={categories.data ?? []} defaultValue={categoryFilter} />
          <div className="flex gap-1">
            {[
              { label: 'All', value: '' },
              { label: '⚠ Low', value: 'low' },
              { label: '✕ Out', value: 'out' },
            ].map(tab => (
              <Link
                key={tab.value}
                href={`/inventory?stock=${tab.value}${search ? `&q=${search}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  stockFilter === tab.value
                    ? 'bg-[#0066FF] border-[#0066FF] text-white'
                    : 'bg-white dark:bg-[#0F1C2E] border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/inventory/adjustments" className="btn-secondary text-sm self-start sm:ml-auto">
          Stock Adjustments
        </Link>
      </div>

      {/* Products table */}
      <div className="card overflow-hidden">
        {(products ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">No products found</h3>
            <p className="text-sm text-slate-400 mb-4">
              {search ? `No results for "${search}"` : 'Add your first product to get started.'}
            </p>
            {!search && (
              <Link href="/inventory/products/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Add Product
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="hidden sm:table-cell">SKU</th>
                  <th className="hidden md:table-cell">Category</th>
                  <th>In Stock</th>
                  <th className="hidden lg:table-cell">Cost Price</th>
                  <th>Selling Price</th>
                  <th className="hidden lg:table-cell">Supplier</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(products ?? []).map((product) => {
                  const isLow = product.quantity_in_stock <= product.reorder_level && product.reorder_level > 0
                  const isOut = product.quantity_in_stock === 0
                  const cat = product.category as { name: string } | null
                  const sup = product.supplier as { company_name: string } | null

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isOut ? 'bg-red-100 dark:bg-red-950/30' :
                            isLow ? 'bg-amber-100 dark:bg-amber-950/30' :
                            'bg-[#0066FF]/10'
                          }`}>
                            <Package className={`w-4 h-4 ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[#0066FF]'}`} />
                          </div>
                          <div>
                            <Link href={`/inventory/products/${product.id}`} className="font-medium text-sm text-[#0A1628] dark:text-white hover:text-[#0066FF] transition-colors">
                              {product.product_name}
                            </Link>
                            {isOut && <div className="text-xs text-red-500 font-medium">Out of stock</div>}
                            {isLow && !isOut && <div className="text-xs text-amber-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low stock</div>}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell font-mono text-xs text-slate-500">{product.sku}</td>
                      <td className="hidden md:table-cell">
                        {cat ? <span className="badge badge-default text-xs">{cat.name}</span> : '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[#0A1628] dark:text-white'}`}>
                            {product.quantity_in_stock}
                          </span>
                          <span className="text-xs text-slate-400">{product.unit_of_measure}</span>
                        </div>
                        {isLow && !isOut && (
                          <div className="text-xs text-slate-400">Min: {product.reorder_level}</div>
                        )}
                      </td>
                      <td className="hidden lg:table-cell text-sm text-slate-500">{formatCurrency(product.cost_price)}</td>
                      <td className="font-semibold text-sm text-[#0A1628] dark:text-white">{formatCurrency(product.selling_price)}</td>
                      <td className="hidden lg:table-cell text-sm text-slate-400 truncate max-w-[120px]">{sup?.company_name ?? '—'}</td>
                      <td>
                        <Link href={`/inventory/products/${product.id}`} className="text-xs text-[#0066FF] hover:underline font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                <p className="text-sm text-slate-400">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, count ?? 0)} of {count}
                </p>
                <div className="flex gap-2">
                  {page > 1 && <Link href={`/inventory?page=${page - 1}${search ? `&q=${search}` : ''}`} className="btn-secondary text-xs py-1.5 px-3">← Prev</Link>}
                  {page < totalPages && <Link href={`/inventory?page=${page + 1}${search ? `&q=${search}` : ''}`} className="btn-primary text-xs py-1.5 px-3">Next →</Link>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
