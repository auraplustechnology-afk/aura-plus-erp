'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, X, Loader2, FolderKanban } from 'lucide-react'
import { escalateTicketToProject } from '@/lib/actions/tickets'

interface EscalateModalProps {
  ticketId: string
  customerId: string
  ticketNumber: string
  customers: { id: string; company_name: string }[]
}

export default function EscalateModal({ ticketId, customerId, ticketNumber, customers }: EscalateModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    project_name: `Support Escalation - ${ticketNumber}`,
    scheduled_date: '',
  })

  async function handleEscalate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.project_name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    setError('')

    const result = await escalateTicketToProject(ticketId, {
      customer_id: customerId,
      project_name: form.project_name,
      scheduled_date: form.scheduled_date || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push(`/projects/${result.project?.id}`)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        <ArrowUpRight className="w-4 h-4" /> Escalate to Project
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div>
                <h2 className="font-semibold text-[#0A1628] dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-[#0066FF]" /> Escalate to Project
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a project from {ticketNumber} — the ticket's technician will be assigned automatically
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEscalate} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="form-label">Project Name <span className="text-red-500">*</span></label>
                <input
                  className="form-input"
                  value={form.project_name}
                  onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label">Scheduled Date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={form.scheduled_date}
                  onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>What happens:</strong> A new project (PRJ-YYYY-XXXXX) is created linked to{' '}
                  {customers[0]?.company_name}. The ticket's assigned technician becomes the lead. The ticket status changes to <strong>In Progress</strong>.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><FolderKanban className="w-4 h-4" /> Create Project</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
