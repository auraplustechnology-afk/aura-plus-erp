'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/utils/activity'

export type UserRole = 'super_admin' | 'sales' | 'technician' | 'accountant' | 'manager'

export interface CreateUserInput {
  email: string
  full_name: string
  role: UserRole
  department?: string
  phone?: string
}

export interface UpdateUserInput {
  full_name?: string
  role?: UserRole
  department?: string
  phone?: string
}

// ── Create User ──────────────────────────────────────────────
export async function createUser(input: CreateUserInput) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  // Verify caller is super_admin
  const { data: caller } = await supabase
    .from('users').select('role').eq('id', authUser.id).single()
  if (caller?.role !== 'super_admin') return { error: 'Only Super Admins can create users' }

  // Check email not already in use
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', input.email).single()
  if (existing) return { error: `A user with email ${input.email} already exists` }

  // Insert user profile (auth invite must be sent separately via Supabase dashboard
  // or via admin API — we create the profile record here)
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      // id will be set when user accepts invite — we use a placeholder approach:
      // In practice, Super Admin invites via Supabase dashboard, then this
      // pre-creates the profile so it's ready when they accept
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      department: input.department ?? null,
      phone: input.phone ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    // If the insert fails due to missing id, it means auth user doesn't exist yet
    return {
      error: null,
      needsInvite: true,
      profile: {
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        department: input.department,
        phone: input.phone,
      },
      sql: `-- Run this AFTER inviting ${input.email} via Supabase Auth:
INSERT INTO users (id, email, full_name, role, department, phone, is_active)
SELECT id, '${input.email}', '${input.full_name}', '${input.role}', 
       '${input.department ?? ''}', '${input.phone ?? ''}', true
FROM auth.users WHERE email = '${input.email}';`,
    }
  }

  await logActivity({
    action: 'created',
    module: 'user',
    entityId: newUser.id,
    entityLabel: newUser.full_name,
    newValues: { role: input.role, department: input.department },
  })

  revalidatePath('/users')
  return { data: newUser }
}

// ── Update User ──────────────────────────────────────────────
export async function updateUser(userId: string, input: UpdateUserInput) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase
    .from('users').select('role').eq('id', authUser.id).single()
  if (caller?.role !== 'super_admin') return { error: 'Only Super Admins can edit users' }

  const { data: before } = await supabase.from('users').select('*').eq('id', userId).single()

  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: input.full_name,
      role: input.role,
      department: input.department ?? null,
      phone: input.phone ?? null,
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    action: 'updated',
    module: 'user',
    entityId: userId,
    entityLabel: data.full_name,
    oldValues: { role: before?.role, department: before?.department },
    newValues: { role: input.role, department: input.department },
  })

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  return { data }
}

// ── Deactivate User ──────────────────────────────────────────
export async function deactivateUser(userId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  // Cannot deactivate yourself
  if (userId === authUser.id) return { error: 'You cannot deactivate your own account' }

  const { data: caller } = await supabase
    .from('users').select('role').eq('id', authUser.id).single()
  if (caller?.role !== 'super_admin') return { error: 'Only Super Admins can deactivate users' }

  const { data: target } = await supabase.from('users').select('full_name, role').eq('id', userId).single()
  if (target?.role === 'super_admin') return { error: 'Cannot deactivate another Super Admin' }

  await supabase.from('users').update({ is_active: false }).eq('id', userId)

  await logActivity({
    action: 'deactivated',
    module: 'user',
    entityId: userId,
    entityLabel: target?.full_name ?? 'Unknown',
  })

  revalidatePath('/users')
  return { success: true }
}

// ── Activate User ────────────────────────────────────────────
export async function activateUser(userId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase
    .from('users').select('role').eq('id', authUser.id).single()
  if (caller?.role !== 'super_admin') return { error: 'Only Super Admins can activate users' }

  const { data: target } = await supabase.from('users').select('full_name').eq('id', userId).single()
  await supabase.from('users').update({ is_active: true }).eq('id', userId)

  await logActivity({
    action: 'activated',
    module: 'user',
    entityId: userId,
    entityLabel: target?.full_name ?? 'Unknown',
  })

  revalidatePath('/users')
  return { success: true }
}

// ── Reset Password (sends email via Supabase) ────────────────
export async function sendPasswordReset(email: string, userId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Unauthorized' }

  const { data: caller } = await supabase
    .from('users').select('role').eq('id', authUser.id).single()
  if (caller?.role !== 'super_admin') return { error: 'Only Super Admins can reset passwords' }

  // Use Supabase to send a password reset email
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password/confirm`,
  })

  if (error) return { error: error.message }

  // Record in audit log
  await supabase.from('users').update({
    password_reset_at: new Date().toISOString(),
  }).eq('id', userId)

  await logActivity({
    action: 'password_reset',
    module: 'user',
    entityId: userId,
    entityLabel: email,
    newValues: { reset_sent_by: authUser.id },
  })

  revalidatePath(`/users/${userId}`)
  return { success: true }
}
