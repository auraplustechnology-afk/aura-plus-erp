'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useTransition } from 'react'

export default function CustomerSearchBar({ defaultValue, typeFilter }: { defaultValue: string; typeFilter: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const handleSearch = useCallback((value: string) => {
    const params = new URLSearchParams()
    if (value) params.set('q', value)
    if (typeFilter) params.set('type', typeFilter)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [router, pathname, typeFilter])

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        defaultValue={defaultValue}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search by name, email, phone..."
        className="form-input pl-9 pr-8"
      />
      {defaultValue && (
        <button
          onClick={() => handleSearch('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
