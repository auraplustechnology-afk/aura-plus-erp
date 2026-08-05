'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
}

export default function InventoryCategoryFilter({
  categories,
  defaultValue,
}: {
  categories: Category[]
  defaultValue?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('category', value)
    } else {
      params.delete('category')
    }
    params.delete('page')
    router.push(`/inventory?${params.toString()}`)
  }

  return (
    <select
      className="form-input text-sm py-2"
      defaultValue={defaultValue}
      onChange={e => handleChange(e.target.value)}
      name="category"
    >
      <option value="">All Categories</option>
      {categories.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
