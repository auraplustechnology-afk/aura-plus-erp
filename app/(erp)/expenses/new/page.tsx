'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, Receipt, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createExpense } from '@/lib/actions/expenses'

interface Category { id: string; name: string; icon: string; color: string }
interface Employee { id: string; full_name: string }

export default function NewExpensePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptName, setReceiptName] = useState<string | null>(null)

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    category_id: '',
    description: '',
    employee_id: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const [catsRes, empsRes] = await Promise.all([
        supabase.from('expense_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('users').select('id, full_name').eq('is_active', true).order('full_name'),
      ])
      setCategories((catsRes.data ?? []) as Category[])
      setEmployees((empsRes.data ?? []) as Employee[])
    }
    load()
  }, [])

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })) }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum 10MB.'); return }
    setUploading(true)
    const path = `receipts/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file, { upsert: false })
    if (uploadError) { setError('Upload failed: ' + uploadError.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
    setReceiptUrl(urlData.publicUrl)
    setReceiptName(file.name)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category_id) { setError('Please select a category'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Please enter a valid amount'); return }
    setLoading(true); setError('')

    const result = await createExpense({
      expense_date: form.expense_date,
      amount: parseFloat(form.amount),
      category_id: form.category_id,
      description: form.description,
      employee_id: form.employee_id || null,
      receipt_url: receiptUrl,
      receipt_name: receiptName,
      notes: form.notes || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.push('/expenses')
  }

  const selectedCat = categories.find(c => c.id === form.category_id)

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link href="/expenses" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Expenses
        </Link>
        <h1 className="page-title">Record Expense</h1>
        <p className="page-subtitle">Track a business expense with receipt</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Main details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#0066FF]" /> Expense Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Amount (ZMW) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">ZMW</span>
                <input type="number" min="0" step="0.01" className="form-input pl-14" placeholder="0.00"
                  value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Description <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="What was this expense for?" required />
            </div>
            <div>
              <label className="form-label">Employee Responsible</label>
              <select className="form-input" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
                <option value="">No specific employee</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional details..." />
            </div>
          </div>
        </div>

        {/* Category selection */}
        <div className="card p-5">
          <label className="form-label mb-3">Category <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categories.map(cat => (
              <button key={cat.id} type="button"
                onClick={() => set('category_id', cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                  form.category_id === cat.id
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]'
                    : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/40'
                }`}>
                <span className="text-xl">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
          {selectedCat && (
            <div className="mt-2 text-xs text-slate-400">Selected: {selectedCat.icon} {selectedCat.name}</div>
          )}
        </div>

        {/* Receipt upload */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Receipt <span className="text-slate-400 font-normal">(optional)</span></h2>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" />

          {receiptUrl ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl">
              <Receipt className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-green-700 dark:text-green-400">Receipt uploaded</div>
                <div className="text-xs text-green-600 truncate">{receiptName}</div>
              </div>
              <button type="button" onClick={() => { setReceiptUrl(null); setReceiptName(null) }}
                className="text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl text-slate-400 hover:border-[#0066FF]/40 hover:text-[#0066FF] transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Receipt (Photo or PDF)'}</span>
              <span className="text-xs">Maximum 10MB</span>
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/expenses" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Receipt className="w-4 h-4" /> Record Expense</>}
          </button>
        </div>
      </form>
    </div>
  )
}
