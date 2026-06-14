'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, TrendingUp, Users, Trophy, DollarSign, Target,
  XCircle, Phone, Mail, MapPin, User, ChevronDown,
  ArrowRight, Loader2, MoreHorizontal, Edit2, Trash2,
  UserCheck, Search, Filter
} from 'lucide-react'
import { updateLeadStage, createLead, updateLead, deleteLead, convertLeadToCustomer } from '@/lib/actions/leads'
import { formatCurrency, formatLabel, formatDate, getLeadStageClass } from '@/lib/utils/format'
import type { Lead, LeadStage, LeadSource } from '@/types'

// ── Constants ────────────────────────────────────────────────
const STAGES: { id: LeadStage; label: string; color: string; accent: string }[] = [
  { id: 'new_lead',   label: 'New Lead',   color: 'bg-blue-50 dark:bg-blue-950/30',   accent: 'border-blue-400' },
  { id: 'contacted',  label: 'Contacted',  color: 'bg-slate-50 dark:bg-slate-900/30', accent: 'border-slate-400' },
  { id: 'follow_up',  label: 'Follow Up',  color: 'bg-amber-50 dark:bg-amber-950/30', accent: 'border-amber-400' },
  { id: 'quote_sent', label: 'Quote Sent', color: 'bg-purple-50 dark:bg-purple-950/30', accent: 'border-purple-400' },
  { id: 'won',        label: 'Won ✓',      color: 'bg-green-50 dark:bg-green-950/30', accent: 'border-green-500' },
  { id: 'lost',       label: 'Lost',       color: 'bg-red-50 dark:bg-red-950/30',     accent: 'border-red-400' },
  { id: 'ghosted',    label: 'Ghosted',    color: 'bg-slate-50 dark:bg-slate-900/20', accent: 'border-slate-300' },
]

const LEAD_SOURCES: LeadSource[] = ['facebook','referral','walk_in','phone_call','email','website','other']

// ── Types ────────────────────────────────────────────────────
interface SalesUser { id: string; full_name: string; email: string }

interface Metrics {
  totalLeads: number
  leadsThisMonth: number
  wonLeads: number
  pipelineValue: number
  conversionRate: number
  lostLeads: number
}

interface CRMClientProps {
  initialLeads: Lead[]
  salesUsers: SalesUser[]
  currentUserId: string
  currentUserRole: string
  metrics: Metrics
}

