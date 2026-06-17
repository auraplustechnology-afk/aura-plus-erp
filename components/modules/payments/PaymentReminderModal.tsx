'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, Loader2, CheckCircle2, Phone, Mail, Users } from 'lucide-react'
import { logPaymentReminder } from '@/lib/actions/payment-reminders'
import { formatCurrency } from '@/lib/utils/format'
import type { ReminderType } from '@/lib/actions/payment-reminders'

interface Props {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  outstanding: number
  dueDate: string
  daysOverdue: number
  companyName: string
  companyPhone: string
  reminderCount: number
}

const REMINDER_TYPES: { value: ReminderType; label: string; icon: React.ReactNode }[] = [
  { value: 'call',      label: 'Phone Call', icon: <Phone className="w-4 h-4" /> },
  { value: 'email',     label: 'Email',      icon: <Mail className="w-4 h-4" /> },
  { value: 'in_person', label: 'In Person',  icon: <Users className="w-4 h-4" /> },
]

export default function PaymentReminderModal({
  invoiceId, invoiceNumber, customerId, customerName,
  outstanding, reminderCount
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'type' | 'log'>('type')
  const [selectedType, setSelectedType] = useState<ReminderType>('call')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    response_received: '',
    next_follow_up_date: '',
  })

  async function handleLog() {
    setLoading(true)
    await logPaymentReminder({
      invoice_id: invoiceId,
      customer_id: customerId,
      reminder_type: selectedType,
      response_received: form.response_received || undefined,
      next_follow_up_date: form.next_follow_up_date || null,
    })
    setLoading(false)
    setOpen(false)
    setStep('type')
    setForm({ response_received: '', next_follow_up_date: '' })
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg hover:border-[#0066FF]/40 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Log Reminder
        {reminderCount > 0 && (
          <span className="bg-slate-100 dark:bg-[#1E2A3B] text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {reminderCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <div>
                <h2 className="font-semibold text-[#0A1628] dark:text-white">Payment Follow-Up</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {invoiceNumber} · {customerName} · {formatCurrency(outstanding)} outstanding
                </p>
              </div>
              <button onClick={() => { setOpen(false); setStep('type') }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {step === 'type' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">How are you contacting this customer?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {REMINDER_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          selectedType === type.value
                            ? 'border-[#0066FF] bg-[#0066FF]/5 text-[#0066FF]'
                            : 'border-[#E2E8F0] dark:border-[#1E2A3B] text-slate-500 hover:border-[#0066FF]/30'
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setStep('log')}
                    className="btn-primary w-full justify-center"
                  >
                    Next — Log This Reminder →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-[#1E2A3B] rounded-xl px-4 py-3 text-sm text-slate-500">
                    Logging: <strong className="text-[#0A1628] dark:text-white capitalize">{selectedType.replace('_', ' ')}</strong> reminder to <strong className="text-[#0A1628] dark:text-white">{customerName}</strong>
                  </div>

                  <div>
                    <label className="form-label">Customer Response <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      className="form-input"
                      value={form.response_received}
                      onChange={e => setForm(p => ({ ...p, response_received: e.target.value }))}
                      placeholder="What did they say? e.g. Will pay Friday"
                    />
                  </div>

                  <div>
                    <label className="form-label">Next Follow-Up Date <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.next_follow_up_date}
                      onChange={e => setForm(p => ({ ...p, next_follow_up_date: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep('type')} className="btn-secondary flex-1 justify-center">← Back</button>
                    <button onClick={handleLog} disabled={loading} className="btn-primary flex-1 justify-center">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Log Reminder</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
