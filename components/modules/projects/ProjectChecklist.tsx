'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { updateChecklistItem } from '@/lib/actions/projects'
import { useRouter } from 'next/navigation'
import type { ProjectChecklist as ChecklistType } from '@/types'

const CHECKLIST_ITEMS: { key: keyof ChecklistType; label: string; description: string }[] = [
  { key: 'equipment_installed', label: 'Equipment Installed', description: 'All hardware installed at site' },
  { key: 'equipment_tested',    label: 'Equipment Tested',    description: 'All devices powered on and tested' },
  { key: 'client_trained',      label: 'Client Trained',      description: 'Client shown how to use the system' },
  { key: 'photos_uploaded',     label: 'Photos Uploaded',     description: 'Before and after photos added' },
  { key: 'client_sign_off',     label: 'Client Sign Off',     description: 'Client has signed off on completion' },
]

interface ProjectChecklistProps {
  projectId: string
  checklist: Record<string, boolean>
  isCompleted: boolean
}

export default function ProjectChecklist({ projectId, checklist, isCompleted }: ProjectChecklistProps) {
  const router = useRouter()
  const [localChecklist, setLocalChecklist] = useState(checklist)
  const [pending, setPending] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const allDone = CHECKLIST_ITEMS.every(item => localChecklist[item.key])
  const doneCount = CHECKLIST_ITEMS.filter(item => localChecklist[item.key]).length

  async function handleToggle(key: keyof ChecklistType) {
    if (isCompleted) return
    const newValue = !localChecklist[key]

    // Optimistic update
    setLocalChecklist(prev => ({ ...prev, [key]: newValue }))
    setPending(key)

    const result = await updateChecklistItem(projectId, key, newValue)

    if (result.error) {
      // Revert on error
      setLocalChecklist(prev => ({ ...prev, [key]: !newValue }))
    }

    setPending(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
        <div>
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Completion Checklist</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {doneCount} of {CHECKLIST_ITEMS.length} items completed
          </p>
        </div>
        {allDone && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            All complete
          </div>
        )}
      </div>

      <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2A3B]">
        {CHECKLIST_ITEMS.map(item => {
          const checked = localChecklist[item.key] ?? false
          const isLoading = pending === item.key

          return (
            <button
              key={item.key}
              onClick={() => handleToggle(item.key)}
              disabled={isCompleted || isLoading}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                isCompleted
                  ? 'cursor-default'
                  : 'hover:bg-slate-50 dark:hover:bg-[#1E2A3B]/50 cursor-pointer'
              }`}
            >
              {/* Checkbox icon */}
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-[#0066FF] animate-spin" />
                ) : checked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium transition-colors ${
                  checked
                    ? 'text-slate-400 line-through dark:text-slate-500'
                    : 'text-[#0A1628] dark:text-white'
                }`}>
                  {item.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
              </div>

              {/* Status badge */}
              {checked && (
                <span className="badge badge-success text-xs flex-shrink-0">Done</span>
              )}
              {!checked && !isCompleted && (
                <span className="badge badge-default text-xs flex-shrink-0">Pending</span>
              )}
            </button>
          )
        })}
      </div>

      {!isCompleted && !allDone && (
        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Complete all {CHECKLIST_ITEMS.length} items before marking the project as completed.
          </p>
        </div>
      )}
    </div>
  )
}
