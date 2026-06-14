import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate, formatLabel } from '@/lib/utils/format'
import StockAdjustmentModal from '@/components/modules/inventory/StockAdjustmentModal'
import ProductEditModal from '@/components/modules/inventory/ProductEditModal'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('product_name').eq('id', id).single()
  return { title: `${data?.product_name ?? 'Product'} — Aura Plus ERP` }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [productRes, adjustmentsRes, categoriesRes, suppliersRes] = await Promise.all([
    supabase.from('products').select(`
      *, category:category_id(id, name), supplier:supplier_id(id, company_name)
    `).eq('id', id).single(),
    supabase.from('stock_adjustments').select(`
      *, adjusted_by_user:adjusted_by(full_name)
    `).eq('product_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('product_categories').select('id, name').order('name'),
    supabase.from('suppliers').select('id, company_name').order('company_name'),
  ])

  if (!productRes.data) notFound()
  const product = productRes.data
  const adjustments = adjustmentsRes.data ?? []
  const isLow = product.quantity_in_stock <= product.reorder_level && product.reorder_level > 0
  const isOut = product.quantity_in_stock === 0
  const cat = product.category as { name: string } | null
  const sup = product.supplier as { company_name: string } | null

  const ADJUSTMENT_COLORS: Record<string, string> = {
    in: 'text-green-600', out: 'text-red-500',
    correction: 'text-blue-500', sale: 'text-red-500',
    write_off: 'text-red-500', project_use: 'text-orange-500',
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Inventory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-red-100 dark:bg-red-950/30' : isLow ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-[#0066FF]/10'}`}>
              <Package className={`w-7 h-7 ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[#0066FF]'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white">{product.product_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-[#1E2A3B] px-2 py-0.5 rounded">{product.sku}</span>
                {cat && <span className="badge badge-info text-xs">{cat.name}</span>}
                {!product.is_active && <span className="badge badge-danger text-xs">Inactive</span>}
                {isOut && <span className="badge badge-danger text-xs">Out of Stock</span>}
                {isLow && !isOut && <span className="badge badge-warning text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Stock</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <StockAdjustmentModal productId={id} productName={product.product_name} currentStock={product.quantity_in_stock} />
            <ProductEditModal product={product} categories={categoriesRes.data ?? []} suppliers={suppliersRes.data ?? []} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">In Stock</div>
          <div className={`stat-value ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : ''}`}>
            {product.quantity_in_stock} <span className="text-sm font-normal text-slate-400">{product.unit_of_measure}</span>
          </div>
          <div className="text-xs text-slate-400">Reorder at {product.reorder_level}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cost Price</div>
          <div className="stat-value">{formatCurrency(product.cost_price)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Selling Price</div>
          <div className="stat-value text-[#0066FF]">{formatCurrency(product.selling_price)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stock Value</div>
          <div className="stat-value">{formatCurrency(product.quantity_in_stock * product.cost_price)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Stock history */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Stock Movement History</h2>
          </div>
          {adjustments.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">No stock movements recorded</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Before</th>
                  <th>Change</th>
                  <th>After</th>
                  <th className="hidden md:table-cell">Reason</th>
                  <th className="hidden lg:table-cell">By</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj: {
                  id: string; created_at: string; adjustment_type: string;
                  quantity_before: number; quantity_change: number; quantity_after: number;
                  reason: string | null; reference_type: string | null;
                  adjusted_by_user: { full_name: string } | null
                }) => (
                  <tr key={adj.id}>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{formatDate(adj.created_at)}</td>
                    <td>
                      <span className={`badge text-xs ${
                        adj.adjustment_type === 'in' ? 'badge-success' :
                        adj.adjustment_type === 'correction' ? 'badge-info' :
                        'badge-danger'
                      }`}>
                        {formatLabel(adj.adjustment_type)}
                      </span>
                    </td>
                    <td className="text-sm text-slate-500">{adj.quantity_before}</td>
                    <td>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${ADJUSTMENT_COLORS[adj.adjustment_type] ?? 'text-slate-500'}`}>
                        {adj.quantity_change > 0
                          ? <><TrendingUp className="w-3 h-3" />+{adj.quantity_change}</>
                          : <><TrendingDown className="w-3 h-3" />{adj.quantity_change}</>
                        }
                      </span>
                    </td>
                    <td className="text-sm font-semibold text-[#0A1628] dark:text-white">{adj.quantity_after}</td>
                    <td className="hidden md:table-cell text-xs text-slate-400 max-w-[140px] truncate">
                      {adj.reason ?? (adj.reference_type ? formatLabel(adj.reference_type) : '—')}
                    </td>
                    <td className="hidden lg:table-cell text-xs text-slate-400">
                      {adj.adjusted_by_user?.full_name ?? 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Product details panel */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Product Info</h2>
          <div className="space-y-3 text-sm">
            {product.description && (
              <div>
                <div className="text-xs text-slate-400 mb-1">Description</div>
                <div className="text-[#0A1628] dark:text-slate-200">{product.description}</div>
              </div>
            )}
            {sup && (
              <div>
                <div className="text-xs text-slate-400 mb-1">Supplier</div>
                <div className="text-[#0A1628] dark:text-slate-200">{sup.company_name}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400 mb-1">Unit of Measure</div>
              <div className="text-[#0A1628] dark:text-slate-200 capitalize">{product.unit_of_measure}</div>
            </div>
            {product.cost_price > 0 && product.selling_price > 0 && (
              <div>
                <div className="text-xs text-slate-400 mb-1">Profit Margin</div>
                <div className="text-green-600 font-semibold">
                  {(((product.selling_price - product.cost_price) / product.selling_price) * 100).toFixed(1)}%
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400 mb-1">Last Updated</div>
              <div className="text-[#0A1628] dark:text-slate-200">{formatDate(product.updated_at)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Date Added</div>
              <div className="text-[#0A1628] dark:text-slate-200">{formatDate(product.created_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
