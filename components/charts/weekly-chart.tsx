'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from '@/hooks/use-translation'
import type { ExerciseRecord } from '@/types/exercise'

interface WeeklyChartProps {
  exerciseRecords: ExerciseRecord[]
}

export function WeeklyChart({ exerciseRecords }: WeeklyChartProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    const today = new Date()
    const weekDays = language === 'ko'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    return last7Days.map((date) => {
      const dateKey = date.toISOString().split('T')[0]
      const dayRecords = exerciseRecords.filter((r) => r.date === dateKey)
      const totalMinutes = dayRecords.reduce((sum, r) => sum + r.duration, 0) / 60

      return {
        day: weekDays[date.getDay()],
        date: date.getDate(),
        minutes: Math.round(totalMinutes * 10) / 10,
      }
    })
  }, [exerciseRecords, language])

  if (exerciseRecords.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-text-secondary">
        {language === 'ko' ? '운동 기록이 없습니다' : 'No exercise records'}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border)' }}
          label={{
            value: language === 'ko' ? '분' : 'min',
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--text-secondary)',
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'var(--text-primary)' }}
          formatter={(value: number) => [
            `${value} ${language === 'ko' ? '분' : 'min'}`,
            language === 'ko' ? '운동 시간' : 'Exercise Time',
          ]}
        />
        <Bar
          dataKey="minutes"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
