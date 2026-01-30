'use client'

import { motion } from 'framer-motion'
import { Settings, Info } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ThemeSelector,
  LanguageSelector,
  NotificationSettings,
  DataManagement,
} from '@/components/settings'
import { useTranslation } from '@/hooks/use-translation'

export default function SettingsPage() {
  const { language } = useTranslation()

  return (
    <MainLayout title={language === 'ko' ? '설정' : 'Settings'}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Theme Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ThemeSelector />
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <LanguageSelector />
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <NotificationSettings />
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DataManagement />
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {language === 'ko' ? '앱 정보' : 'App Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {language === 'ko' ? '버전' : 'Version'}
                </span>
                <span className="font-medium text-text-primary">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {language === 'ko' ? '개발' : 'Developed by'}
                </span>
                <span className="font-medium text-text-primary">PostureAI Team</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {language === 'ko' ? '기술 스택' : 'Tech Stack'}
                </span>
                <span className="font-medium text-text-primary">
                  Next.js, MediaPipe
                </span>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-xs text-text-secondary text-center">
                  {language === 'ko'
                    ? 'PostureAI는 AI 기반 자세 분석 및 재활 운동 애플리케이션입니다. 의료 진단을 대체하지 않으며, 건강 문제는 전문의와 상담하세요.'
                    : 'PostureAI is an AI-powered posture analysis and rehabilitation application. It does not replace medical diagnosis. Consult a healthcare professional for health concerns.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  )
}
