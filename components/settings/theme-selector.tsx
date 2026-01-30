'use client'

import { motion } from 'framer-motion'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settings-store'
import { useTranslation } from '@/hooks/use-translation'

type Theme = 'light' | 'dark' | 'system'
type ColorTheme = 'default' | 'blue' | 'green' | 'pink' | 'orange' | 'purple' | 'teal'

const THEME_OPTIONS: { value: Theme; icon: typeof Sun; label: string; labelKo: string }[] = [
  { value: 'light', icon: Sun, label: 'Light', labelKo: '라이트' },
  { value: 'dark', icon: Moon, label: 'Dark', labelKo: '다크' },
  { value: 'system', icon: Monitor, label: 'System', labelKo: '시스템' },
]

const COLOR_OPTIONS: { value: ColorTheme; color: string; label: string; labelKo: string }[] = [
  { value: 'default', color: '#6366F1', label: 'Indigo', labelKo: '인디고' },
  { value: 'blue', color: '#3B82F6', label: 'Blue', labelKo: '블루' },
  { value: 'green', color: '#10B981', label: 'Green', labelKo: '그린' },
  { value: 'pink', color: '#EC4899', label: 'Pink', labelKo: '핑크' },
  { value: 'orange', color: '#F59E0B', label: 'Orange', labelKo: '오렌지' },
  { value: 'purple', color: '#8B5CF6', label: 'Purple', labelKo: '퍼플' },
]

export function ThemeSelector() {
  const { language } = useTranslation()
  const { theme, setTheme, colorTheme, setColorTheme } = useSettingsStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ko' ? '테마 설정' : 'Theme Settings'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Mode */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            {language === 'ko' ? '모드' : 'Mode'}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = theme === option.value

              return (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(option.value)}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isSelected ? 'text-primary' : 'text-text-secondary'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isSelected ? 'text-primary font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {language === 'ko' ? option.labelKo : option.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="themeCheck"
                      className="absolute top-2 right-2"
                    >
                      <Check className="h-4 w-4 text-primary" />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Color Theme */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            {language === 'ko' ? '컬러 테마' : 'Color Theme'}
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COLOR_OPTIONS.map((option) => {
              const isSelected = colorTheme === option.value

              return (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setColorTheme(option.value)}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="text-xs text-text-secondary">
                    {language === 'ko' ? option.labelKo : option.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="colorCheck"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary"
                    >
                      <Check className="h-3 w-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
