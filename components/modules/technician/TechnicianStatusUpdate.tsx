'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { updateProject } from '@/lib/actions/projects'
import type { ProjectStatus } from '@/types'

export default function TechnicianStatusUpdate({ projectId, currentStatus, allChecklistComplete }: {
  projectId: string
  currentStatus: string
  allChecklistComplete: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  async function handleUpdate(status: ProjectStatus) {
    if (status === 'completed' && !allChecklistComplete) {
      setShowWarning(true)
      return
    }
    setLoading(true)
    await updateProject(projectId, { status })
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-[#0A1628] dark:text-white text-center mb-2">Checklist Incomplete</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Please complete all checklist items before marking this project as done.
            </p>
            <button onClick={() => setShowWarning(false)} className="btn-primary w-full justify-center">Got it</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Update Status</h2>
        <div className="space-y-2">
          {currentStatus === 'pending' && (
            <button onClick={() => handleUpdate('scheduled')} disabled={loading} className="btn-secondary w-full justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Mark as Scheduled
            </button>
          )}
          {currentStatus === 'scheduled' && (
            <button onClick={() => handleUpdate('in_progress')} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Start Working
            </button>
          )}
          {currentStatus === 'in_progress' && (
            <button onClick={() => handleUpdate('completed')} disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark as Completed
            </button>
          )}
          {!allChecklistComplete && currentStatus === 'in_progress' && (
            <p className="text-xs text-slate-400 text-center">Complete all checklist items first</p>
          )}
        </div>
      </div>
    </>
  )
}
