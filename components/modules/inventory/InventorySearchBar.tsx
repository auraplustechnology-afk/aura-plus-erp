'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useTransition } from 'react'

export default function InventorySearchBar({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        defaultValue={defaultValue}
        onChange={e => {
          const val = e.target.value
          startTransition(() => {
            router.push(`${pathname}?q=${val}`)
          })
        }}
        placeholder="Search products..."
        className="form-input pl-9 pr-8"
      />
      {defaultValue && (
        <button onClick={() => router.push(pathname)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
