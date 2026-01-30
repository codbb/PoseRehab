'use client'

import { Bell, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settings-store'
import { useTranslation } from '@/hooks/use-translation'

export function NotificationSettings() {
  const { language } = useTranslation()
  const { notifications, setNotifications } = useSettingsStore()

  const handleToggle = (key: keyof typeof notifications) => {
    if (key === 'reminderTime') return
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    })
  }

  const handleTimeChange = (time: string) => {
    setNotifications({
      ...notifications,
      reminderTime: time,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {language === 'ko' ? '알림 설정' : 'Notification Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise Reminder */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text-primary">
                {language === 'ko' ? '운동 리마인더' : 'Exercise Reminder'}
              </p>
              <p className="text-sm text-text-secondary">
                {language === 'ko'
                  ? '매일 운동 알림을 받습니다'
                  : 'Get daily exercise notifications'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('exerciseReminder')}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              notifications.exerciseReminder ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                notifications.exerciseReminder ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {/* Reminder Time */}
        {notifications.exerciseReminder && (
          <div className="ml-4 flex items-center gap-4 rounded-lg bg-background p-4">
            <span className="text-sm text-text-secondary">
              {language === 'ko' ? '알림 시간' : 'Reminder Time'}
            </span>
            <input
              type="time"
              value={notifications.reminderTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {/* Weekly Report */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <FileText className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="font-medium text-text-primary">
                {language === 'ko' ? '주간 리포트' : 'Weekly Report'}
              </p>
              <p className="text-sm text-text-secondary">
                {language === 'ko'
                  ? '매주 운동 통계를 받습니다'
                  : 'Get weekly exercise statistics'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('weeklyReport')}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              notifications.weeklyReport ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                notifications.weeklyReport ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
