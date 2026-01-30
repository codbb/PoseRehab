'use client'

import { motion } from 'framer-motion'
import type { GaitMeasurements, MeasurementValue } from '@/types/gait'
import { GAIT_MEASUREMENT_LABELS } from '@/lib/gait-constants'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface GaitDashboardProps {
  measurements: GaitMeasurements | null
  showAll?: boolean
}

// 상태별 색상
const STATUS_COLORS = {
  normal: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/30',
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    border: 'border-red-500/30',
  },
}

// 주요 측정 항목 (기본 표시)
const PRIMARY_METRICS = [
  'gaitSpeed',
  'leftRightSymmetry',
  'kneeFlexionLeft',
  'kneeFlexionRight',
] as const

// 모든 측정 항목
const ALL_METRICS = [
  'strideLength',
  'gaitSpeed',
  'gaitCycle',
  'leftRightSymmetry',
  'kneeFlexionLeft',
  'kneeFlexionRight',
  'hipFlexionLeft',
  'hipFlexionRight',
  'trunkInclination',
  'footClearance',
] as const

function MetricCard({
  label,
  labelKo,
  value,
  unit,
  status,
  index,
}: {
  label: string
  labelKo: string
  value: number
  unit: string
  status: 'normal' | 'warning' | 'danger'
  index: number
}) {
  const { language } = useTranslation()
  const colors = STATUS_COLORS[status]
  const displayLabel = language === 'ko' ? labelKo : label

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'rounded-xl border p-4',
        colors.bg,
        colors.border,
        'transition-colors duration-300'
      )}
    >
      <div className="text-text-secondary mb-1 text-xs font-medium">
        {displayLabel}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-2xl font-bold tabular-nums', colors.text)}>
          {value.toFixed(unit === '°' || unit === '' ? 1 : 2)}
        </span>
        {unit && (
          <span className="text-text-secondary text-sm">{unit}</span>
        )}
      </div>
    </motion.div>
  )
}

export function GaitDashboard({ measurements, showAll = false }: GaitDashboardProps) {
  const { t, language } = useTranslation()

  const metrics = showAll ? ALL_METRICS : PRIMARY_METRICS

  if (!measurements) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((key, index) => {
          const config = GAIT_MEASUREMENT_LABELS[key]
          return (
            <div
              key={key}
              className="bg-surface/50 animate-pulse rounded-xl border border-border/50 p-4"
            >
              <div className="text-text-secondary mb-1 text-xs font-medium">
                {language === 'ko' ? config.ko : config.en}
              </div>
              <div className="text-text-secondary text-2xl font-bold">--</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((key, index) => {
        const measurement = measurements[key as keyof GaitMeasurements]
        const config = GAIT_MEASUREMENT_LABELS[key]

        if (!measurement) {
          return (
            <div
              key={key}
              className="bg-surface/50 rounded-xl border border-border/50 p-4"
            >
              <div className="text-text-secondary mb-1 text-xs font-medium">
                {language === 'ko' ? config.ko : config.en}
              </div>
              <div className="text-text-secondary text-2xl font-bold">--</div>
            </div>
          )
        }

        return (
          <MetricCard
            key={key}
            label={config.en}
            labelKo={config.ko}
            value={measurement.value}
            unit={measurement.unit}
            status={measurement.status}
            index={index}
          />
        )
      })}
    </div>
  )
}

// 대형 측정값 표시 (결과 화면용)
export function LargeMeasurementDisplay({
  measurement,
  label,
  labelKo,
}: {
  measurement: MeasurementValue
  label: string
  labelKo: string
}) {
  const { language } = useTranslation()
  const colors = STATUS_COLORS[measurement.status]
  const displayLabel = language === 'ko' ? labelKo : label

  return (
    <div className={cn('rounded-2xl border-2 p-6 text-center', colors.border, colors.bg)}>
      <div className="text-text-secondary mb-2 text-sm font-medium">
        {displayLabel}
      </div>
      <div className="flex items-baseline justify-center gap-2">
        <span className={cn('text-5xl font-bold tabular-nums', colors.text)}>
          {measurement.value.toFixed(measurement.unit === '°' ? 0 : 1)}
        </span>
        {measurement.unit && (
          <span className="text-text-secondary text-xl">{measurement.unit}</span>
        )}
      </div>
      <div className="text-text-secondary mt-2 text-xs">
        {language === 'ko' ? '정상 범위' : 'Normal Range'}: {measurement.idealMin} -{' '}
        {measurement.idealMax}
        {measurement.unit}
      </div>
    </div>
  )
}
