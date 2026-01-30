'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useTranslation } from '@/hooks/use-translation'
import type { ExerciseRecord } from '@/types/exercise'

interface CategoryChartProps {
  exerciseRecords: ExerciseRecord[]
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function CategoryChart({ exerciseRecords }: CategoryChartProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    const categoryCount: Record<string, number> = {}

    exerciseRecords.forEach((record) => {
      const name = record.exerciseName
      categoryCount[name] = (categoryCount[name] || 0) + 1
    })

    return Object.entries(categoryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) // Top 6 exercises
  }, [exerciseRecords])

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-text-secondary">
        {language === 'ko' ? '운동 기록이 없습니다' : 'No exercise records'}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={{ stroke: 'var(--text-secondary)' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [
            `${value} ${language === 'ko' ? '회' : 'sessions'}`,
            language === 'ko' ? '횟수' : 'Count',
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
