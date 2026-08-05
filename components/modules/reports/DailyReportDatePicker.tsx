'use client'

import { useRouter } from 'next/navigation'

export default function DailyReportDatePicker({
  selectedDate,
  maxDate,
}: {
  selectedDate: string
  maxDate: string
}) {
  const router = useRouter()

  return (
    <input
      type="date"
      className="form-input w-auto"
      defaultValue={selectedDate}
      max={maxDate}
      onChange={e => {
        if (e.target.value) router.push(`/reports/daily?date=${e.target.value}`)
      }}
    />
  )
}
