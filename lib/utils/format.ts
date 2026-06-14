/**
 * Format a number as ZMW currency
 * e.g. 7399 → "ZMW7,399.00"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'ZMW0.00'
  return `ZMW${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a number with commas
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-ZM')
}

/**
 * Format date as "12 Jun 2026" (matching the sample quote/invoice layout)
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

/**
 * Format a stage/status string for display
 * e.g. "new_lead" → "New Lead"
 */
export function formatLabel(str: string): string {
  return str
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Relative time
 */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 1000 / 60)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h ago`
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / 60 / 24)}d ago`
  return formatDate(dateStr)
}

/**
 * Get priority badge class
 */
export function getPriorityClass(priority: string): string {
  const map: Record<string, string> = {
    low: 'badge-default',
    medium: 'badge-info',
    high: 'badge-warning',
    critical: 'badge-danger',
  }
  return map[priority] ?? 'badge-default'
}

/**
 * Get status badge class for invoices
 */
export function getInvoiceStatusClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'badge-default',
    sent: 'badge-info',
    paid: 'badge-success',
    partially_paid: 'badge-warning',
    overdue: 'badge-danger',
  }
  return map[status] ?? 'badge-default'
}

/**
 * Get status badge class for projects
 */
export function getProjectStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-default',
    scheduled: 'badge-info',
    in_progress: 'badge-warning',
    completed: 'badge-success',
  }
  return map[status] ?? 'badge-default'
}

/**
 * Get status badge class for quotes
 */
export function getQuoteStatusClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'badge-default',
    sent: 'badge-info',
    accepted: 'badge-success',
    rejected: 'badge-danger',
    expired: 'badge-default',
  }
  return map[status] ?? 'badge-default'
}

/**
 * Get status badge class for leads
 */
export function getLeadStageClass(stage: string): string {
  const map: Record<string, string> = {
    new_lead: 'badge-info',
    contacted: 'badge-default',
    follow_up: 'badge-warning',
    quote_sent: 'badge-primary',
    won: 'badge-success',
    lost: 'badge-danger',
    ghosted: 'badge-default',
  }
  return map[stage] ?? 'badge-default'
}

/**
 * Get status badge class for tickets
 */
export function getTicketStatusClass(status: string): string {
  const map: Record<string, string> = {
    open: 'badge-danger',
    assigned: 'badge-warning',
    in_progress: 'badge-info',
    waiting_for_client: 'badge-default',
    resolved: 'badge-success',
    closed: 'badge-default',
  }
  return map[status] ?? 'badge-default'
}
