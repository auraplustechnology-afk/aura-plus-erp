'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, Calendar, PlayCircle, CheckCircle2,
  Loader2, Trash2, AlertCircle
} from 'lucide-react'
import { updateProject, deleteProject } from '@/lib/actions/projects'
import type { ProjectStatus } from '@/types'

interface ProjectStatusActionsProps {
  projectId: string
  currentStatus: ProjectStatus
  allChecklistComplete: boolean
}

const STATUS_FLOW: Record<ProjectStatus, { next: ProjectStatus | null; label: string; icon: React.ReactNode; color: string }> = {
  pending:     { next: 'scheduled',   label: 'Mark Scheduled',   icon: <Calendar className="w-4 h-4" />,    color: 'btn-secondary' },
  scheduled:   { next: 'in_progress', label: 'Start Project',    icon: <PlayCircle className="w-4 h-4" />,  color: 'btn-primary' },
  in_progress: { next: 'completed',   label: 'Mark Completed',   icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-600 hover:bg-green-700 text-white btn-primary' },
  completed:   { next: null,          label: 'Completed',        icon: <CheckCircle2 className="w-4 h-4" />, color: '' },
}

export default function ProjectStatusActions({ projectId, currentStatus, allChecklistComplete }: ProjectStatusActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showCompleteWarning, setShowCompleteWarning] = useState(false)

  const flow = STATUS_FLOW[currentStatus]
  if (!flow.next) return null

  async function handleAdvanceStatus() {
    if (!flow.next) return

    // Guard: checklist must be complete before marking as completed
    if (flow.next === 'completed' && !allChecklistComplete) {
      setShowCompleteWarning(true)
      return
    }

    setLoading('advance')
    const result = await updateProject(projectId, { status: flow.next })
    if (result.error) { alert(result.error) }
    setLoading(null)
    router.refresh()
  }

  async function handleDelete() {
    setShowMenu(false)
    if (!confirm('Delete this project? This cannot be undone.')) return
    setLoading('delete')
    const result = await deleteProject(projectId)
    if (result.error) { alert(result.error); setLoading(null); return }
    router.push('/projects')
  }

  return (
    <>
      {showCompleteWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0A1628] dark:text-white">Checklist Incomplete</h3>
                <p className="text-sm text-slate-500 mt-0.5">Complete all checklist items before marking this project as completed.</p>
              </div>
            </div>
            <button onClick={() => setShowCompleteWarning(false)} className="btn-primary w-full justify-center">
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Primary advance button */}
        <button
          onClick={handleAdvanceStatus}
          disabled={loading !== null}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 ${
            flow.next === 'completed'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : flow.next === 'in_progress'
              ? 'bg-[#0066FF] hover:bg-[#0052CC] text-white'
              : 'bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] text-[#0A1628] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1E2A3B]'
          }`}
        >
          {loading === 'advance' ? <Loader2 className="w-4 h-4 animate-spin" /> : flow.icon}
          {flow.label}
        </button>

        {/* More options */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={loading !== null}
            className="btn-secondary px-2.5"
          >
            {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl shadow-xl z-20 py-1">
                {/* Jump to status options */}
                {currentStatus === 'pending' && (
                  <button
                    onClick={async () => { setShowMenu(false); setLoading('jump'); await updateProject(projectId, { status: 'in_progress' }); setLoading(null); router.refresh() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]"
                  >
                    <PlayCircle className="w-4 h-4" /> Jump to In Progress
                  </button>
                )}
                <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" /> Delete Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
