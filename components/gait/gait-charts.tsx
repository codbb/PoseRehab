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
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import type { GaitFrame, GaitMeasurements } from '@/types/gait'
import { GAIT_MEASUREMENT_LABELS } from '@/lib/gait-constants'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface GaitChartsProps {
  frames: GaitFrame[]
  className?: string
}

// 최근 5초 데이터만 추출 (약 150프레임 @ 30fps)
function getRecentFrames(frames: GaitFrame[], seconds: number = 5): GaitFrame[] {
  if (frames.length === 0) return []

  const fps = 30
  const maxFrames = fps * seconds
  return frames.slice(-maxFrames)
}

// 무릎 각도 변화 차트 (롤링 5초)
export function KneeAngleChart({ frames, className }: GaitChartsProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    const recentFrames = getRecentFrames(frames, 5)
    if (recentFrames.length === 0) return []

    const startTime = recentFrames[0].timestamp

    return recentFrames.map((frame) => ({
      time: ((frame.timestamp - startTime) / 1000).toFixed(1),
      leftKnee: Math.round(frame.leftKneeAngle || 0),
      rightKnee: Math.round(frame.rightKneeAngle || 0),
    }))
  }, [frames])

  if (data.length < 2) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium">
          {language === 'ko' ? '무릎 각도 변화' : 'Knee Angle Changes'}
        </h4>
        <div className="text-text-secondary flex h-32 items-center justify-center text-sm">
          {language === 'ko' ? '데이터 수집 중...' : 'Collecting data...'}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '무릎 각도 변화' : 'Knee Angle Changes'}
      </h4>
      <ResponsiveContainer width="100%" height={160}>
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
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rightKnee"
            name={language === 'ko' ? '오른쪽' : 'Right'}
            stroke="#6366F1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
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

// 엉덩이 각도 변화 차트 (롤링 5초)
export function HipAngleChart({ frames, className }: GaitChartsProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    const recentFrames = getRecentFrames(frames, 5)
    if (recentFrames.length === 0) return []

    const startTime = recentFrames[0].timestamp

    return recentFrames.map((frame) => ({
      time: ((frame.timestamp - startTime) / 1000).toFixed(1),
      leftHip: Math.round(frame.leftHipAngle || 0),
      rightHip: Math.round(frame.rightHipAngle || 0),
    }))
  }, [frames])

  if (data.length < 2) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium">
          {language === 'ko' ? '엉덩이 각도 변화' : 'Hip Angle Changes'}
        </h4>
        <div className="text-text-secondary flex h-32 items-center justify-center text-sm">
          {language === 'ko' ? '데이터 수집 중...' : 'Collecting data...'}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '엉덩이 각도 변화' : 'Hip Angle Changes'}
      </h4>
      <ResponsiveContainer width="100%" height={160}>
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
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rightHip"
            name={language === 'ko' ? '오른쪽' : 'Right'}
            stroke="#EC4899"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
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

// 발목 높이 변화 차트 (롤링 5초)
export function AnkleHeightChart({ frames, className }: GaitChartsProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    const recentFrames = getRecentFrames(frames, 5)
    if (recentFrames.length === 0) return []

    const startTime = recentFrames[0].timestamp

    // 발목 Y 좌표 반전 (화면 좌표계에서 높이로 변환)
    return recentFrames.map((frame) => ({
      time: ((frame.timestamp - startTime) / 1000).toFixed(1),
      leftAnkle: Math.round((1 - (frame.leftAnkleY || 0.5)) * 100),
      rightAnkle: Math.round((1 - (frame.rightAnkleY || 0.5)) * 100),
    }))
  }, [frames])

  if (data.length < 2) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium">
          {language === 'ko' ? '발목 높이 변화' : 'Ankle Height Changes'}
        </h4>
        <div className="text-text-secondary flex h-32 items-center justify-center text-sm">
          {language === 'ko' ? '데이터 수집 중...' : 'Collecting data...'}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '발목 높이 변화' : 'Ankle Height Changes'}
      </h4>
      <ResponsiveContainer width="100%" height={160}>
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
            isAnimationActive={false}
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
            isAnimationActive={false}
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

