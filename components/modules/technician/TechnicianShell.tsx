'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import {
  Wrench, Headphones, LogOut, Menu, X,
  Sun, Moon, Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TechnicianShellProps {
  user: { id: string; full_name: string; email: string; role: string }
  activeProjectsCount: number
  openTicketsCount: number
  children: React.ReactNode
}

export default function TechnicianShell({
  user, activeProjectsCount, openTicketsCount, children
}: TechnicianShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('aura-dark-mode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    {
      href: '/my-projects',
      label: 'My Projects',
      icon: <Wrench className="w-5 h-5" />,
      badge: activeProjectsCount,
    },
    {
      href: '/my-tickets',
      label: 'My Tickets',
      icon: <Headphones className="w-5 h-5" />,
      badge: openTicketsCount,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#080E1A] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#0A1628] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0066FF] rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Aura+ Technician</div>
            <div className="text-white/40 text-[10px]">Field Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDark} className="p-2 text-white/50 hover:text-white transition-colors">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-white/50 hover:text-white transition-colors md:hidden">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex w-60 bg-[#0A1628] flex-col">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(item => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#0066FF] text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 bg-[#0066FF]/20 rounded-full flex items-center justify-center text-[#0066FF] font-bold text-sm">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">{user.full_name}</div>
                <div className="text-white/40 text-xs">Technician</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-lg text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-[#0A1628] z-30 flex flex-col md:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-white/50"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium ${
                    pathname.startsWith(item.href)
                      ? 'bg-[#0066FF] text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-white/10">
              <div className="text-white/50 text-sm mb-3">{user.full_name} · {user.email}</div>
              <button onClick={handleSignOut} className="flex items-center gap-2 text-red-400 text-sm">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A1628] border-t border-white/10 flex z-30">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-[#0066FF]' : 'text-white/50 hover:text-white'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label.split(' ')[1] ?? item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
