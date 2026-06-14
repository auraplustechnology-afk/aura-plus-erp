import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

export const metadata = { title: 'User Management — Aura Plus ERP' }

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  sales:       'Sales',
  technician:  'Technician',
  accountant:  'Accountant',
  manager:     'Manager',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  sales:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  technician:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  accountant:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  manager:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (currentUser?.role !== 'super_admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const activeCount = (users ?? []).filter(u => u.is_active).length
  const inactiveCount = (users ?? []).filter(u => !u.is_active).length

  const roleCounts = Object.keys(ROLE_LABELS).reduce((acc, role) => {
    acc[role] = (users ?? []).filter(u => u.role === role).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{(users ?? []).length} team members · {activeCount} active · {inactiveCount} inactive</p>
        </div>
        <Link href="/users/new" className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add User
        </Link>
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="card p-4 text-center">
            <div className={`text-2xl font-bold mb-0.5 ${roleCounts[role] === 0 ? 'text-slate-300 dark:text-slate-700' : 'text-[#0A1628] dark:text-white'}`}>
              {roleCounts[role] ?? 0}
            </div>
            <div className={`badge ${ROLE_COLORS[role]} text-xs justify-center`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th className="hidden sm:table-cell">Role</th>
              <th className="hidden md:table-cell">Department</th>
              <th className="hidden lg:table-cell">Phone</th>
              <th>Status</th>
              <th className="hidden xl:table-cell">Last Login</th>
              <th className="hidden xl:table-cell">Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      user.is_active ? 'bg-[#0066FF]/10 text-[#0066FF]' : 'bg-slate-100 dark:bg-[#1E2A3B] text-slate-400'
                    }`}>
                      {user.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[#0A1628] dark:text-white truncate">{user.full_name}</div>
                      <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell">
                  <span className={`badge ${ROLE_COLORS[user.role] ?? ''} text-xs`}>{ROLE_LABELS[user.role] ?? user.role}</span>
                </td>
                <td className="hidden md:table-cell text-sm text-slate-500">{user.department ?? '—'}</td>
                <td className="hidden lg:table-cell text-sm text-slate-500">{user.phone ?? '—'}</td>
                <td>
                  {user.is_active ? (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Inactive
                    </span>
                  )}
                </td>
                <td className="hidden xl:table-cell text-xs text-slate-400">
                  {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                </td>
                <td className="hidden xl:table-cell text-xs text-slate-400">{formatDate(user.created_at)}</td>
                <td>
                  <Link href={`/users/${user.id}`} className="text-xs text-[#0066FF] hover:underline font-medium">
                    {user.id === authUser.id ? 'Edit (You)' : 'Manage →'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RBAC Reference */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#0066FF]" />
          <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white">Role Permissions Reference</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold uppercase tracking-wider">Module</th>
                {Object.values(ROLE_LABELS).map(r => (
                  <th key={r} className="text-center py-2 px-2 text-slate-400 font-semibold uppercase tracking-wider">{r.split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { module: 'Dashboard',   access: [true, true, false, true, true] },
                { module: 'CRM & Leads', access: [true, true, false, false, true] },
                { module: 'Customers',   access: [true, true, false, true, true] },
                { module: 'Quotations',  access: [true, true, false, true, true] },
                { module: 'Invoices',    access: [true, false, false, true, true] },
                { module: 'Inventory',   access: [true, true, false, true, true] },
                { module: 'Projects',    access: [true, false, true, false, true] },
                { module: 'Tickets',     access: [true, true, true, false, true] },
                { module: 'Contracts',   access: [true, true, false, true, true] },
                { module: 'Reports',     access: [true, false, false, true, true] },
                { module: 'Activity Log',access: [true, false, false, false, true] },
                { module: 'Users',       access: [true, false, false, false, false] },
                { module: 'Settings',    access: [true, false, false, false, false] },
              ].map(row => (
                <tr key={row.module} className="border-b border-[#E2E8F0]/50 dark:border-[#1E2A3B]/50">
                  <td className="py-2 pr-4 text-slate-600 dark:text-slate-300 font-medium">{row.module}</td>
                  {row.access.map((has, i) => (
                    <td key={i} className="text-center py-2 px-2">
                      {has
                        ? <span className="text-green-500 font-bold">✓</span>
                        : <span className="text-slate-200 dark:text-slate-700">—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
