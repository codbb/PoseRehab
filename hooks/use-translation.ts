'use client'

import { useCallback } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import ko from '@/locales/ko.json'
import en from '@/locales/en.json'

type TranslationKeys = typeof ko
type NestedKeyOf<T, K = keyof T> = K extends keyof T & string
  ? T[K] extends object
    ? `${K}.${NestedKeyOf<T[K]>}`
    : K
  : never

type TranslationKey = NestedKeyOf<TranslationKeys>

const translations = {
  ko,
  en,
}

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Return the key itself if not found
    }
  }

  return typeof result === 'string' ? result : path
}

export function useTranslation() {
  const { language } = useSettingsStore()

  const t = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>): string => {
      const translation = getNestedValue(translations[language], key)

      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, value]) => str.replace(`{${paramKey}}`, String(value)),
          translation
        )
      }

      return translation
    },
    [language]
  )

  return { t, language }
}

export function getTranslation(language: 'ko' | 'en', key: string): string {
  return getNestedValue(translations[language], key)
}
