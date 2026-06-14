'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Loader2, Save, UserPlus, Package } from 'lucide-react'
import { createProject, updateProject } from '@/lib/actions/projects'
import { formatCurrency } from '@/lib/utils/format'
import type { Project } from '@/types'

interface TechEntry { id: string; role: 'lead' | 'assistant' }
interface ProductEntry { product_id: string; quantity_used: number }

interface ProjectFormProps {
  mode: 'new' | 'edit'
  project?: Project
  customers: { id: string; company_name: string; contact_person: string | null }[]
  technicians: { id: string; full_name: string }[]
  products: { id: string; sku: string; product_name: string; selling_price: number; quantity_in_stock: number }[]
  preselectedCustomerId?: string
  preselectedQuotationId?: string
  preselectedInvoiceId?: string
}

export default function ProjectForm({
  mode, project, customers, technicians, products,
  preselectedCustomerId, preselectedQuotationId, preselectedInvoiceId
}: ProjectFormProps) {
  const router = useRouter()

  const [form, setForm] = useState({
    customer_id: project?.customer_id ?? preselectedCustomerId ?? '',
    project_name: project?.project_name ?? '',
    quotation_id: project?.quotation_id ?? preselectedQuotationId ?? '',
    invoice_id: project?.invoice_id ?? preselectedInvoiceId ?? '',
    scheduled_date: project?.scheduled_date ?? '',
    notes: project?.notes ?? '',
  })

  const [assignedTechs, setAssignedTechs] = useState<TechEntry[]>(() => {
    if (project?.technicians && project.technicians.length > 0) {
      return project.technicians.map(t => ({ id: t.technician_id, role: t.role }))
    }
    return []
  })

  const [productLines, setProductLines] = useState<ProductEntry[]>(() => {
    if (project?.products && project.products.length > 0) {
      return project.products.map(p => ({ product_id: p.product_id, quantity_used: p.quantity_used }))
    }
    return []
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setField(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  // Technician handlers
  function addTech() {
    const available = technicians.find(t => !assignedTechs.some(a => a.id === t.id))
    if (!available) return
    setAssignedTechs(p => [...p, { id: available.id, role: p.length === 0 ? 'lead' : 'assistant' }])
  }

  function updateTechRole(id: string, role: 'lead' | 'assistant') {
    setAssignedTechs(p => p.map(t => t.id === id ? { ...t, role } : t))
  }

  function removeTech(id: string) {
    setAssignedTechs(p => p.filter(t => t.id !== id))
  }

  // Product handlers
  function addProduct() {
    const available = products.find(p => !productLines.some(l => l.product_id === p.id))
    if (!available) return
    setProductLines(p => [...p, { product_id: available.id, quantity_used: 1 }])
  }

  function updateProductLine(product_id: string, qty: number) {
    setProductLines(p => p.map(l => l.product_id === product_id ? { ...l, quantity_used: qty } : l))
  }

  function removeProduct(product_id: string) {
    setProductLines(p => p.filter(l => l.product_id !== product_id))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Please select a customer'); return }
    if (!form.project_name.trim()) { setError('Project name is required'); return }
    if (assignedTechs.length > 0 && !assignedTechs.some(t => t.role === 'lead')) {
      setError('Please designate one technician as Lead')
      return
    }

    setSaving(true); setError('')

    const payload = {
      customer_id: form.customer_id,
      project_name: form.project_name,
      quotation_id: form.quotation_id || null,
      invoice_id: form.invoice_id || null,
      scheduled_date: form.scheduled_date || null,
      notes: form.notes || null,
      technician_ids: assignedTechs,
      product_lines: productLines,
    }

    const result = mode === 'new'
      ? await createProject(payload)
      : await updateProject(project!.id, payload)

    if (result.error) { setError(result.error); setSaving(false); return }
    router.push(`/projects/${result.data?.id ?? project?.id}`)
  }

  const availableTechs = technicians.filter(t => !assignedTechs.some(a => a.id === t.id))
  const availableProducts = products.filter(p => !productLines.some(l => l.product_id === p.id))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="page-title">{mode === 'new' ? 'New Project' : `Edit ${project?.project_number}`}</h1>
        <p className="page-subtitle">{mode === 'new' ? 'Create a new installation or service project' : 'Update this project'}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Project Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Customer <span className="text-red-500">*</span></label>
              <select className="form-input" value={form.customer_id} onChange={e => setField('customer_id', e.target.value)} required>
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}{c.contact_person ? ` — ${c.contact_person}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Project Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.project_name} onChange={e => setField('project_name', e.target.value)}
                placeholder="e.g. CCTV Installation — Manda Hill" required />
            </div>
            <div>
              <label className="form-label">Scheduled Date</label>
              <input type="date" className="form-input" value={form.scheduled_date} onChange={e => setField('scheduled_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Linked Quotation (optional)</label>
              <input className="form-input font-mono text-sm" value={form.quotation_id} onChange={e => setField('quotation_id', e.target.value)} placeholder="Quotation ID..." />
            </div>
            <div>
              <label className="form-label">Linked Invoice (optional)</label>
              <input className="form-input font-mono text-sm" value={form.invoice_id} onChange={e => setField('invoice_id', e.target.value)} placeholder="Invoice ID..." />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea className="form-input resize-none" rows={3} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Project notes, access instructions, site details..." />
            </div>
          </div>
        </div>

        {/* Technician assignment */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#0066FF]" /> Assigned Technicians
            </h2>
            {availableTechs.length > 0 && (
              <button type="button" onClick={addTech} className="btn-secondary text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Technician
              </button>
            )}
          </div>

          {assignedTechs.length === 0 ? (
            <div className="border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl py-8 text-center">
              <p className="text-sm text-slate-400 mb-3">No technicians assigned yet</p>
              {technicians.length === 0
                ? <p className="text-xs text-slate-400">No technicians found. Invite a user with the Technician role first.</p>
                : <button type="button" onClick={addTech} className="btn-secondary text-sm"><Plus className="w-4 h-4" /> Assign Technician</button>
              }
            </div>
          ) : (
            <div className="space-y-2">
              {assignedTechs.map(tech => {
                const techData = technicians.find(t => t.id === tech.id)
                return (
                  <div key={tech.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1E2A3B] rounded-lg">
                    <div className="w-8 h-8 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-bold text-sm flex-shrink-0">
                      {techData?.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0A1628] dark:text-white">{techData?.full_name}</div>
                    </div>
                    <select
                      className="form-input text-xs py-1.5 w-32"
                      value={tech.role}
                      onChange={e => updateTechRole(tech.id, e.target.value as 'lead' | 'assistant')}
                    >
                      <option value="lead">Lead Tech</option>
                      <option value="assistant">Assistant</option>
                    </select>
                    {availableTechs.length > 0 && (
                      <select
                        className="form-input text-xs py-1.5 w-40"
                        value={tech.id}
                        onChange={e => {
                          const newId = e.target.value
                          setAssignedTechs(p => p.map(t => t.id === tech.id ? { ...t, id: newId } : t))
                        }}
                      >
                        <option value={tech.id}>{techData?.full_name}</option>
                        {availableTechs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => removeTech(tech.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              {availableTechs.length > 0 && (
                <button type="button" onClick={addTech} className="w-full text-sm text-[#0066FF] hover:text-[#0052CC] font-medium flex items-center justify-center gap-1.5 py-2 transition-colors">
                  <Plus className="w-4 h-4" /> Add another technician
                </button>
              )}
            </div>
          )}
        </div>

        {/* Products used */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-[#0066FF]" /> Products / Equipment
            </h2>
            {availableProducts.length > 0 && (
              <button type="button" onClick={addProduct} className="btn-secondary text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">Stock will be deducted automatically when the project is marked as Completed (if no linked invoice).</p>

          {productLines.length === 0 ? (
            <div className="border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl py-6 text-center">
              <p className="text-sm text-slate-400 mb-3">No products assigned</p>
              {availableProducts.length > 0 && (
                <button type="button" onClick={addProduct} className="btn-secondary text-sm"><Plus className="w-4 h-4" /> Add Product</button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {productLines.map(line => {
                const prod = products.find(p => p.id === line.product_id)
                return (
                  <div key={line.product_id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1E2A3B] rounded-lg">
                    <div className="w-8 h-8 bg-[#0066FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-[#0066FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0A1628] dark:text-white truncate">{prod?.product_name}</div>
                      <div className="text-xs text-slate-400">{prod?.sku} · In stock: {prod?.quantity_in_stock} · {formatCurrency(prod?.selling_price ?? 0)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="text-xs text-slate-400">Qty:</label>
                      <input type="number" min="0.01" step="0.01" className="form-input w-20 text-sm py-1.5 text-center"
                        value={line.quantity_used}
                        onChange={e => updateProductLine(line.product_id, parseFloat(e.target.value) || 1)} />
                    </div>
                    <button type="button" onClick={() => removeProduct(line.product_id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              {availableProducts.length > 0 && (
                <button type="button" onClick={addProduct} className="w-full text-sm text-[#0066FF] font-medium flex items-center justify-center gap-1.5 py-2 transition-colors hover:text-[#0052CC]">
                  <Plus className="w-4 h-4" /> Add another product
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {mode === 'new' ? 'Create Project' : 'Save Changes'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
