'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Scan,
  ClipboardList,
  Dumbbell,
  Hand,
  Ruler,
  Footprints,
  PersonStanding,
  Gamepad2,
  History,
  Brain,
  Settings,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Palette,
  FolderClock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore, type Theme, type ColorTheme } from '@/stores/settings-store'
import { useTranslation } from '@/hooks/use-translation'

const navItems = [
  { href: '/dashboard', icon: Home, labelKey: 'nav.home' },
  // TODO: 추후 업그레이드 후 활성화
  // { href: '/posture-analysis', icon: Scan, labelKey: 'nav.postureAnalysis' },
  { href: '/posture-analysis/ai-3d', icon: Brain, labelKey: 'nav.ai3dAnalysis' },
  { href: '/posture-analysis/ai-3d/history', icon: FolderClock, labelKey: 'nav.ai3dHistory' },
  // TODO: 추후 업그레이드 후 활성화
  // { href: '/posture-analysis/history', icon: ClipboardList, labelKey: 'nav.analysisHistory' },
  { href: '/exercise/list', icon: Dumbbell, labelKey: 'nav.exercise' },
  { href: '/exercise/hand-rehab', icon: Hand, labelKey: 'nav.handRehab' },
  { href: '/rom-measurement', icon: Ruler, labelKey: 'nav.romMeasurement' },
  { href: '/gait-analysis', icon: Footprints, labelKey: 'nav.gaitAnalysis' },
  // TODO: 추후 업그레이드 후 활성화
  // { href: '/avatar', icon: PersonStanding, labelKey: 'nav.avatar' },
  // TODO: 추후 업그레이드 후 활성화
  // { href: '/exercise/games', icon: Gamepad2, labelKey: 'nav.games' },
  { href: '/history', icon: History, labelKey: 'nav.history' },
  // TODO: 추후 업그레이드 후 활성화
  // { href: '/prediction', icon: Brain, labelKey: 'nav.prediction' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

const themeOptions: { value: Theme; icon: React.ElementType; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'theme.system' },
]

const colorOptions: { value: ColorTheme; color: string }[] = [
  { value: 'default', color: '#6366F1' },
  { value: 'blue', color: '#3B82F6' },
  { value: 'green', color: '#10B981' },
  { value: 'pink', color: '#EC4899' },
  { value: 'orange', color: '#F97316' },
  { value: 'purple', color: '#8B5CF6' },
  { value: 'teal', color: '#14B8A6' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, colorTheme, sidebarCollapsed, setTheme, setColorTheme, toggleSidebar } = useSettingsStore()
  const { t } = useTranslation()
  const [showColorPicker, setShowColorPicker] = useState(false)

  // store 상태 사용
  const isCollapsed = sidebarCollapsed

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 210 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-surface"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <span className="font-semibold text-text-primary">PostureAI</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-text-secondary hover:bg-background hover:text-text-primary"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          // Exact match for specific routes, prefix match for parent routes
          // Handle special cases for routes with sub-routes that should have exact matches
          const isActive = item.href === '/posture-analysis'
            ? pathname === '/posture-analysis'
            : item.href === '/posture-analysis/ai-3d'
            ? pathname === '/posture-analysis/ai-3d'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-background hover:text-text-primary'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="truncate text-sm font-medium"
                  >
                    {t(item.labelKey)}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Theme Section */}
      <div className="border-t border-border px-3 py-4">
        {/* Theme Mode */}
        <div className="mb-4 flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-xs font-medium text-text-secondary">
              {t('theme.mode')}
            </span>
          )}
          <div className={cn('flex gap-1', isCollapsed && 'flex-col')}>
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  theme === option.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                )}
                title={t(option.labelKey)}
              >
                <option.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Color Theme */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              'text-text-secondary hover:bg-background hover:text-text-primary'
            )}
          >
            <Palette className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">{t('theme.color')}</span>
            )}
            <div
              className="ml-auto h-4 w-4 rounded-full border border-border"
              style={{
                backgroundColor:
                  colorOptions.find((c) => c.value === colorTheme)?.color ||
                  colorOptions[0].color,
              }}
            />
          </button>

          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'absolute bottom-full mb-2 rounded-lg border border-border bg-surface p-2 shadow-lg',
                  isCollapsed ? 'left-0' : 'left-0 right-0'
                )}
              >
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setColorTheme(option.value)
                        setShowColorPicker(false)
                      }}
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                        colorTheme === option.value
                          ? 'border-text-primary'
                          : 'border-transparent'
                      )}
                      style={{ backgroundColor: option.color }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
