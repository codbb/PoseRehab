'use client'

import { Bell, Globe, User } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import { useUserStore } from '@/stores/user-store'
import { useTranslation } from '@/hooks/use-translation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBackButton?: boolean
}

export function Header({ title }: HeaderProps) {
  const { language, setLanguage } = useSettingsStore()
  const { profile, level, experience } = useUserStore()
  const { t } = useTranslation()

  const expForNextLevel = level * 100
  const expPercentage = (experience / expForNextLevel) * 100

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-sm">
      {/* Title */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{language}</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error" />
        </Button>

        {/* User Profile */}
        <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {level}
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-text-primary">
              {profile?.name || t('common.guest')}
            </p>
            {/* Experience bar */}
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${expPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