// 실시간 각도 변화 차트 (기존 호환성 유지)
export function AngleChart({ frames, className }: GaitChartsProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    const recentFrames = getRecentFrames(frames, 5)
    if (recentFrames.length === 0) return []

    const startTime = recentFrames[0].timestamp

    return recentFrames.map((frame) => ({
      time: ((frame.timestamp - startTime) / 1000).toFixed(1),
      leftKnee: Math.round(frame.leftKneeAngle || 0),
      rightKnee: Math.round(frame.rightKneeAngle || 0),
      leftHip: Math.round(frame.leftHipAngle || 0),
      rightHip: Math.round(frame.rightHipAngle || 0),
    }))
  }, [frames])

  if (data.length < 2) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium">
          {language === 'ko' ? '관절 각도 변화' : 'Joint Angle Changes'}
        </h4>
        <div className="text-text-secondary flex h-40 items-center justify-center text-sm">
          {language === 'ko' ? '데이터 수집 중...' : 'Collecting data...'}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '관절 각도 변화' : 'Joint Angle Changes'}
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
            name={language === 'ko' ? '왼쪽 무릎' : 'Left Knee'}
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rightKnee"
            name={language === 'ko' ? '오른쪽 무릎' : 'Right Knee'}
            stroke="#6366F1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          {language === 'ko' ? '왼쪽 무릎' : 'Left Knee'}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          {language === 'ko' ? '오른쪽 무릎' : 'Right Knee'}
        </span>
      </div>
    </div>
  )
}

// 좌우 비교 막대 차트
export function SymmetryChart({
  measurements,
  className,
}: {
  measurements: GaitMeasurements | null
  className?: string
}) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    if (!measurements) return []

    return [
      {
        name: language === 'ko' ? '무릎 굴곡' : 'Knee',
        left: Math.round(measurements.kneeFlexionLeft?.value || 0),
        right: Math.round(measurements.kneeFlexionRight?.value || 0),
      },
      {
        name: language === 'ko' ? '엉덩이 굴곡' : 'Hip',
        left: Math.round(measurements.hipFlexionLeft?.value || 0),
        right: Math.round(measurements.hipFlexionRight?.value || 0),
      },
    ]
  }, [measurements, language])

  if (!measurements) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium">
          {language === 'ko' ? '좌우 비교' : 'L/R Comparison'}
        </h4>
        <div className="text-text-secondary flex h-32 items-center justify-center text-sm">
          {language === 'ko' ? '데이터 없음' : 'No data'}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-2 text-sm font-medium">
        {language === 'ko' ? '좌우 비교' : 'L/R Comparison'}
      </h4>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            type="number"
            stroke="var(--text-secondary)"
            fontSize={10}
            domain={[0, 90]}
            tickFormatter={(value) => `${value}°`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="var(--text-secondary)"
            fontSize={10}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}°`]}
          />
          <Bar
            dataKey="left"
            name={language === 'ko' ? '왼쪽' : 'Left'}
            fill="#10B981"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="right"
            name={language === 'ko' ? '오른쪽' : 'Right'}
            fill="#6366F1"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* 대칭성 점수 */}
      {measurements.leftRightSymmetry && (
        <div className="mt-2 text-center">
          <span className="text-text-secondary text-xs">
            {language === 'ko' ? '대칭성' : 'Symmetry'}:{' '}
          </span>
          <span
            className={cn(
              'font-bold',
              measurements.leftRightSymmetry.status === 'normal'
                ? 'text-emerald-500'
                : measurements.leftRightSymmetry.status === 'warning'
                ? 'text-amber-500'
                : 'text-red-500'
            )}
          >
            {(measurements.leftRightSymmetry.value * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

// 보행 히스토리 트렌드 차트
export function GaitTrendChart({
  history,
  metric,
  className,
}: {
  history: Array<{ timestamp: string; value: number }>
  metric: keyof typeof GAIT_MEASUREMENT_LABELS
  className?: string
}) {
  const { language } = useTranslation()
  const config = GAIT_MEASUREMENT_LABELS[metric]

  const data = useMemo(() => {
    return history.slice(-10).map((item, index) => ({
      index: index + 1,
      date: new Date(item.timestamp).toLocaleDateString(),
      value: item.value,
    }))
  }, [history])

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      <h4 className="text-text-primary mb-4 text-sm font-medium">
        {language === 'ko' ? config.ko : config.en} {language === 'ko' ? '추이' : 'Trend'}
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="index"
            stroke="var(--text-secondary)"
            fontSize={10}
          />
          <YAxis
            stroke="var(--text-secondary)"
            fontSize={10}
            domain={[
              Math.min(config.idealMin * 0.8, Math.min(...data.map((d) => d.value))),
              Math.max(config.idealMax * 1.2, Math.max(...data.map((d) => d.value))),
            ]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
          />
          {/* 정상 범위 표시 */}
          <ReferenceLine
            y={config.idealMin}
            stroke="#10B981"
            strokeDasharray="3 3"
            label={{ value: 'Min', fill: '#10B981', fontSize: 10 }}
          />
          <ReferenceLine
            y={config.idealMax}
            stroke="#10B981"
            strokeDasharray="3 3"
            label={{ value: 'Max', fill: '#10B981', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={language === 'ko' ? config.ko : config.en}
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ fill: '#6366F1', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
