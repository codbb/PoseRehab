'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import type { GaitChartData } from '@/types/gait'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface ResultChartProps {
  chartData: GaitChartData
  className?: string
}

// 무릎 각도 차트 (결과 페이지용 - 저장된 chartData에서 렌더링)
export function ResultKneeAngleChart({ chartData, className }: ResultChartProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    if (chartData.timestamps.length === 0) return []
    return chartData.timestamps.map((t, i) => ({
      time: (t / 1000).toFixed(1),
      leftKnee: chartData.leftKneeAngles[i] ?? 0,
      rightKnee: chartData.rightKneeAngles[i] ?? 0,
    }))
  }, [chartData])

  if (data.length < 2) return null

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '무릎 각도 변화' : 'Knee Angle Changes'}
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="time"
            stroke="var(--text-secondary)"
            fontSize={10}
            tickFormatter={(value) => `${value}s`}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--text-secondary)"
            fontSize={10}
            domain={[0, 120]}
            tickFormatter={(value) => `${value}°`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}°`]}
            labelFormatter={(value) => `${value}s`}
          />
          <Line
            type="monotone"
            dataKey="leftKnee"
            name={language === 'ko' ? '왼쪽' : 'Left'}
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="rightKnee"
            name={language === 'ko' ? '오른쪽' : 'Right'}
            stroke="#6366F1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          {language === 'ko' ? '왼쪽' : 'Left'}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          {language === 'ko' ? '오른쪽' : 'Right'}
        </span>
      </div>
    </div>
  )
}

// 엉덩이 각도 차트 (결과 페이지용)
export function ResultHipAngleChart({ chartData, className }: ResultChartProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    if (chartData.timestamps.length === 0) return []
    return chartData.timestamps.map((t, i) => ({
      time: (t / 1000).toFixed(1),
      leftHip: chartData.leftHipAngles[i] ?? 0,
      rightHip: chartData.rightHipAngles[i] ?? 0,
    }))
  }, [chartData])

  if (data.length < 2) return null

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '엉덩이 각도 변화' : 'Hip Angle Changes'}
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="time"
            stroke="var(--text-secondary)"
            fontSize={10}
            tickFormatter={(value) => `${value}s`}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--text-secondary)"
            fontSize={10}
            domain={[0, 60]}
            tickFormatter={(value) => `${value}°`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}°`]}
            labelFormatter={(value) => `${value}s`}
          />
          <Line
            type="monotone"
            dataKey="leftHip"
            name={language === 'ko' ? '왼쪽' : 'Left'}
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="rightHip"
            name={language === 'ko' ? '오른쪽' : 'Right'}
            stroke="#EC4899"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          {language === 'ko' ? '왼쪽' : 'Left'}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-pink-500" />
          {language === 'ko' ? '오른쪽' : 'Right'}
        </span>
      </div>
    </div>
  )
}

// 발목 높이 차트 (결과 페이지용)
export function ResultAnkleHeightChart({ chartData, className }: ResultChartProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    if (chartData.timestamps.length === 0) return []
    return chartData.timestamps.map((t, i) => ({
      time: (t / 1000).toFixed(1),
      leftAnkle: chartData.leftAnkleHeights[i] ?? 0,
      rightAnkle: chartData.rightAnkleHeights[i] ?? 0,
    }))
  }, [chartData])

  if (data.length < 2) return null

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '발목 높이 변화' : 'Ankle Height Changes'}
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="time"
            stroke="var(--text-secondary)"
            fontSize={10}
            tickFormatter={(value) => `${value}s`}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--text-secondary)"
            fontSize={10}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(value) => `${value}s`}
          />
          <Area
            type="monotone"
            dataKey="leftAnkle"
            name={language === 'ko' ? '왼쪽' : 'Left'}
            stroke="#22C55E"
            fill="#22C55E"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="rightAnkle"
            name={language === 'ko' ? '오른쪽' : 'Right'}
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          {language === 'ko' ? '왼쪽' : 'Left'}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          {language === 'ko' ? '오른쪽' : 'Right'}
        </span>
      </div>
    </div>
  )
}
