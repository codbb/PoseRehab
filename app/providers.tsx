'use client'

import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settings-store'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { theme, colorTheme } = useSettingsStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    // Apply dark mode
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // Apply color theme
    root.classList.remove('theme-blue', 'theme-green', 'theme-pink', 'theme-orange', 'theme-purple', 'theme-teal')
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`)
    }
  }, [mounted, theme, colorTheme])

  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}
