'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Upload, Building2, FileText, Receipt,
  Users, CheckCircle2, Loader2, ChevronRight, ChevronLeft,
  Plus, Trash2, UserPlus, Phone, Mail, Globe
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────
interface Employee {
  id: string
  full_name: string
  email: string
  role: 'sales' | 'technician' | 'accountant' | 'manager'
  department: string
  phone: string
}

interface WizardData {
  // Step 1: Logo
  logoUrl: string | null

  // Step 2: Company Details
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  company_tpin: string

  // Step 3: Quotation Settings
  quote_prefix: string
  quote_starting_number: number
  quote_validity_days: number
  default_notes: string
  default_terms: string

  // Step 4: Invoice Settings
  invoice_prefix: string
  invoice_starting_number: number
  invoice_due_days: number
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  bank_branch: string
  bank_sort_code: string

  // Step 5: Employees
  employees: Employee[]
}

// ── Step config ──────────────────────────────────────────────
const STEPS = [
  { id: 1, icon: <Upload className="w-5 h-5" />,    title: 'Upload Logo',           sub: 'Your brand identity' },
  { id: 2, icon: <Building2 className="w-5 h-5" />, title: 'Company Details',       sub: 'Contact information' },
  { id: 3, icon: <FileText className="w-5 h-5" />,  title: 'Quotation Settings',    sub: 'Numbering & defaults' },
  { id: 4, icon: <Receipt className="w-5 h-5" />,   title: 'Invoice Settings',      sub: 'Numbering & banking' },
  { id: 5, icon: <Users className="w-5 h-5" />,     title: 'Add Team Members',      sub: 'Invite your staff' },
  { id: 6, icon: <CheckCircle2 className="w-5 h-5" />, title: 'All Done!',          sub: 'Review & launch' },
]

const ROLE_OPTIONS = [
  { value: 'sales',      label: 'Sales' },
  { value: 'technician', label: 'Technician' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'manager',    label: 'Manager' },
]

