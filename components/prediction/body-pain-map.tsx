'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/hooks/use-translation'
import type { PainPrediction } from '@/lib/prediction'

interface BodyPainMapProps {
  predictions: PainPrediction[]
  onAreaClick?: (area: string) => void
}

interface BodyArea {
  id: string
  path: string
  label: string
  labelKo: string
  cx: number
  cy: number
}

const BODY_AREAS: BodyArea[] = [
  {
    id: 'Neck',
    path: 'M95,55 Q100,50 105,55 Q100,65 95,55',
    label: 'Neck',
    labelKo: '목',
    cx: 100,
    cy: 55,
  },
  {
    id: 'Shoulders',
    path: 'M70,70 Q85,65 100,70 Q115,65 130,70 L130,85 Q100,80 70,85 Z',
    label: 'Shoulders',
    labelKo: '어깨',
    cx: 100,
    cy: 75,
  },
  {
    id: 'Upper Back',
    path: 'M75,85 L125,85 L125,110 L75,110 Z',
    label: 'Upper Back',
    labelKo: '상부 등',
    cx: 100,
    cy: 97,
  },
  {
    id: 'Mid Back',
    path: 'M78,110 L122,110 L122,135 L78,135 Z',
    label: 'Mid Back',
    labelKo: '중부 등',
    cx: 100,
    cy: 122,
  },
  {
    id: 'Lower Back',
    path: 'M80,135 L120,135 L120,160 Q100,165 80,160 Z',
    label: 'Lower Back',
    labelKo: '허리',
    cx: 100,
    cy: 147,
  },
  {
    id: 'Hips',
    path: 'M70,160 L130,160 L135,180 Q100,185 65,180 Z',
    label: 'Hips',
    labelKo: '골반',
    cx: 100,
    cy: 170,
  },
  {
    id: 'Knees',
    path: 'M75,210 Q85,205 90,210 Q85,220 75,215 Z M125,210 Q115,205 110,210 Q115,220 125,215 Z',
    label: 'Knees',
    labelKo: '무릎',
    cx: 100,
    cy: 212,
  },
  {
    id: 'Ankles',
    path: 'M78,270 Q85,268 88,270 Q85,275 78,273 Z M122,270 Q115,268 112,270 Q115,275 122,273 Z',
    label: 'Ankles',
    labelKo: '발목',
    cx: 100,
    cy: 272,
  },
]

export function BodyPainMap({ predictions, onAreaClick }: BodyPainMapProps) {
  const { language } = useTranslation()

  const getAreaColor = (areaId: string): string => {
    const prediction = predictions.find((p) => p.area === areaId)
    if (!prediction) return 'var(--border)'

    switch (prediction.riskLevel) {
      case 'high':
        return 'var(--error)'
      case 'medium':
        return 'var(--warning)'
      case 'low':
        return 'var(--secondary)'
    }
  }

  const getAreaOpacity = (areaId: string): number => {
    const prediction = predictions.find((p) => p.area === areaId)
    if (!prediction) return 0.2

    return 0.3 + (prediction.probability / 100) * 0.5
  }

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <svg
        viewBox="0 0 200 320"
        className="w-full h-auto"
        style={{ maxHeight: '450px' }}
      >
        {/* Body outline */}
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--background)" />
          </linearGradient>
        </defs>

        {/* Head */}
        <ellipse
          cx="100"
          cy="30"
          rx="25"
          ry="28"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />

        {/* Neck */}
        <rect
          x="92"
          y="55"
          width="16"
          height="15"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* Torso */}
        <path
          d="M70,70 Q60,75 55,100 L55,160 Q60,175 70,180 L70,185 Q100,190 130,185 L130,180 Q140,175 145,160 L145,100 Q140,75 130,70 Q100,65 70,70"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />

        {/* Arms */}
        <path
          d="M55,75 Q40,80 35,100 L30,150 Q28,160 35,165 L40,165 Q48,160 50,150 L55,105"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M145,75 Q160,80 165,100 L170,150 Q172,160 165,165 L160,165 Q152,160 150,150 L145,105"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />

        {/* Legs */}
        <path
          d="M70,185 L65,250 Q63,280 70,290 L75,290 Q82,280 80,250 L85,185"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M130,185 L135,250 Q137,280 130,290 L125,290 Q118,280 120,250 L115,185"
          fill="url(#bodyGradient)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />

        {/* Pain areas with interaction */}
        {BODY_AREAS.map((area) => {
          const prediction = predictions.find((p) => p.area === area.id)
          const hasRisk = !!prediction

          return (
            <motion.g
              key={area.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => onAreaClick?.(area.id)}
              style={{ cursor: onAreaClick ? 'pointer' : 'default' }}
            >
              {/* Highlight circle */}
              {hasRisk && (
                <motion.circle
                  cx={area.cx}
                  cy={area.cy}
                  r={prediction?.riskLevel === 'high' ? 20 : prediction?.riskLevel === 'medium' ? 16 : 12}
                  fill={getAreaColor(area.id)}
                  opacity={getAreaOpacity(area.id)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                />
              )}

              {/* Pulse effect for high risk */}
              {prediction?.riskLevel === 'high' && (
                <motion.circle
                  cx={area.cx}
                  cy={area.cy}
                  r={20}
                  fill="none"
                  stroke={getAreaColor(area.id)}
                  strokeWidth={2}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              )}
            </motion.g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-error opacity-60" />
          <span className="text-text-secondary">
            {language === 'ko' ? '높음' : 'High'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-warning opacity-60" />
          <span className="text-text-secondary">
            {language === 'ko' ? '중간' : 'Medium'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-secondary opacity-60" />
          <span className="text-text-secondary">
            {language === 'ko' ? '낮음' : 'Low'}
          </span>
        </div>
      </div>
    </div>
  )
}