// ── Main Component ───────────────────────────────────────────
export default function CRMClient({ initialLeads, salesUsers, currentUserId, currentUserRole, metrics }: CRMClientProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [filterSalesperson, setFilterSalesperson] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [viewingLead, setViewingLead] = useState<Lead | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<LeadStage | null>(null)
  const [converting, setConverting] = useState<string | null>(null)
  const dragLeadRef = useRef<Lead | null>(null)

  // Filter leads for display
  const filteredLeads = leads.filter(lead => {
    const matchSearch = !search ||
      lead.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contact_person ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone ?? '').includes(search) ||
      (lead.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchSales = !filterSalesperson || lead.assigned_to === filterSalesperson
    return matchSearch && matchSales
  })

  // Group by stage
  const byStage = (stage: LeadStage) => filteredLeads.filter(l => l.stage === stage)
  const stageTotal = (stage: LeadStage) =>
    filteredLeads.filter(l => l.stage === stage).reduce((s, l) => s + (l.expected_value ?? 0), 0)

  // ── Drag handlers ──────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, lead: Lead) {
    dragLeadRef.current = lead
    setDragging(lead.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDragging(null)
    setDragOver(null)
    dragLeadRef.current = null
  }

  async function handleDrop(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault()
    const lead = dragLeadRef.current
    if (!lead || lead.stage === stage) { handleDragEnd(); return }

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage } : l))
    handleDragEnd()

    const result = await updateLeadStage(lead.id, stage)
    if (result.error) {
      // Revert on error
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: lead.stage } : l))
    }
  }

  // ── Convert to customer ────────────────────────────────────
  async function handleConvert(lead: Lead) {
    if (!confirm(`Convert "${lead.company_name}" to a customer? This will create a customer record.`)) return
    setConverting(lead.id)
    const result = await convertLeadToCustomer(lead.id)
    if (result.error) {
      alert(result.error)
    } else {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: 'won', converted_to_customer_id: result.customer?.id ?? null } : l))
      router.push(`/customers/${result.customer?.id}`)
    }
    setConverting(null)
  }

  // ── Delete ─────────────────────────────────────────────────
  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead "${lead.company_name}"? This cannot be undone.`)) return
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    const result = await deleteLead(lead.id)
    if (result.error) {
      setLeads(prev => [...prev, lead])
      alert(result.error)
    }
  }

  return (
    <div className="space-y-5 -mx-2">
      {/* Header */}
      <div className="px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">CRM & Leads</h1>
          <p className="page-subtitle">Drag cards between columns to update stages</p>
        </div>
        <button onClick={() => { setEditingLead(null); setShowForm(true) }} className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Metrics */}
      <div className="px-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Leads" value={metrics.totalLeads} icon={<Users className="w-4 h-4" />} color="blue" />
        <MetricCard label="This Month" value={metrics.leadsThisMonth} icon={<TrendingUp className="w-4 h-4" />} color="indigo" />
        <MetricCard label="Conversion" value={`${metrics.conversionRate}%`} icon={<Target className="w-4 h-4" />} color="purple" />
        <MetricCard label="Pipeline Value" value={formatCurrency(metrics.pipelineValue)} icon={<DollarSign className="w-4 h-4" />} color="green" small />
        <MetricCard label="Won" value={metrics.wonLeads} icon={<Trophy className="w-4 h-4" />} color="green" />
        <MetricCard label="Lost" value={metrics.lostLeads} icon={<XCircle className="w-4 h-4" />} color="red" />
      </div>

      {/* Filters */}
      <div className="px-2 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 py-2"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterSalesperson}
            onChange={e => setFilterSalesperson(e.target.value)}
            className="form-input pl-9 pr-8 py-2 appearance-none"
          >
            <option value="">All Salespeople</option>
            {salesUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 px-2 min-w-max">
          {STAGES.map(stage => {
            const stageLeads = byStage(stage.id)
            const total = stageTotal(stage.id)
            const isOver = dragOver === stage.id

            return (
              <div
                key={stage.id}
                className={`w-[280px] flex-shrink-0 flex flex-col rounded-xl border-2 transition-all duration-150 ${
                  isOver
                    ? 'border-[#0066FF] bg-blue-50/50 dark:bg-blue-950/20 shadow-lg shadow-blue-200/40'
                    : `border-transparent ${stage.color}`
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                onDrop={e => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div className={`px-3 py-3 border-b-2 ${stage.accent} border-l-0 border-r-0 border-t-0 flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#0A1628] dark:text-white">{stage.label}</span>
                      <span className="bg-white dark:bg-[#0F1C2E] text-[#0A1628] dark:text-white text-xs font-bold px-2 py-0.5 rounded-full border border-[#E2E8F0] dark:border-[#1E2A3B]">
                        {stageLeads.length}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">{formatCurrency(total)}</div>
                    )}
                  </div>
                  <button
                    onClick={() => { setEditingLead(null); setShowForm(true) }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0066FF] hover:bg-white dark:hover:bg-[#0F1C2E] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  {stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isDragging={dragging === lead.id}
                      isConverting={converting === lead.id}
                      onView={() => setViewingLead(lead)}
                      onEdit={() => { setEditingLead(lead); setShowForm(true) }}
                      onDelete={() => handleDelete(lead)}
                      onConvert={() => handleConvert(lead)}
                      onDragStart={e => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                  {stageLeads.length === 0 && !isOver && (
                    <div className="flex items-center justify-center py-8 text-center">
                      <p className="text-xs text-slate-300 dark:text-slate-600">Drop cards here</p>
                    </div>
                  )}
                  {isOver && (
                    <div className="border-2 border-dashed border-[#0066FF] rounded-lg h-16 flex items-center justify-center">
                      <span className="text-xs text-[#0066FF] font-medium">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lead Form Modal */}
      {showForm && (
        <LeadFormModal
          lead={editingLead}
          salesUsers={salesUsers}
          currentUserId={currentUserId}
          onClose={() => { setShowForm(false); setEditingLead(null) }}
          onSave={(saved) => {
            if (editingLead) {
              setLeads(prev => prev.map(l => l.id === saved.id ? { ...l, ...saved } : l))
            } else {
              setLeads(prev => [saved, ...prev])
            }
            setShowForm(false)
            setEditingLead(null)
          }}
        />
      )}

      {/* Lead Detail Modal */}
      {viewingLead && (
        <LeadDetailModal
          lead={viewingLead}
          salesUsers={salesUsers}
          isConverting={converting === viewingLead.id}
          onClose={() => setViewingLead(null)}
          onEdit={() => { setEditingLead(viewingLead); setViewingLead(null); setShowForm(true) }}
          onConvert={() => handleConvert(viewingLead)}
          onDelete={() => { handleDelete(viewingLead); setViewingLead(null) }}
        />
      )}
    </div>
  )
}

// ── Lead Card ────────────────────────────────────────────────
function LeadCard({ lead, isDragging, isConverting, onView, onEdit, onDelete, onConvert, onDragStart, onDragEnd }: {
  lead: Lead
  isDragging: boolean
  isConverting: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onConvert: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const isConverted = !!lead.converted_to_customer_id

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        bg-white dark:bg-[#0F1C2E] rounded-lg border border-[#E2E8F0] dark:border-[#1E2A3B] p-3
        cursor-grab active:cursor-grabbing select-none transition-all duration-150
        hover:shadow-md hover:border-[#0066FF]/30
        ${isDragging ? 'opacity-40 rotate-2 scale-95 shadow-xl' : ''}
      `}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <button onClick={onView} className="text-sm font-semibold text-[#0A1628] dark:text-white text-left hover:text-[#0066FF] transition-colors line-clamp-2 flex-1">
          {lead.company_name}
        </button>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1E2A3B] transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-lg shadow-lg z-20 overflow-hidden py-1">
                <button onClick={() => { setShowMenu(false); onView() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]">
                  <ArrowRight className="w-3 h-3" /> View Details
                </button>
                <button onClick={() => { setShowMenu(false); onEdit() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B]">
                  <Edit2 className="w-3 h-3" /> Edit Lead
                </button>
                {!isConverted && lead.stage !== 'lost' && lead.stage !== 'ghosted' && (
                  <button onClick={() => { setShowMenu(false); onConvert() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30">
                    <UserCheck className="w-3 h-3" /> Convert to Customer
                  </button>
                )}
                <div className="border-t border-[#E2E8F0] dark:border-[#1E2A3B] my-1" />
                <button onClick={() => { setShowMenu(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contact info */}
      {lead.contact_person && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lead.contact_person}</span>
        </div>
      )}
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Phone className="w-3 h-3 flex-shrink-0" />
          <span>{lead.phone}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
        <span className="text-xs font-semibold text-[#0066FF]">
          {formatCurrency(lead.expected_value)}
        </span>
        <div className="flex items-center gap-1.5">
          {isConverted && (
            <span className="badge badge-success text-[10px]">Converted</span>
          )}
          {isConverting && <Loader2 className="w-3 h-3 animate-spin text-[#0066FF]" />}
          {lead.assigned_to && (
            <div className="w-5 h-5 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] text-[9px] font-bold flex-shrink-0">
              {(lead as Lead & { assigned_user?: { full_name: string } }).assigned_user?.full_name?.charAt(0) ?? '?'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Lead Form Modal ──────────────────────────────────────────
function LeadFormModal({ lead, salesUsers, currentUserId, onClose, onSave }: {
  lead: Lead | null
  salesUsers: SalesUser[]
  currentUserId: string
  onClose: () => void
  onSave: (lead: Lead) => void
}) {
  const [form, setForm] = useState({
    company_name: lead?.company_name ?? '',
    contact_person: lead?.contact_person ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    physical_address: lead?.physical_address ?? '',
    lead_source: lead?.lead_source ?? 'other',
    assigned_to: lead?.assigned_to ?? currentUserId,
    expected_value: lead?.expected_value ?? 0,
    stage: lead?.stage ?? 'new_lead' as LeadStage,
    notes: lead?.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string | number) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setLoading(true)
    setError('')

    const result = lead
      ? await updateLead(lead.id, form)
      : await createLead({ ...form, lead_source: form.lead_source as import('@/types').LeadSource })

    if (result.error) { setError(result.error); setLoading(false); return }
    onSave(result.data as Lead)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B] sticky top-0 bg-white dark:bg-[#0F1C2E] z-10">
          <h2 className="font-semibold text-[#0A1628] dark:text-white">{lead ? 'Edit Lead' : 'New Lead'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1E2A3B] transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Company Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. Martjude School Limited" required />
            </div>
            <div>
              <label className="form-label">Contact Person</label>
              <input className="form-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+260 97..." />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.com" />
            </div>
            <div>
              <label className="form-label">Expected Value (ZMW)</label>
              <input className="form-input" type="number" min="0" value={form.expected_value} onChange={e => set('expected_value', parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Physical Address</label>
              <input className="form-input" value={form.physical_address} onChange={e => set('physical_address', e.target.value)} placeholder="Street, City" />
            </div>
            <div>
              <label className="form-label">Lead Source</label>
              <select className="form-input" value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Stage</label>
              <select className="form-input" value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Assign To</label>
              <select className="form-input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {salesUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea className="form-input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any relevant notes..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : lead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Lead Detail Modal ────────────────────────────────────────
function LeadDetailModal({ lead, salesUsers, isConverting, onClose, onEdit, onConvert, onDelete }: {
  lead: Lead
  salesUsers: SalesUser[]
  isConverting: boolean
  onClose: () => void
  onEdit: () => void
  onConvert: () => void
  onDelete: () => void
}) {
  const isConverted = !!lead.converted_to_customer_id
  const assignedUser = salesUsers.find(u => u.id === lead.assigned_to)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F1C2E] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
          <div>
            <h2 className="font-bold text-lg text-[#0A1628] dark:text-white">{lead.company_name}</h2>
            <span className={`badge ${getLeadStageClass(lead.stage)} mt-1`}>{formatLabel(lead.stage)}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1E2A3B] transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          <DetailRow icon={<User className="w-4 h-4" />} label="Contact" value={lead.contact_person} />
          <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={lead.phone} />
          <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email} />
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address" value={lead.physical_address} />
          <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Expected Value" value={formatCurrency(lead.expected_value)} highlight />
          <DetailRow icon={<User className="w-4 h-4" />} label="Assigned To" value={assignedUser?.full_name ?? '—'} />
          <DetailRow icon={<Target className="w-4 h-4" />} label="Lead Source" value={formatLabel(lead.lead_source)} />
          {lead.notes && (
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-[#0A1628] dark:text-slate-200">{lead.notes}</p>
            </div>
          )}
          <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E2A3B]">
            <p className="text-xs text-slate-400">Created {formatDate(lead.created_at)}</p>
            {lead.converted_at && <p className="text-xs text-green-500">Converted {formatDate(lead.converted_at)}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          {!isConverted && lead.stage !== 'lost' && lead.stage !== 'ghosted' && (
            <button onClick={onConvert} disabled={isConverting} className="btn-primary w-full justify-center py-2.5">
              {isConverting ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : <><UserCheck className="w-4 h-4" /> Convert to Customer</>}
            </button>
          )}
          {isConverted && (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 text-sm font-medium">
              <UserCheck className="w-4 h-4" /> Already converted to customer
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onEdit} className="btn-secondary flex-1 justify-center"><Edit2 className="w-4 h-4" /> Edit</button>
            <button onClick={() => { onDelete(); onClose() }} className="btn-danger flex-1 justify-center"><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────
function MetricCard({ label, value, icon, color, small }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; small?: boolean
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600',
    purple: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600',
    green: 'bg-green-50 dark:bg-green-950/20 text-green-600',
    red: 'bg-red-50 dark:bg-red-950/20 text-red-500',
  }
  return (
    <div className="card p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <div className={`font-bold text-[#0A1628] dark:text-white ${small ? 'text-base' : 'text-xl'}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <span className={`text-sm ${highlight ? 'font-semibold text-[#0066FF]' : 'text-[#0A1628] dark:text-slate-200'}`}>{value}</span>
    </div>
  )
}
