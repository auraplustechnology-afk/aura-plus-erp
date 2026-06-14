'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SessionTimeout from '@/components/modules/SessionTimeout'
import type { User } from '@/types'

interface ERPShellProps {
  user: User
  stats: {
    openTickets: number
    lowStock: number
    activeProjects: number
  }
  sessionTimeoutMinutes?: number
  children: React.ReactNode
}

export default function ERPShell({ user, stats, sessionTimeoutMinutes = 60, children }: ERPShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('aura-dark-mode')
    if (saved === 'true') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('aura-dark-mode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div className="flex h-screen bg-[#F5F7FA] dark:bg-[#080E1A] overflow-hidden">
      {/* Session timeout watcher */}
      <SessionTimeout timeoutMinutes={sessionTimeoutMinutes} />

      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        stats={stats}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          darkMode={darkMode}
          onDarkModeToggle={toggleDarkMode}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
