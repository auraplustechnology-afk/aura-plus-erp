'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, Plus, Loader2, ArrowLeft } from 'lucide-react'
import { createCustomer } from '@/lib/actions/customers'

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
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [newCustomer, setNewCustomer] = useState({ company_name: '', contact_person: '', phone: '', email: '' })
  const [extraCustomers, setExtraCustomers] = useState<CustomerOption[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Newly-created customers aren't in the server-fetched `customers` prop until
  // the page reloads, so track them locally to keep them selectable/visible.
  const allCustomers = extraCustomers.length ? [...customers, ...extraCustomers] : customers

  const selected = allCustomers.find(c => c.id === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setAdding(false)
        setAddError('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = (q
    ? allCustomers.filter(c =>
        c.company_name?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      )
    : allCustomers
  ).slice(0, MAX_RESULTS)

  function startAdding() {
    setAdding(true)
    setAddError('')
    setNewCustomer(prev => ({ ...prev, company_name: query || prev.company_name }))
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!newCustomer.company_name.trim()) {
      setAddError('Company name is required')
      return
    }
    setSaving(true)
    setAddError('')

    const result = await createCustomer({
      company_name: newCustomer.company_name.trim(),
      contact_person: newCustomer.contact_person.trim() || undefined,
      phone: newCustomer.phone.trim() || undefined,
      email: newCustomer.email.trim() || undefined,
      customer_type: 'active',
      source: 'manual',
    })

    if (result.error) {
      setAddError(result.error)
      setSaving(false)
      return
    }

    const created = result.data!
    setExtraCustomers(prev => [...prev, {
      id: created.id,
      company_name: created.company_name,
      contact_person: created.contact_person,
      phone: created.phone,
    }])
    onChange(created.id)
    setSaving(false)
    setAdding(false)
    setOpen(false)
    setQuery('')
    setNewCustomer({ company_name: '', contact_person: '', phone: '', email: '' })
  }

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
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-lg shadow-lg">
          {adding ? (
            <form onSubmit={handleCreateCustomer} className="p-3 space-y-2">
              <button
                type="button"
                onClick={() => { setAdding(false); setAddError('') }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#0066FF] mb-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to search
              </button>
              {addError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5">{addError}</div>
              )}
              <input
                autoFocus
                className="form-input text-sm py-1.5"
                placeholder="Company name *"
                value={newCustomer.company_name}
                onChange={e => setNewCustomer(p => ({ ...p, company_name: e.target.value }))}
                required
              />
              <input
                className="form-input text-sm py-1.5"
                placeholder="Contact person"
                value={newCustomer.contact_person}
                onChange={e => setNewCustomer(p => ({ ...p, contact_person: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="form-input text-sm py-1.5"
                  placeholder="Phone"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                />
                <input
                  type="email"
                  className="form-input text-sm py-1.5"
                  placeholder="Email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-sm py-1.5">
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : <><Plus className="w-3.5 h-3.5" /> Create & Select Customer</>}
              </button>
            </form>
          ) : (
            <>
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
                  {allCustomers.length > MAX_RESULTS && filtered.length === MAX_RESULTS && (
                    <div className="px-3 py-2 text-xs text-slate-400 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
                      Showing first {MAX_RESULTS} results — keep typing to narrow down
                    </div>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={startAdding}
                className="w-full text-left px-3 py-2.5 text-sm text-[#0066FF] hover:bg-slate-50 dark:hover:bg-[#1E2A3B] flex items-center gap-2 border-t border-[#E2E8F0] dark:border-[#1E2A3B] font-medium"
              >
                <Plus className="w-4 h-4" /> Add new customer{query ? ` "${query}"` : ''}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
