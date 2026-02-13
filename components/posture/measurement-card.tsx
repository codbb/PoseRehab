'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'
import type { RiskFactor } from '@/lib/analysis/risk-factors'

export type RiskStatus = 'normal' | 'warning' | 'danger'

export interface MeasurementCardProps {
  name: string
  nameKo: string
  value: number
  unit: string
  status: RiskStatus
  threshold: { warning: number; danger: number }
  description?: string
  descriptionKo?: string
  /** Whether higher values are worse (default: true) */
  higherIsWorse?: boolean
  /** Contributing factors for this risk */
  factors?: RiskFactor[]
}

export function MeasurementCard({
  name,
  nameKo,
  value,
  unit,
  status,
  threshold,
  description,
  descriptionKo,
  higherIsWorse = true,
  factors,
}: MeasurementCardProps) {
  const { language } = useTranslation()

  const displayName = language === 'ko' ? nameKo : name
  const displayDescription = language === 'ko' ? descriptionKo : description

  // Calculate gauge percentages
  const maxVal = threshold.danger * 1.5
  const valuePct = Math.min((Math.abs(value) / maxVal) * 100, 100)
  const warningPct = (threshold.warning / maxVal) * 100
  const dangerPct = (threshold.danger / maxVal) * 100

  // Status badge config
  const statusConfig = {
    normal: {
      label: language === 'ko' ? '유지' : 'Maintain',
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
    warning: {
      label: language === 'ko' ? '경계' : 'Caution',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    danger: {
      label: language === 'ko' ? '심각' : 'Severe',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
  }

  const currentStatus = statusConfig[status]

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3">
      {/* Header: Name + Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-primary">{displayName}</span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            currentStatus.className
          )}
        >
          {currentStatus.label}
        </span>
      </div>

      {/* Value Display */}
      <div className="flex items-baseline gap-1 mb-2">
        <span
          className={cn(
            'text-2xl font-bold',
            status === 'normal' && 'text-green-400',
            status === 'warning' && 'text-yellow-400',
            status === 'danger' && 'text-red-400'
          )}
        >
          {Math.abs(value).toFixed(1)}
        </span>
        <span className="text-sm text-text-secondary">{unit}</span>
      </div>

      {/* Gauge Bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-background">
        {/* Zone backgrounds */}
        <div
          className="absolute inset-y-0 left-0 bg-green-500/30"
          style={{ width: `${warningPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-yellow-500/30"
          style={{ left: `${warningPct}%`, width: `${dangerPct - warningPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-red-500/30"
          style={{ left: `${dangerPct}%` }}
        />

        {/* Value indicator */}
        <motion.div
          className={cn(
            'absolute top-0 bottom-0 rounded-full',
            status === 'normal' && 'bg-green-500',
            status === 'warning' && 'bg-yellow-500',
            status === 'danger' && 'bg-red-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${valuePct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Value marker line */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          initial={{ left: '0%' }}
          animate={{ left: `${valuePct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Threshold markers */}
        <div
          className="absolute top-0 bottom-0 w-px bg-yellow-500/70"
          style={{ left: `${warningPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500/70"
          style={{ left: `${dangerPct}%` }}
        />
      </div>

      {/* Threshold labels */}
      <div className="flex justify-between mt-1 text-xs text-text-secondary">
        <span>0</span>
        <span className="text-yellow-500/70">{threshold.warning}</span>
        <span className="text-red-500/70">{threshold.danger}</span>
        <span>{Math.round(maxVal)}</span>
      </div>

      {/* Description */}
      {displayDescription && (
        <p className="mt-2 text-xs text-text-secondary">{displayDescription}</p>
      )}

      {/* Contributing Factors */}
      {factors && factors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <span className="text-xs font-medium text-text-secondary">
            {language === 'ko' ? '영향을 주는 요인들' : 'Contributing Factors'}
          </span>
          <ul className="mt-1 space-y-0.5">
            {factors.map((f, i) => (
              <li key={i} className="text-xs text-text-secondary flex items-start gap-1">
                <span className="text-text-secondary/50 mt-0.5">&bull;</span>
                <span>{language === 'ko' ? f.ko : f.en}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
