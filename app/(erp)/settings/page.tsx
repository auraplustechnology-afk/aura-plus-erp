'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Save, Loader2, Building2, CreditCard, Shield } from 'lucide-react'

interface Settings {
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  company_tpin: string
  company_logo_url: string | null
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  bank_branch: string
  bank_branch_number: string
  bank_sort_code: string
  default_terms: string
  default_notes: string
}

export default function SettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Settings>({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    company_tpin: '',
    company_logo_url: null,
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    bank_branch_number: '',
    bank_sort_code: '',
    default_terms: '',
    default_notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('system_settings').select('key, value')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach(row => {
        map[row.key] = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value ?? '')
      })
      setSettings(prev => ({
        ...prev,
        company_name: map.company_name ?? prev.company_name,
        company_address: map.company_address ?? prev.company_address,
        company_phone: map.company_phone ?? prev.company_phone,
        company_email: map.company_email ?? prev.company_email,
        company_website: map.company_website ?? prev.company_website,
        company_tpin: map.company_tpin ?? prev.company_tpin,
        company_logo_url: map.company_logo_url === 'null' ? null : map.company_logo_url,
        bank_name: map.bank_name ?? prev.bank_name,
        bank_account_name: map.bank_account_name ?? prev.bank_account_name,
        bank_account_number: map.bank_account_number ?? prev.bank_account_number,
        bank_branch: map.bank_branch ?? prev.bank_branch,
        bank_branch_number: map.bank_branch_number ?? prev.bank_branch_number,
        bank_sort_code: map.bank_sort_code ?? prev.bank_sort_code,
        default_terms: map.default_terms ?? prev.default_terms,
        default_notes: map.default_notes ?? prev.default_notes,
      }))
    }
    setLoading(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logo/company-logo.${ext}`

    const { error } = await supabase.storage
      .from('company-assets')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path)
      // Uploads overwrite the same fixed path, so the URL never changes between
      // uploads and browsers/CDNs keep serving the previous cached image. A
      // cache-busting param forces every upload to be treated as a fresh image.
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`
      setSettings(prev => ({ ...prev, company_logo_url: logoUrl }))
      await supabase.from('system_settings').upsert({ key: 'company_logo_url', value: JSON.stringify(logoUrl) }, { onConflict: 'key' })
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)

    const keys: (keyof Settings)[] = [
      'company_name', 'company_address', 'company_phone', 'company_email',
      'company_website', 'company_tpin', 'bank_name', 'bank_account_name',
      'bank_account_number', 'bank_branch', 'bank_branch_number', 'bank_sort_code',
      'default_terms', 'default_notes'
    ]

    const upserts = keys.map(key => ({
      key,
      value: JSON.stringify(settings[key] ?? ''),
      updated_at: new Date().toISOString()
    }))

    await supabase.from('system_settings').upsert(upserts, { onConflict: 'key' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Company information used on quotes, invoices and PDFs</p>
      </div>

      {/* Logo */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#0066FF]" />
          <h2 className="font-semibold text-[#0A1628] dark:text-white text-sm">Company Logo</h2>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center justify-center bg-slate-50 dark:bg-[#1E2A3B] overflow-hidden flex-shrink-0">
            {settings.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.company_logo_url} alt="Company logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            )}
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Upload your company logo. It will appear on all quotations, invoices and PDF exports.
              <br />Recommended: PNG with transparent background, minimum 400×400px.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-sm"
            >
              {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload Logo</>}
            </button>
          </div>
        </div>
      </div>

      {/* Company info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[#0066FF]" />
          <h2 className="font-semibold text-[#0A1628] dark:text-white text-sm">Company Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Company Name</label>
            <input className="form-input" value={settings.company_name} onChange={e => setSettings(p => ({...p, company_name: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">TPIN</label>
            <input className="form-input" value={settings.company_tpin} onChange={e => setSettings(p => ({...p, company_tpin: e.target.value}))} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Physical Address</label>
            <input className="form-input" value={settings.company_address} onChange={e => setSettings(p => ({...p, company_address: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={settings.company_phone} onChange={e => setSettings(p => ({...p, company_phone: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={settings.company_email} onChange={e => setSettings(p => ({...p, company_email: e.target.value}))} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Website</label>
            <input className="form-input" value={settings.company_website} onChange={e => setSettings(p => ({...p, company_website: e.target.value}))} />
          </div>
        </div>
      </div>

      {/* Bank details */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-[#0066FF]" />
          <h2 className="font-semibold text-[#0A1628] dark:text-white text-sm">Bank Details</h2>
          <span className="text-xs text-slate-400">(Appears on invoices and quotes)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Bank Name</label>
            <input className="form-input" value={settings.bank_name} onChange={e => setSettings(p => ({...p, bank_name: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Account Name</label>
            <input className="form-input" value={settings.bank_account_name} onChange={e => setSettings(p => ({...p, bank_account_name: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Account Number</label>
            <input className="form-input" value={settings.bank_account_number} onChange={e => setSettings(p => ({...p, bank_account_number: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Sort Code</label>
            <input className="form-input" value={settings.bank_sort_code} onChange={e => setSettings(p => ({...p, bank_sort_code: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Branch Name</label>
            <input className="form-input" value={settings.bank_branch} onChange={e => setSettings(p => ({...p, bank_branch: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Branch Number</label>
            <input className="form-input" value={settings.bank_branch_number} onChange={e => setSettings(p => ({...p, bank_branch_number: e.target.value}))} />
          </div>
        </div>
      </div>

      {/* Defaults */}
      <div className="card p-6">
        <h2 className="font-semibold text-[#0A1628] dark:text-white text-sm mb-4">PDF Defaults</h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Default Notes</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={settings.default_notes}
              onChange={e => setSettings(p => ({...p, default_notes: e.target.value}))}
            />
          </div>
          <div>
            <label className="form-label">Default Terms & Conditions</label>
            <textarea
              className="form-input resize-none"
              rows={5}
              value={settings.default_terms}
              onChange={e => setSettings(p => ({...p, default_terms: e.target.value}))}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Settings saved</span>
        )}
      </div>
    </div>
  )
}
