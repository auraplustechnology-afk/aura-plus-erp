'use client'

import { useRouter } from 'next/navigation'

interface Technician {
  id: string
  full_name: string
}

export default function TicketTechnicianFilter({
  technicians,
  defaultValue,
}: {
  technicians: Technician[]
  defaultValue?: string
}) {
  const router = useRouter()

  function handleChange(value: string) {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set('tech', value)
    else url.searchParams.delete('tech')
    router.push(url.pathname + url.search)
  }

  return (
    <select
      className="form-input text-xs py-1.5 ml-auto"
      defaultValue={defaultValue}
      onChange={e => handleChange(e.target.value)}
    >
      <option value="">All Technicians</option>
      {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
    </select>
  )
}
