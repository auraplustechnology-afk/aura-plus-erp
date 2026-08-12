'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAsset } from '@/lib/actions/assets'
import CustomerCombobox from '@/components/modules/customers/CustomerCombobox'

interface Customer { id: string; company_name: string; contact_person: string | null }
interface Project  { id: string; project_number: string; project_name: string }
interface Product  { id: string; sku: string; product_name: string }

const WARRANTY_OPTIONS = [3, 6, 12, 18, 24, 36, 48, 60]

const SERVICE_TYPES = [
  'CCTV Camera', 'NVR / DVR', 'Time Attendance Machine',
  'Access Control System', 'Electric Fence', 'Alarm System',
  'Network Switch', 'Server', 'UPS / Battery Backup',
  'Intercom System', 'Solar Panel', 'Other',
]

export default function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; project_id?: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [preloaded, setPreloaded] = useState({ customer_id: '', project_id: '' })

  const [form, setForm] = useState({
    customer_id: '',
    project_id: '',
    product_id: '',
    asset_name: '',
    brand: '',
    model: '',
    serial_number: '',
    installation_date: new Date().toISOString().split('T')[0],
    warranty_months: 12,
    location_description: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const [cRes, pRes, prRes] = await Promise.all([
        supabase.from('customers').select('id, company_name, contact_person').is('deleted_at', null).order('company_name'),
        supabase.from('products').select('id, sku, product_name').eq('is_active', true).order('product_name'),
        supabase.from('projects').select('id, project_number, project_name').is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
      ])
      setCustomers((cRes.data ?? []) as Customer[])
      setProducts((pRes.data ?? []) as Product[])
      setProjects((prRes.data ?? []) as Project[])
    }
    load()
  }, [])

  function set(key: string, value: string | number) {
    setForm(p => ({ ...p, [key]: value }))
  }

  // Calculate warranty expiry preview
  const expiryDate = form.installation_date
    ? new Date(new Date(form.installation_date).setMonth(new Date(form.installation_date).getMonth() + form.warranty_months))
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Please select a customer'); return }
    if (!form.asset_name.trim()) { setError('Asset name is required'); return }
    setLoading(true); setError('')

    const result = await createAsset({
      customer_id: form.customer_id,
      project_id:  form.project_id || null,
      product_id:  form.product_id || null,
      asset_name:  form.asset_name,
      brand:       form.brand || null,
      model:       form.model || null,
      serial_number:       form.serial_number || null,
      installation_date:   form.installation_date,
      warranty_months:     form.warranty_months,
      location_description: form.location_description || null,
      notes:       form.notes || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/assets/${result.data?.id}`)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link href="/assets" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Asset Register
        </Link>
        <h1 className="page-title">Register New Asset</h1>
        <p className="page-subtitle">Record installed equipment for warranty and service tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Customer + Project */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0066FF]" /> Customer & Project
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Customer <span className="text-red-500">*</span></label>
              <CustomerCombobox customers={customers} value={form.customer_id} onChange={id => set('customer_id', id)} required />
            </div>
            <div>
              <label className="form-label">Linked Project <span className="text-slate-400 font-normal">(optional)</span></label>
              <select className="form-input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Product from Inventory <span className="text-slate-400 font-normal">(optional)</span></label>
              <select className="form-input" value={form.product_id} onChange={e => {
                set('product_id', e.target.value)
                const product = products.find(p => p.id === e.target.value)
                if (product && !form.asset_name) set('asset_name', product.product_name)
              }}>
                <option value="">Custom / not in inventory</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.product_name} ({p.sku})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Asset details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Asset Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Asset Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.asset_name} onChange={e => set('asset_name', e.target.value)}
                placeholder="e.g. CCTV Camera — Main Gate" list="asset-types" required />
              <datalist id="asset-types">
                {SERVICE_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="form-label">Brand</label>
              <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Hikvision, ZKTeco" />
            </div>
            <div>
              <label className="form-label">Model</label>
              <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. DS-2CD2143G2-I" />
            </div>
            <div>
              <label className="form-label">Serial Number</label>
              <input className="form-input font-mono" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="Device serial number" />
            </div>
            <div>
              <label className="form-label">Installation Location</label>
              <input className="form-input" value={form.location_description} onChange={e => set('location_description', e.target.value)} placeholder="e.g. Gate 1, Server Room" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea className="form-input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Configuration details, access codes, special instructions..." />
            </div>
          </div>
        </div>

        {/* Warranty */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Warranty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Installation Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={form.installation_date} onChange={e => set('installation_date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Warranty Period</label>
              <div className="grid grid-cols-4 gap-2">
                {WARRANTY_OPTIONS.map(months => (
                  <button key={months} type="button"
                    onClick={() => set('warranty_months', months)}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                      form.warranty_months === months
                        ? 'border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]'
                        : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/30'
                    }`}>
                    {months < 12 ? `${months}m` : `${months / 12}yr`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {expiryDate && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3 text-sm">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Warranty expires: {expiryDate.toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {expiryDate < new Date() && (
                <span className="text-red-500 ml-2">⚠ This date is in the past</span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/assets" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><Shield className="w-4 h-4" /> Register Asset</>}
          </button>
        </div>
      </form>
    </div>
  )
}
