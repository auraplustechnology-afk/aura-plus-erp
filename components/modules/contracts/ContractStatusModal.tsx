'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, Trash2, RefreshCw } from 'lucide-react'
import { updateContract, deleteContract } from '@/lib/actions/contracts'
import type { ContractStatus } from '@/types'

const STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: 'active',          label: 'Active' },
  { value: 'pending_renewal', label: 'Pending Renewal' },
  { value: 'expired',         label: 'Expired' },
  { value: 'cancelled',       label: 'Cancelled' },
]

export default function ContractStatusModal({ contractId, currentStatus }: {
  contractId: string; currentStatus: string
}) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleStatus(status: ContractStatus) {
    setShowMenu(false)
    setLoading(status)
    await updateContract(contractId, { status })
    setLoading(null)
    router.refresh()
  }

  async function handleDelete() {
    setShowMenu(false)
    if (!confirm('Delete this contract? This cannot be undone.')) return
    setLoading('delete')
    const result = await deleteContract(contractId)
    if (result.error) { alert(result.error); setLoading(null); return }
    router.push('/contracts')
  }

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} disabled={loading !== null} className="btn-secondary px-2.5">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl shadow-xl z-20 py-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Change Status</div>
            {STATUS_OPTIONS.filter(s => s.value !== currentStatus).map(opt => (
              <button key={opt.value} onClick={() => handleStatus(opt.value)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]">
                <RefreshCw className="w-4 h-4" /> {opt.label}
              </button>
            ))}
            <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] my-1" />
            <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
              <Trash2 className="w-4 h-4" /> Delete Contract
            </button>
          </div>
        </>
      )}
    </div>
  )
}
