'use client'

import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useTransition, useEffect, useRef } from 'react'

export default function GlobalSearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleSearch(value: string) {
    startTransition(() => {
      if (value.length >= 2) {
        router.push(`/search?q=${encodeURIComponent(value)}`)
      } else if (!value) {
        router.push('/search')
      }
    })
  }

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search customers, invoices, quotes, projects, tickets, products..."
        className="form-input pl-12 pr-10 py-3 text-base w-full"
        autoFocus
      />
      {defaultValue && (
        <button
          onClick={() => { if (inputRef.current) { inputRef.current.value = ''; handleSearch('') } }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
