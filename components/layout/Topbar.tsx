'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, Sun, Moon, Search, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface TopbarProps {
  user: User
  onMenuClick: () => void
  darkMode: boolean
  onDarkModeToggle: () => void
  pageTitle?: string
}

export default function Topbar({ user, onMenuClick, darkMode, onDarkModeToggle, pageTitle }: TopbarProps) {
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white dark:bg-[#0F1C2E] border-b border-[#E2E8F0] dark:border-[#1E2A3B] flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 text-slate-500 hover:text-[#0A1628] dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2A3B]"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      {pageTitle && (
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold text-[#0A1628] dark:text-white">{pageTitle}</h1>
        </div>
      )}

      <div className="flex-1" />

      {/* Search */}
      <a
        href="/search"
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#1E2A3B] rounded-lg text-slate-400 text-sm hover:bg-slate-200 dark:hover:bg-[#253548] transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="hidden lg:block text-[10px] bg-white dark:bg-[#0F1C2E] text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#1E2A3B]">⌘K</kbd>
      </a>

      {/* Dark mode toggle */}
      <button
        onClick={onDarkModeToggle}
        className="p-1.5 text-slate-500 hover:text-[#0A1628] dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2A3B]"
      >
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notifications */}
      <button className="relative p-1.5 text-slate-500 hover:text-[#0A1628] dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2A3B]">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#0066FF] rounded-full" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2A3B] transition-colors"
        >
          <div className="w-7 h-7 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-bold text-xs">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-sm font-medium text-[#0A1628] dark:text-white max-w-[100px] truncate">
            {user.full_name.split(' ')[0]}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#0F1C2E] border border-[#E2E8F0] dark:border-[#1E2A3B] rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
                <div className="text-sm font-semibold text-[#0A1628] dark:text-white truncate">{user.full_name}</div>
                <div className="text-xs text-slate-400 truncate">{user.email}</div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/settings/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2A3B] transition-colors"
                >
                  <UserIcon className="w-4 h-4" /> My Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
