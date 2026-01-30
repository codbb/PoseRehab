'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Scan,
  Dumbbell,
  Calendar,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  Lightbulb,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CircularProgress, Progress } from '@/components/ui/progress'
import { useTranslation } from '@/hooks/use-translation'
import { useUserStore } from '@/stores/user-store'
import { useExerciseStore } from '@/stores/exercise-store'
import { usePostureStore } from '@/stores/posture-store'
import { EXERCISES } from '@/lib/constants'
import { formatTime, getScoreColor, getScoreLabel } from '@/lib/utils'

export default function DashboardPage() {
  const { t, language } = useTranslation()
  const { profile, postureScore, goals } = useUserStore()
  const { getTotalStats, exerciseRecords } = useExerciseStore()
  const { currentAnalysis } = usePostureStore()

  const stats = getTotalStats()

  // Calculate weekly stats
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const weeklyRecords = exerciseRecords.filter((r) => {
    const recordDate = new Date(r.date)
    return recordDate >= weekStart
  })

  const weeklyDays = new Set(weeklyRecords.map((r) => r.date)).size
  const weeklyTime = weeklyRecords.reduce((sum, r) => sum + r.duration, 0)

  // Recommended exercises based on goals
  const recommendedExercises = EXERCISES.slice(0, 3)

  // Tips
  const tips = [
    { key: 'posture', icon: '🧘' },
    { key: 'stretch', icon: '🤸' },
    { key: 'water', icon: '💧' },
  ]
  const randomTip = tips[Math.floor(Math.random() * tips.length)]

  return (
    <MainLayout title={t('dashboard.title')}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Posture Score Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {t('dashboard.postureScore')}
                  </h3>
                  {postureScore ? (
                    <>
                      <p className={`mt-1 text-3xl font-bold ${getScoreColor(postureScore)}`}>
                        {postureScore}
                        <span className="text-lg text-text-secondary">/100</span>
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {getScoreLabel(postureScore, language)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-text-secondary">
                      {t('dashboard.noScoreYet')}
                    </p>
                  )}
                </div>

                {postureScore ? (
                  <CircularProgress
                    value={postureScore}
                    size={100}
                    strokeWidth={8}
                    variant={postureScore >= 80 ? 'success' : postureScore >= 60 ? 'warning' : 'error'}
                  />
                ) : (
                  <Link href="/posture-analysis">
                    <Button className="gap-2">
                      <Scan className="h-4 w-4" />
                      {t('dashboard.measureNow')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Recommended Exercises */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {t('dashboard.todayExercise')}
                </CardTitle>
                <Link href="/exercise/list">
                  <Button variant="ghost" size="sm" className="gap-1">
                    {t('common.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendedExercises.map((exercise, index) => (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={`/exercise/workout?id=${exercise.id}`}>
                      <div className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-background">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Dumbbell className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary">
                            {language === 'ko' ? exercise.nameKo : exercise.name}
                          </h4>
                          <p className="text-sm text-text-secondary">
                            {exercise.defaultReps} {t('exercise.list.reps')} x {exercise.defaultSets} {t('exercise.list.sets')}
                          </p>
                        </div>
                        <div className="text-sm text-text-secondary">
                          {exercise.duration}s
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t('dashboard.weeklyProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        {weeklyDays}
                        <span className="text-sm text-text-secondary">/7</span>
                      </p>
                      <p className="text-sm text-text-secondary">
                        {t('dashboard.exerciseDays')}
                      </p>
                    </div>
                  </div>
                  <Progress value={(weeklyDays / 7) * 100} className="mt-3" />
                </div>

                <div className="rounded-lg bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                      <Clock className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        {formatTime(weeklyTime)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {t('dashboard.totalTime')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('history.stats.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t('history.stats.totalSessions')}
                </span>
                <span className="font-semibold text-text-primary">
                  {stats.totalSessions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t('history.stats.totalTime')}
                </span>
                <span className="font-semibold text-text-primary">
                  {formatTime(stats.totalTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t('history.stats.avgAccuracy')}
                </span>
                <span className="font-semibold text-text-primary">
                  {stats.averageAccuracy.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Report Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t('dashboard.weeklyReport')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {weeklyDays} {t('dashboard.exerciseDays')}
                    </p>
                    <Progress value={(weeklyDays / 7) * 100} className="mt-1" size="sm" />
                  </div>
                </div>
              </div>
              <Link href="/history">
                <Button variant="outline" className="mt-4 w-full">
                  {t('dashboard.viewReport')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Daily Tip */}
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
                  <Lightbulb className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-medium text-text-primary">
                    {t('dashboard.tips.title')}
                  </h4>
                  <p className="mt-1 text-sm text-text-secondary">
                    {randomTip.icon} {t(`dashboard.tips.${randomTip.key}`)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
