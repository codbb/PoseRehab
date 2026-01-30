'use client'

import { motion } from 'framer-motion'
import { Clock, Target, Flame, Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/hooks/use-translation'
import { formatTime, formatDate } from '@/lib/utils'
import type { ExerciseRecord } from '@/types/exercise'
import type { GameScore } from '@/types/game'

interface DayDetailProps {
  date: Date
  exerciseRecords: ExerciseRecord[]
  gameScores: GameScore[]
}

export function DayDetail({ date, exerciseRecords, gameScores }: DayDetailProps) {
  const { language } = useTranslation()

  const totalExerciseTime = exerciseRecords.reduce((sum, r) => sum + r.duration, 0)
  const totalReps = exerciseRecords.reduce((sum, r) => sum + r.reps, 0)
  const avgAccuracy =
    exerciseRecords.length > 0
      ? exerciseRecords.reduce((sum, r) => sum + r.averageAccuracy, 0) / exerciseRecords.length
      : 0

  const hasData = exerciseRecords.length > 0 || gameScores.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="mx-auto mb-4 h-12 w-12 text-text-secondary opacity-50" />
          <p className="text-text-secondary">
            {language === 'ko'
              ? '이 날의 운동 기록이 없습니다'
              : 'No exercise records for this day'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date Header */}
      <div className="text-lg font-semibold text-text-primary">
        {formatDate(date, language === 'ko' ? 'ko-KR' : 'en-US')}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-2 h-5 w-5 text-primary" />
              <div className="text-xl font-bold text-text-primary">
                {formatTime(totalExerciseTime)}
              </div>
              <div className="text-xs text-text-secondary">
                {language === 'ko' ? '운동 시간' : 'Time'}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="mx-auto mb-2 h-5 w-5 text-secondary" />
              <div className="text-xl font-bold text-text-primary">{totalReps}</div>
              <div className="text-xs text-text-secondary">
                {language === 'ko' ? '총 반복' : 'Reps'}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-2 h-5 w-5 text-warning" />
              <div className="text-xl font-bold text-text-primary">
                {avgAccuracy.toFixed(0)}%
              </div>
              <div className="text-xs text-text-secondary">
                {language === 'ko' ? '평균 정확도' : 'Accuracy'}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Exercise Records */}
      {exerciseRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'ko' ? '운동 기록' : 'Exercise Records'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {exerciseRecords.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between rounded-lg bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">
                      {record.exerciseName}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {record.reps} {language === 'ko' ? '회' : 'reps'} ·{' '}
                      {formatTime(record.duration)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-secondary">
                    {record.averageAccuracy.toFixed(0)}%
                  </div>
                  <div className="text-xs text-text-secondary">
                    {language === 'ko' ? '정확도' : 'Accuracy'}
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Game Scores */}
      {gameScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'ko' ? '게임 기록' : 'Game Records'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gameScores.map((score, index) => {
              const gameNames: Record<string, { ko: string; en: string }> = {
                'rhythm-grip': { ko: '리듬 그립', en: 'Rhythm Grip' },
                'pose-match': { ko: '자세 맞추기', en: 'Pose Match' },
                'fruit-ninja': { ko: '과일 닌자', en: 'Fruit Ninja' },
              }
              const gameName = gameNames[score.gameType]?.[language === 'ko' ? 'ko' : 'en'] || score.gameType

              return (
                <motion.div
                  key={score.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-lg bg-background p-3"
                >
                  <div>
                    <div className="font-medium text-text-primary">{gameName}</div>
                    <div className="text-xs text-text-secondary">
                      {score.difficulty} · {score.maxCombo}x combo
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">
                      {score.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {language === 'ko' ? '점수' : 'Score'}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
