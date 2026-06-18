'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useState, useTransition } from 'react'

export default function InventorySearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSearch(value: string) {
    setQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/inventory?${params.toString()}`)
    })
  }

  return (
    <div className="relative flex-1">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isPending ? 'text-[#0066FF]' : 'text-slate-400'}`} />
      <input
        type="text"
        className="form-input pl-9 pr-8 w-full"
        placeholder="Search products..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
      />
      {query && (
        <button
          onClick={() => handleSearch('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
