'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, X, Loader2 } from 'lucide-react'
import { updateAsset } from '@/lib/actions/assets'

interface Props {
  assetId: string
  currentStatus: string
  currentNotes: string
  currentLocation: string
}

const STATUS_OPTIONS = [
  { value: 'active',             label: 'Active' },
  { value: 'under_warranty',     label: 'Under Warranty' },
  { value: 'warranty_expired',   label: 'Warranty Expired' },
  { value: 'under_maintenance',  label: 'Under Maintenance' },
  { value: 'decommissioned',     label: 'Decommissioned' },
]

export default function AssetEditModal({ assetId, currentStatus, currentNotes, currentLocation }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    status:               currentStatus,
    notes:                currentNotes,
    location_description: currentLocation,
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await updateAsset(assetId, {
      status:               form.status,
      notes:                form.notes || null,
      location_description: form.location_description || null,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        <Edit2 className="w-4 h-4" /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h2 className="font-semibold text-[#0A1628] dark:text-white">Edit Asset</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location_description}
                  onChange={e => setForm(p => ({ ...p, location_description: e.target.value }))}
                  placeholder="e.g. Gate 1, Server Room" />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input resize-none" rows={3} value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
