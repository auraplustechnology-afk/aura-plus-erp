'use client'

import { useRouter } from 'next/navigation'
import { ACTION_LABELS, MODULE_LABELS } from '@/lib/utils/activity'

interface User {
  id: string
  full_name: string
}

export default function AuditTrailFilters({
  canViewAll,
  users,
  userFilter,
  actionFilter,
  moduleFilter,
  fromFilter,
  toFilter,
}: {
  canViewAll: boolean
  users: User[]
  userFilter: string
  actionFilter: string
  moduleFilter: string
  fromFilter: string
  toFilter: string
}) {
  const router = useRouter()
  const ACTIONS = Object.keys(ACTION_LABELS)
  const MODULES = Object.keys(MODULE_LABELS)

  function updateParam(key: string, value: string) {
    const u = new URL(window.location.href)
    if (value) u.searchParams.set(key, value)
    else u.searchParams.delete(key)
    u.searchParams.delete('page')
    router.push(u.pathname + u.search)
  }

  return (
    <>
      {canViewAll && (
        <select
          className="form-input text-xs py-1.5 w-44"
          defaultValue={userFilter}
          onChange={e => updateParam('user', e.target.value)}
        >
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      )}
      <select
        className="form-input text-xs py-1.5 w-40"
        defaultValue={actionFilter}
        onChange={e => updateParam('action', e.target.value)}
      >
        <option value="">All Actions</option>
        {ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
      </select>
      <select
        className="form-input text-xs py-1.5 w-40"
        defaultValue={moduleFilter}
        onChange={e => updateParam('module', e.target.value)}
      >
        <option value="">All Modules</option>
        {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>)}
      </select>
      <input
        type="date"
        className="form-input text-xs py-1.5"
        defaultValue={fromFilter}
        onChange={e => updateParam('from', e.target.value)}
      />
      <input
        type="date"
        className="form-input text-xs py-1.5"
        defaultValue={toFilter}
        onChange={e => updateParam('to', e.target.value)}
      />
    </>
  )
}
