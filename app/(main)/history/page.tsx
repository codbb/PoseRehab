'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, BarChart3, Clock, Flame } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calendar, DayDetail } from '@/components/history'
import { WeeklyChart, CategoryChart } from '@/components/charts'
import { useExerciseStore } from '@/stores/exercise-store'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import { formatTime } from '@/lib/utils'

export default function HistoryPage() {
  const { language } = useTranslation()
  const { exerciseRecords, getTotalStats } = useExerciseStore()
  const { gameScores } = useGameStore()

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [activeTab, setActiveTab] = useState('calendar')

  // Get all dates with exercise records
  const exerciseDates = useMemo(() => {
    const dates = new Set<string>()

    exerciseRecords.forEach((record) => {
      dates.add(record.date)
    })

    gameScores.forEach((score) => {
      const date = new Date(score.playedAt).toISOString().split('T')[0]
      dates.add(date)
    })

    return Array.from(dates)
  }, [exerciseRecords, gameScores])

  // Get records for selected date
  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return { exercises: [], games: [] }

    const dateKey = selectedDate.toISOString().split('T')[0]

    return {
      exercises: exerciseRecords.filter((r) => r.date === dateKey),
      games: gameScores.filter(
        (s) => new Date(s.playedAt).toISOString().split('T')[0] === dateKey
      ),
    }
  }, [selectedDate, exerciseRecords, gameScores])

  const stats = getTotalStats()

  return (
    <MainLayout title={language === 'ko' ? '운동 기록' : 'Exercise History'}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-4"
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {stats.totalSessions}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '총 세션' : 'Total Sessions'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {formatTime(stats.totalTime)}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '총 시간' : 'Total Time'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Flame className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {stats.totalReps}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '총 반복' : 'Total Reps'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-error/10">
                <BarChart3 className="h-6 w-6 text-error" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {stats.averageAccuracy.toFixed(0)}%
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '평균 정확도' : 'Avg Accuracy'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="calendar">
              {language === 'ko' ? '캘린더' : 'Calendar'}
            </TabsTrigger>
            <TabsTrigger value="stats">
              {language === 'ko' ? '통계' : 'Statistics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Calendar */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  exerciseDates={exerciseDates}
                />
              </motion.div>

              {/* Day Details */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {selectedDate && (
                  <DayDetail
                    date={selectedDate}
                    exerciseRecords={selectedDateRecords.exercises}
                    gameScores={selectedDateRecords.games}
                  />
                )}
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Weekly Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {language === 'ko' ? '주간 운동 시간' : 'Weekly Exercise Time'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WeeklyChart exerciseRecords={exerciseRecords} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Category Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {language === 'ko' ? '운동 종류별 분포' : 'Exercise Distribution'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CategoryChart exerciseRecords={exerciseRecords} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
