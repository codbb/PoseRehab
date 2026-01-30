'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings-store'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function MainLayout({ children, title, className }: MainLayoutProps) {
  const { sidebarCollapsed } = useSettingsStore()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed ? 72 : 210,
        }}
      >
        <Header title={title} />
        <main className={cn('p-6', className)}>{children}</main>
      </div>
    </div>
  )
}
