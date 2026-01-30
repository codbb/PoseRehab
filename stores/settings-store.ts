import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type ColorTheme = 'default' | 'blue' | 'green' | 'pink' | 'orange' | 'purple' | 'teal'
export type Language = 'ko' | 'en'

interface SettingsState {
  theme: Theme
  colorTheme: ColorTheme
  language: Language
  sidebarCollapsed: boolean
  notifications: {
    exerciseReminder: boolean
    reminderTime: string
    weeklyReport: boolean
  }
  setTheme: (theme: Theme) => void
  setColorTheme: (colorTheme: ColorTheme) => void
  setLanguage: (language: Language) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setNotifications: (notifications: Partial<SettingsState['notifications']>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'default',
      language: 'ko',
      sidebarCollapsed: false,
      notifications: {
        exerciseReminder: true,
        reminderTime: '09:00',
        weeklyReport: true,
      },
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setLanguage: (language) => set({ language }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),
    }),
    {
      name: 'posture-ai-settings',
    }
  )
)
