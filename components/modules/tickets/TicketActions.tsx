'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, UserCheck, CheckCircle2, X, Loader2, Trash2, Clock } from 'lucide-react'
import { updateTicket, deleteTicket } from '@/lib/actions/tickets'
import type { TicketStatus } from '@/types'

interface TicketActionsProps {
  ticketId: string
  currentStatus: string
  technicians: { id: string; full_name: string }[]
  products: { id: string; sku: string; product_name: string }[]
  currentTechnicianId?: string
  currentProductId?: string
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: TicketStatus }[]> = {
  open:             [{ label: 'Assign',          next: 'assigned' }, { label: 'Start Working', next: 'in_progress' }],
  assigned:         [{ label: 'Start Working',   next: 'in_progress' }, { label: 'Waiting for Client', next: 'waiting_for_client' }],
  in_progress:      [{ label: 'Waiting for Client', next: 'waiting_for_client' }, { label: 'Resolve', next: 'resolved' }],
  waiting_for_client: [{ label: 'Resume',         next: 'in_progress' }, { label: 'Resolve', next: 'resolved' }],
  resolved:         [{ label: 'Close',            next: 'closed' }, { label: 'Reopen', next: 'open' }],
  closed:           [{ label: 'Reopen',           next: 'open' }],
}

export default function TicketActions({
  ticketId, currentStatus, technicians, currentTechnicianId
}: TicketActionsProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedTech, setSelectedTech] = useState(currentTechnicianId ?? '')
  const [resolutionNotes, setResolutionNotes] = useState('')

  const transitions = STATUS_TRANSITIONS[currentStatus] ?? []

  async function handleStatusChange(status: TicketStatus) {
    if (status === 'resolved') { setShowResolveModal(true); setShowMenu(false); return }
    setLoading(status)
    await updateTicket(ticketId, { status })
    setLoading(null)
    setShowMenu(false)
    router.refresh()
  }

  async function handleAssign() {
    if (!selectedTech) return
    setLoading('assign')
    await updateTicket(ticketId, { assigned_technician_id: selectedTech, status: 'assigned' as TicketStatus })
    setLoading(null)
    setShowAssignModal(false)
    router.refresh()
  }

  async function handleResolve() {
    setLoading('resolve')
    await updateTicket(ticketId, { status: 'resolved', resolution_notes: resolutionNotes || null })
    setLoading(null)
    setShowResolveModal(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return
    setLoading('delete')
    const result = await deleteTicket(ticketId)
    if (result.error) { alert(result.error); setLoading(null); return }
    router.push('/tickets')
  }

  return (
    <>
      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-4">Assign Technician</h3>
            <select className="form-input mb-4" value={selectedTech} onChange={e => setSelectedTech(e.target.value)}>
              <option value="">Select technician...</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleAssign} disabled={!selectedTech || loading === 'assign'} className="btn-primary flex-1 justify-center">
                {loading === 'assign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-[#0A1628] dark:text-white mb-1">Resolve Ticket</h3>
            <p className="text-sm text-slate-400 mb-4">Add resolution notes before marking as resolved.</p>
            <textarea
              className="form-input resize-none mb-4"
              rows={4}
              placeholder="What was done to resolve this issue? What was the root cause?"
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowResolveModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleResolve} disabled={loading === 'resolve'}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                {loading === 'resolve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Assign button */}
        {!['resolved', 'closed'].includes(currentStatus) && (
          <button onClick={() => setShowAssignModal(true)} className="btn-secondary text-sm">
            <UserCheck className="w-4 h-4" />
            {currentTechnicianId ? 'Reassign' : 'Assign'}
          </button>
        )}

        {/* Status dropdown */}
        {transitions.length > 0 && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} disabled={loading !== null} className="btn-primary text-sm">
              {loading && loading !== 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Update Status
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl shadow-xl z-20 py-1">
                  {transitions.map(t => (
                    <button key={t.next} onClick={() => handleStatusChange(t.next)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]">
                      {t.next === 'resolved' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4" />}
                      {t.label}
                    </button>
                  ))}
                  <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] my-1" />
                  <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="w-4 h-4" /> Delete Ticket
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