// ── Main component ───────────────────────────────────────────
export default function SetupWizard() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [completingSaving, setCompletingSaving] = useState(false)

  const [data, setData] = useState<WizardData>({
    logoUrl: null,
    company_name: 'Aura Plus Technologies',
    company_address: 'Located on Chilumbulu Road, Plot Number 10011, Kamwala, Lusaka',
    company_phone: '+260 97 4018157',
    company_email: 'auraplustechnology@gmail.com',
    company_website: 'www.auraplustechnologies.com',
    company_tpin: '1012756257',
    quote_prefix: 'AQP',
    quote_starting_number: 1,
    quote_validity_days: 30,
    default_notes: 'Looking forward to doing business with you.',
    default_terms: 'Account Name - AURA PLUS TECHNOLOGIES\nAccount Number - 2286625\nBranch Number - 016\nBranch Name - LUSAKA BUSINESS CENTER\nSort Code - 020016\nBank Name - ABSA BANK ZAMBIA PLC',
    invoice_prefix: 'INV',
    invoice_starting_number: 1,
    invoice_due_days: 30,
    bank_name: 'ABSA BANK ZAMBIA PLC',
    bank_account_name: 'AURA PLUS TECHNOLOGIES',
    bank_account_number: '2286625',
    bank_branch: 'LUSAKA BUSINESS CENTER',
    bank_sort_code: '020016',
    employees: [],
  })

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData(p => ({ ...p, [key]: value }))
  }

  // ── Logo upload ──────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `logo/company-logo.${ext}`
    const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path)
      set('logoUrl', urlData.publicUrl)
    }
    setUploadingLogo(false)
  }

  // ── Employee management ──────────────────────────────────
  function addEmployee() {
    const newEmp: Employee = {
      id: Math.random().toString(36).slice(2),
      full_name: '', email: '', role: 'sales', department: '', phone: '',
    }
    set('employees', [...data.employees, newEmp])
  }

  function updateEmployee(id: string, field: keyof Employee, value: string) {
    set('employees', data.employees.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function removeEmployee(id: string) {
    set('employees', data.employees.filter(e => e.id !== id))
  }

  // ── Save all settings ────────────────────────────────────
  async function saveAllSettings() {
    setCompletingSaving(true)

    const settings = [
      { key: 'company_name',          value: JSON.stringify(data.company_name) },
      { key: 'company_address',        value: JSON.stringify(data.company_address) },
      { key: 'company_phone',          value: JSON.stringify(data.company_phone) },
      { key: 'company_email',          value: JSON.stringify(data.company_email) },
      { key: 'company_website',        value: JSON.stringify(data.company_website) },
      { key: 'company_tpin',           value: JSON.stringify(data.company_tpin) },
      { key: 'company_logo_url',       value: JSON.stringify(data.logoUrl) },
      { key: 'quote_prefix',           value: JSON.stringify(data.quote_prefix) },
      { key: 'quote_validity_days',    value: String(data.quote_validity_days) },
      { key: 'default_notes',          value: JSON.stringify(data.default_notes) },
      { key: 'default_terms',          value: JSON.stringify(data.default_terms) },
      { key: 'invoice_prefix',         value: JSON.stringify(data.invoice_prefix) },
      { key: 'invoice_due_days',       value: String(data.invoice_due_days) },
      { key: 'bank_name',              value: JSON.stringify(data.bank_name) },
      { key: 'bank_account_name',      value: JSON.stringify(data.bank_account_name) },
      { key: 'bank_account_number',    value: JSON.stringify(data.bank_account_number) },
      { key: 'bank_branch',            value: JSON.stringify(data.bank_branch) },
      { key: 'bank_sort_code',         value: JSON.stringify(data.bank_sort_code) },
      { key: 'setup_completed',        value: 'true' },
    ]

    // Upsert all settings
    for (const s of settings) {
      await supabase.from('system_settings')
        .upsert({ key: s.key, value: s.value }, { onConflict: 'key' })
    }

    // Mark super admin setup as complete
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ setup_completed: true }).eq('id', user.id)
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'setup_completed',
        entity_type: 'settings',
        entity_label: 'Initial System Setup',
        new_values: { company: data.company_name },
      })
    }

    setCompletingSaving(false)
    router.push('/dashboard')
  }

  // ── Progress % ───────────────────────────────────────────
  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#0066FF] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="text-white font-bold text-lg leading-none">AURA<span className="text-blue-300">+</span> ERP</div>
            <div className="text-blue-300 text-xs tracking-widest">TECHNOLOGIES</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Welcome to Aura Plus ERP</h1>
        <p className="text-blue-200 text-sm">Let&apos;s get your system set up in just a few minutes.</p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s.id < step ? 'bg-green-500 text-white' :
                s.id === step ? 'bg-[#0066FF] text-white ring-4 ring-[#0066FF]/30' :
                'bg-white/10 text-blue-200'
              }`}>
                {s.id < step ? '✓' : s.id}
              </div>
              <span className={`text-[10px] hidden sm:block ${s.id === step ? 'text-white font-medium' : 'text-blue-300'}`}>
                {s.title.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-white/10 rounded-full">
          <div className="h-1.5 bg-[#0066FF] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step card */}
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl shadow-2xl overflow-hidden">
        {/* Step header */}
        <div className="bg-gradient-to-r from-[#0066FF]/10 to-transparent px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0066FF]/10 rounded-lg flex items-center justify-center text-[#0066FF]">
            {STEPS[step - 1]?.icon}
          </div>
          <div>
            <h2 className="font-bold text-[#0A1628] dark:text-white text-base">{STEPS[step - 1]?.title}</h2>
            <p className="text-xs text-slate-400">{STEPS[step - 1]?.sub}</p>
          </div>
          <div className="ml-auto text-xs text-slate-400">Step {step} of {STEPS.length}</div>
        </div>

        <div className="p-6">
          {/* ── STEP 1: Logo ── */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Upload your Aura Plus Technologies logo. It will appear on all quotations, invoices, and PDF exports.</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />

              <div className="flex flex-col items-center gap-4">
                {/* Preview */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-48 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-[#0066FF] ${
                    data.logoUrl ? 'border-[#0066FF] bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-[#1E2A3B] bg-slate-50 dark:bg-[#1E2A3B]'
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-8 h-8 text-[#0066FF] animate-spin" />
                  ) : data.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-3" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="text-xs text-slate-400">Click to upload logo</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="btn-secondary text-sm"
                >
                  {uploadingLogo ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />{data.logoUrl ? 'Change Logo' : 'Upload Logo'}</>}
                </button>

                <p className="text-xs text-slate-400 text-center max-w-xs">
                  Recommended: PNG with transparent background, at least 400×200px.<br />
                  <strong>You can skip this and upload later in Settings.</strong>
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Company Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">Company Name <span className="text-red-500">*</span></label>
                  <input className="form-input" value={data.company_name} onChange={e => set('company_name', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Physical Address</label>
                  <input className="form-input" value={data.company_address} onChange={e => set('company_address', e.target.value)} />
                </div>
                <div>
                  <label className="form-label"><Phone className="w-3.5 h-3.5 inline mr-1" />Phone Number</label>
                  <input className="form-input" value={data.company_phone} onChange={e => set('company_phone', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">TPIN</label>
                  <input className="form-input" value={data.company_tpin} onChange={e => set('company_tpin', e.target.value)} />
                </div>
                <div>
                  <label className="form-label"><Mail className="w-3.5 h-3.5 inline mr-1" />Email Address</label>
                  <input type="email" className="form-input" value={data.company_email} onChange={e => set('company_email', e.target.value)} />
                </div>
                <div>
                  <label className="form-label"><Globe className="w-3.5 h-3.5 inline mr-1" />Website</label>
                  <input className="form-input" value={data.company_website} onChange={e => set('company_website', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Quotation Settings ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Quote Prefix</label>
                  <input className="form-input font-mono" value={data.quote_prefix} onChange={e => set('quote_prefix', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Starting Number</label>
                  <input type="number" min="1" className="form-input" value={data.quote_starting_number} onChange={e => set('quote_starting_number', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="form-label">Valid For (days)</label>
                  <input type="number" min="1" className="form-input" value={data.quote_validity_days} onChange={e => set('quote_validity_days', parseInt(e.target.value) || 30)} />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-[#1E2A3B] rounded-lg px-4 py-3 text-sm text-slate-500">
                Preview: <span className="font-mono font-semibold text-[#0066FF]">{data.quote_prefix}-{new Date().getFullYear()}-{String(data.quote_starting_number).padStart(5, '0')}</span>
              </div>
              <div>
                <label className="form-label">Default Notes (shown on every quote)</label>
                <textarea className="form-input resize-none" rows={2} value={data.default_notes} onChange={e => set('default_notes', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Default Terms & Conditions (bank details)</label>
                <textarea className="form-input resize-none" rows={5} value={data.default_terms} onChange={e => set('default_terms', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── STEP 4: Invoice Settings ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Invoice Prefix</label>
                  <input className="form-input font-mono" value={data.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Starting Number</label>
                  <input type="number" min="1" className="form-input" value={data.invoice_starting_number} onChange={e => set('invoice_starting_number', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="form-label">Due Days</label>
                  <input type="number" min="0" className="form-input" value={data.invoice_due_days} onChange={e => set('invoice_due_days', parseInt(e.target.value) || 30)} />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-[#1E2A3B] rounded-lg px-4 py-3 text-sm text-slate-500">
                Preview: <span className="font-mono font-semibold text-[#0066FF]">{data.invoice_prefix}-{new Date().getFullYear()}-{String(data.invoice_starting_number).padStart(5, '0')}</span>
              </div>

              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white pt-2">Bank Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Bank Name</label>
                  <input className="form-input" value={data.bank_name} onChange={e => set('bank_name', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Account Name</label>
                  <input className="form-input" value={data.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Account Number</label>
                  <input className="form-input font-mono" value={data.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Branch / Sort Code</label>
                  <input className="form-input" value={data.bank_sort_code} onChange={e => set('bank_sort_code', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Branch Name</label>
                  <input className="form-input" value={data.bank_branch} onChange={e => set('bank_branch', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Employees ── */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Add your team members. After setup, they&apos;ll receive invitation instructions.
                <strong className="text-slate-700 dark:text-slate-300"> You can also skip this and add users later in User Management.</strong>
              </p>

              {data.employees.length === 0 ? (
                <div className="border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl py-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 mb-3">No team members added yet</p>
                  <button type="button" onClick={addEmployee} className="btn-secondary text-sm">
                    <UserPlus className="w-4 h-4" /> Add Team Member
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {data.employees.map((emp, i) => (
                    <div key={emp.id} className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-400">Team Member {i + 1}</span>
                        <button type="button" onClick={() => removeEmployee(emp.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input className="form-input text-sm" placeholder="Full Name *" value={emp.full_name}
                          onChange={e => updateEmployee(emp.id, 'full_name', e.target.value)} />
                        <input type="email" className="form-input text-sm" placeholder="Email *" value={emp.email}
                          onChange={e => updateEmployee(emp.id, 'email', e.target.value)} />
                        <select className="form-input text-sm" value={emp.role}
                          onChange={e => updateEmployee(emp.id, 'role', e.target.value)}>
                          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <input className="form-input text-sm" placeholder="Phone" value={emp.phone}
                          onChange={e => updateEmployee(emp.id, 'phone', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.employees.length > 0 && (
                <button type="button" onClick={addEmployee} className="btn-secondary text-sm w-full justify-center">
                  <Plus className="w-4 h-4" /> Add Another Team Member
                </button>
              )}
            </div>
          )}

          {/* ── STEP 6: Summary ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-[#0A1628] dark:text-white mb-1">Ready to Launch!</h3>
                <p className="text-sm text-slate-400">Here&apos;s a summary of your setup:</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Company', value: data.company_name },
                  { label: 'Phone', value: data.company_phone },
                  { label: 'Email', value: data.company_email },
                  { label: 'Quote Format', value: `${data.quote_prefix}-${new Date().getFullYear()}-${String(data.quote_starting_number).padStart(5, '0')}` },
                  { label: 'Invoice Format', value: `${data.invoice_prefix}-${new Date().getFullYear()}-${String(data.invoice_starting_number).padStart(5, '0')}` },
                  { label: 'Bank', value: `${data.bank_name} · ${data.bank_account_number}` },
                  { label: 'Logo', value: data.logoUrl ? '✓ Uploaded' : 'Not uploaded (can add in Settings)' },
                  { label: 'Team Members', value: data.employees.length > 0 ? `${data.employees.length} to be added` : 'None added (can add in Users)' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] dark:border-[#1E2A3B] last:border-0">
                    <span className="text-sm text-slate-400">{row.label}</span>
                    <span className="text-sm font-medium text-[#0A1628] dark:text-white text-right max-w-[60%] truncate">{row.value}</span>
                  </div>
                ))}
              </div>

              {data.employees.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1">📋 After launching:</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Go to <strong>Users → {data.employees[0].full_name}</strong> to see the invitation instructions for each team member.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="btn-secondary text-sm disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary text-sm">
              {step === 5 && data.employees.length === 0 ? 'Skip & Continue' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={saveAllSettings}
              disabled={completingSaving}
              className="btn-primary text-sm bg-green-600 hover:bg-green-700"
            >
              {completingSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><CheckCircle2 className="w-4 h-4" />Launch ERP</>}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-blue-200/40 text-xs mt-4">
        All settings can be changed later in the Settings module
      </p>
    </div>
  )
}
