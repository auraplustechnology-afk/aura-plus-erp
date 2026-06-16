'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, X, Loader2 } from 'lucide-react'
import { addServiceLog } from '@/lib/actions/assets'

interface Props {
  assetId: string
  technicians: { id: string; full_name: string }[]
  compact?: boolean
}

const SERVICE_TYPES = [
  { value: 'installation',        label: 'Installation' },
  { value: 'routine_maintenance', label: 'Routine Maintenance' },
  { value: 'repair',              label: 'Repair' },
  { value: 'inspection',          label: 'Inspection' },
  { value: 'replacement',         label: 'Part Replacement' },
  { value: 'upgrade',             label: 'Upgrade' },
  { value: 'warranty_claim',      label: 'Warranty Claim' },
]

export default function AddServiceLogModal({ assetId, technicians, compact }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    service_date:     new Date().toISOString().split('T')[0],
    service_type:     'routine_maintenance',
    description:      '',
    technician_id:    '',
    cost:             '',
    parts_used:       '',
    next_service_date: '',
  })

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required'); return }
    setLoading(true); setError('')

    const result = await addServiceLog({
      asset_id:          assetId,
      service_date:      form.service_date,
      service_type:      form.service_type,
      description:       form.description,
      technician_id:     form.technician_id || null,
      cost:              parseFloat(form.cost) || 0,
      parts_used:        form.parts_used || null,
      next_service_date: form.next_service_date || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    setOpen(false)
    setForm({ service_date: new Date().toISOString().split('T')[0], service_type: 'routine_maintenance', description: '', technician_id: '', cost: '', parts_used: '', next_service_date: '' })
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={compact ? 'btn-secondary text-xs py-1.5 px-3' : 'btn-primary text-sm'}>
        <Wrench className="w-4 h-4" /> Log Service
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h2 className="font-semibold text-[#0A1628] dark:text-white">Log Service</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.service_date} onChange={e => set('service_date', e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.service_type} onChange={e => set('service_type', e.target.value)}>
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Description <span className="text-red-500">*</span></label>
                <textarea className="form-input resize-none" rows={3} value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="What was done? What was found?" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Technician</label>
                  <select className="form-input" value={form.technician_id} onChange={e => set('technician_id', e.target.value)}>
                    <option value="">Not assigned</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Cost (ZMW)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={form.cost}
                    onChange={e => set('cost', e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="form-label">Parts Used <span className="text-slate-400 font-normal">(optional)</span></label>
                <input className="form-input" value={form.parts_used} onChange={e => set('parts_used', e.target.value)}
                  placeholder="e.g. Power supply, camera lens" />
              </div>

              <div>
                <label className="form-label">Next Service Date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="date" className="form-input" value={form.next_service_date} onChange={e => set('next_service_date', e.target.value)} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Wrench className="w-4 h-4" /> Log Service</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
