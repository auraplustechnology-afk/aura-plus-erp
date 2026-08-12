'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'

export interface CustomerOption {
  id: string
  company_name: string
  contact_person?: string | null
  phone?: string | null
}

const MAX_RESULTS = 50

export default function CustomerCombobox({
  customers,
  value,
  onChange,
  placeholder = 'Search by name, contact or phone...',
  required,
}: {
  customers: CustomerOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = customers.find(c => c.id === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = (q
    ? customers.filter(c =>
        c.company_name?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      )
    : customers
  ).slice(0, MAX_RESULTS)

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          className="form-input pl-9 pr-8"
          placeholder={selected && !open ? undefined : placeholder}
          value={open ? query : (selected ? `${selected.company_name}${selected.contact_person ? ` — ${selected.contact_person}` : ''}` : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        {/* Hidden input carries the actual required-field validation for the selected id */}
        {required && (
          <input type="text" value={value} required onChange={() => {}} className="sr-only" tabIndex={-1} aria-hidden="true" />
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No customers found</div>
          ) : (
            <>
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-[#1E2A3B] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[#0A1628] dark:text-white truncate">{c.company_name}</div>
                    {(c.contact_person || c.phone) && (
                      <div className="text-xs text-slate-400 truncate">{[c.contact_person, c.phone].filter(Boolean).join(' · ')}</div>
                    )}
                  </div>
                  {c.id === value && <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0" />}
                </button>
              ))}
              {customers.length > MAX_RESULTS && filtered.length === MAX_RESULTS && (
                <div className="px-3 py-2 text-xs text-slate-400 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                  Showing first {MAX_RESULTS} results — keep typing to narrow down
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
