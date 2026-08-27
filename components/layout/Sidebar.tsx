'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Receipt, Package, DollarSign,
  FolderKanban, Headphones, BarChart3, Settings,
  UserCog, Wrench, FileCheck, Shield, ChevronRight, AlertCircle,
  X, ShoppingCart
} from 'lucide-react'
import type { User, UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
  badge?: number
}

interface SidebarProps {
  user: User
  isOpen: boolean
  onClose: () => void
  stats?: {
    openTickets?: number
    lowStock?: number
    activeProjects?: number
  }
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'accountant', 'manager'],
  },
  {
    label: 'CRM & Leads',
    href: '/crm',
    icon: <Users className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'manager'],
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: <UserCog className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'accountant', 'manager'],
  },
  {
    label: 'Quotations',
    href: '/quotations',
    icon: <FileText className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'accountant', 'manager'],
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: <Receipt className="w-4 h-4" />,
    roles: ['super_admin', 'accountant', 'manager', 'sales'],
  },
  {
    label: 'Point of Sale',
    href: '/pos',
    icon: <ShoppingCart className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'manager', 'accountant'],
  },
  {
    label: 'Expenses',
    href: '/expenses',
    icon: <DollarSign className="w-4 h-4" />,
    roles: ['super_admin', 'accountant', 'manager', 'sales'],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: <Package className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'accountant', 'manager'],
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: <FolderKanban className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'manager'],
  },
  {
    label: 'Support Tickets',
    href: '/tickets',
    icon: <Headphones className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'manager'],
  },
  {
    label: 'Contracts',
    href: '/contracts',
    icon: <FileCheck className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'accountant', 'manager'],
  },
  {
    label: 'Asset Register',
    href: '/assets',
    icon: <Shield className="w-4 h-4" />,
    roles: ['super_admin', 'sales', 'manager', 'technician'],
  },
  {
    label: 'Overdue Invoices',
    href: '/invoices/overdue',
    icon: <AlertCircle className="w-4 h-4" />,
    roles: ['super_admin', 'accountant', 'manager', 'sales'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ['super_admin', 'manager', 'accountant'],
  },
  {
    label: 'Activity Log',
    href: '/activity-logs',
    icon: <Shield className="w-4 h-4" />,
    roles: ['super_admin', 'manager'],
  },
  {
    label: 'Users',
    href: '/users',
    icon: <Shield className="w-4 h-4" />,
    roles: ['super_admin'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-4 h-4" />,
    roles: ['super_admin'],
  },
]

const TECHNICIAN_NAV: NavItem[] = [
  {
    label: 'My Projects',
    href: '/my-projects',
    icon: <Wrench className="w-4 h-4" />,
    roles: ['technician'],
  },
  {
    label: 'My Tickets',
    href: '/my-tickets',
    icon: <Headphones className="w-4 h-4" />,
    roles: ['technician'],
  },
]

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  sales: 'Sales',
  technician: 'Technician',
  accountant: 'Accountant',
  manager: 'Manager',
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  sales: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  technician: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  accountant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  manager: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

export default function Sidebar({ user, isOpen, onClose, stats }: SidebarProps) {
  const pathname = usePathname()
  const isTechnician = user.role === 'technician'
  const navItems = isTechnician ? TECHNICIAN_NAV : NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-[#0A1628] z-50 flex flex-col transition-transform duration-300
        w-[260px]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0066FF] rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">AURA<span className="text-[#0066FF]">+</span> ERP</div>
              <div className="text-white/40 text-[10px] tracking-widest mt-0.5">TECHNOLOGIES</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                  ${isActive
                    ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/20'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                  }
                `}
              >
                <span className={isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80 transition-colors'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <ChevronRight className="w-3 h-3 text-white/60" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section - quick stats */}
        {!isTechnician && stats && (
          <div className="px-3 py-3 border-t border-white/10 space-y-1">
            {stats.openTickets !== undefined && stats.openTickets > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5">
                <span className="text-white/50 text-xs">Open Tickets</span>
                <span className="text-amber-400 text-xs font-semibold">{stats.openTickets}</span>
              </div>
            )}
            {stats.lowStock !== undefined && stats.lowStock > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5">
                <span className="text-white/50 text-xs">Low Stock</span>
                <span className="text-red-400 text-xs font-semibold">{stats.lowStock}</span>
              </div>
            )}
            {stats.activeProjects !== undefined && stats.activeProjects > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5">
                <span className="text-white/50 text-xs">Active Projects</span>
                <span className="text-blue-400 text-xs font-semibold">{stats.activeProjects}</span>
              </div>
            )}
          </div>
        )}

        {/* User profile */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-[#0066FF]/20 rounded-full flex items-center justify-center flex-shrink-0 text-[#0066FF] font-bold text-sm">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.full_name}</div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
