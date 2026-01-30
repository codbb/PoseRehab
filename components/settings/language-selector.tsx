'use client'

import { motion } from 'framer-motion'
import { Globe, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settings-store'
import { useTranslation } from '@/hooks/use-translation'

type Language = 'ko' | 'en'

const LANGUAGE_OPTIONS: { value: Language; label: string; nativeLabel: string; flag: string }[] = [
  { value: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  { value: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
]

export function LanguageSelector() {
  const { language: currentLanguage } = useTranslation()
  const { language, setLanguage } = useSettingsStore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {currentLanguage === 'ko' ? '언어 설정' : 'Language Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = language === option.value

            return (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setLanguage(option.value)}
                className={`relative flex w-full items-center gap-4 rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-2xl">{option.flag}</span>
                <div className="flex-1 text-left">
                  <p
                    className={`font-medium ${
                      isSelected ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    {option.nativeLabel}
                  </p>
                  <p className="text-sm text-text-secondary">{option.label}</p>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="languageCheck"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                  >
                    <Check className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
