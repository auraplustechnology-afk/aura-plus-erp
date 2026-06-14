import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type LogAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'payment_recorded' | 'stock_adjusted' | 'login' | 'logout'
  | 'converted' | 'password_reset' | 'deactivated' | 'activated'
  | 'setup_completed'

export type LogModule =
  | 'lead' | 'customer' | 'quotation' | 'invoice' | 'payment'
  | 'product' | 'project' | 'ticket' | 'contract' | 'user'
  | 'stock_adjustment' | 'settings'

export interface LogEntry {
  action: LogAction
  module: LogModule
  entityId?: string
  entityLabel?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

/**
 * Log an activity with full context — user info, role, IP address.
 * Call from any Server Action after a significant event.
 */
export async function logActivity(entry: LogEntry): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get IP from headers (works on Vercel)
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? headersList.get('x-real-ip')
      ?? null

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: entry.action,
      entity_type: entry.module,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      old_values: entry.oldValues ?? null,
      new_values: entry.newValues ?? null,
      ip_address: ip,
    })
  } catch (err) {
    // Never throw from logging — always silent fail
    console.error('[logActivity] Failed:', err)
  }
}

/**
 * Log a login event (called after successful auth)
 */
export async function logLogin(userId: string, ipAddress?: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single()

    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'login',
      entity_type: 'user',
      entity_id: userId,
      entity_label: userData?.full_name ?? 'Unknown',
      ip_address: ipAddress ?? null,
    })
  } catch (err) {
    console.error('[logLogin] Failed:', err)
  }
}

/**
 * Log a logout event
 */
export async function logLogout(userId: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'logout',
      entity_type: 'user',
      entity_id: userId,
    })
  } catch (err) {
    console.error('[logLogout] Failed:', err)
  }
}

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
