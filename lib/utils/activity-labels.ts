// Pure constant data only - no server-only imports (next/headers, supabase server client),
// so this file is safe to import from Client Components.

export type LogAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'payment_recorded' | 'stock_adjusted' | 'login' | 'logout'
  | 'converted' | 'password_reset' | 'deactivated' | 'activated'
  | 'setup_completed'

export type LogModule =
  | 'lead' | 'customer' | 'quotation' | 'invoice' | 'payment'
  | 'product' | 'project' | 'ticket' | 'contract' | 'user'
  | 'stock_adjustment' | 'settings'

// ── Human-readable action labels for display ────────────────
export const ACTION_LABELS: Record<string, string> = {
  created:          'Created',
  updated:          'Updated',
  deleted:          'Deleted',
  status_changed:   'Status Changed',
  payment_recorded: 'Payment Recorded',
  stock_adjusted:   'Stock Adjusted',
  login:            'Logged In',
  logout:           'Logged Out',
  converted:        'Converted',
  password_reset:   'Password Reset',
  deactivated:      'Deactivated',
  activated:        'Activated',
  setup_completed:  'Setup Completed',
}

export const MODULE_LABELS: Record<string, string> = {
  lead:             'CRM / Lead',
  customer:         'Customer',
  quotation:        'Quotation',
  invoice:          'Invoice',
  payment:          'Payment',
  product:          'Inventory',
  project:          'Project',
  ticket:           'Support Ticket',
  contract:         'Contract',
  user:             'User',
  stock_adjustment: 'Stock',
  settings:         'Settings',
}

export const ACTION_COLORS: Record<string, string> = {
  created:          'badge-success',
  updated:          'badge-info',
  deleted:          'badge-danger',
  status_changed:   'badge-warning',
  payment_recorded: 'badge-success',
  stock_adjusted:   'badge-default',
  login:            'badge-default',
  logout:           'badge-default',
  converted:        'badge-primary',
  password_reset:   'badge-warning',
  deactivated:      'badge-danger',
  activated:        'badge-success',
  setup_completed:  'badge-success',
}

export const MODULE_ICONS: Record<string, string> = {
  lead:             '👤',
  customer:         '🏢',
  quotation:        '📄',
  invoice:          '🧾',
  payment:          '💰',
  product:          '📦',
  project:          '🔧',
  ticket:           '🎫',
  contract:         '📋',
  user:             '👥',
  stock_adjustment: '📊',
  settings:         '⚙️',
}
