import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { LogAction, LogModule } from '@/lib/utils/activity-labels'

export type { LogAction, LogModule }
export {
  ACTION_LABELS,
  MODULE_LABELS,
  ACTION_COLORS,
  MODULE_ICONS,
} from '@/lib/utils/activity-labels'

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
