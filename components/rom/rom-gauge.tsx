'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { NormalRange, CalibrationData } from '@/types/rom'

interface RomGaugeProps {
  currentAngle: number
  normalRange: NormalRange
  calibration?: CalibrationData | null
  maxDisplayAngle?: number
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
  language?: 'ko' | 'en'
}

export function RomGauge({
  currentAngle,
  normalRange,
  calibration,
  maxDisplayAngle = 180,
  showLabels = true,
  size = 'md',
  language = 'ko',
}: RomGaugeProps) {
  const sizeClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-6',
  }

  // 정상 범위 위치 계산 (0-100%)
  const normalStartPercent = (normalRange.min / maxDisplayAngle) * 100
  const normalEndPercent = (normalRange.max / maxDisplayAngle) * 100
  const normalWidthPercent = normalEndPercent - normalStartPercent

  // 캘리브레이션 범위 위치 계산
  const calibrationStartPercent = calibration
    ? (calibration.minAngle / maxDisplayAngle) * 100
    : null
  const calibrationEndPercent = calibration
    ? (calibration.maxAngle / maxDisplayAngle) * 100
    : null
  const calibrationWidthPercent =
    calibrationStartPercent !== null && calibrationEndPercent !== null
      ? calibrationEndPercent - calibrationStartPercent
      : null

  // 현재 각도 위치 (0-100%)
  const currentPercent = Math.min((currentAngle / maxDisplayAngle) * 100, 100)

  // 상태 색상 결정
  const status = useMemo(() => {
    if (calibration) {
      if (currentAngle >= calibration.maxAngle) return 'max'
    }
    if (currentAngle >= normalRange.min && currentAngle <= normalRange.max) {
      return 'normal'
    }
    if (currentAngle < normalRange.min) return 'low'
    return 'high'
  }, [currentAngle, normalRange, calibration])

  const statusColors = {
    normal: 'bg-secondary',
    low: 'bg-warning',
    high: 'bg-error',
    max: 'bg-primary',
  }

  // 진행률 계산 (캘리브레이션 기준)
  const progress = useMemo(() => {
    if (!calibration) return null
    const range = calibration.maxAngle - calibration.minAngle
    if (range <= 0) return 0
    return Math.min(
      ((currentAngle - calibration.minAngle) / range) * 100,
      100
    )
  }, [currentAngle, calibration])

  return (
    <div className="space-y-2">
      {/* 게이지 바 */}
      <div className={cn('relative rounded-full bg-border overflow-hidden', sizeClasses[size])}>
        {/* 정상 범위 표시 (연한 초록) */}
        <div
          className="absolute top-0 bottom-0 bg-secondary/20"
          style={{
            left: `${normalStartPercent}%`,
            width: `${normalWidthPercent}%`,
          }}
        />

        {/* 캘리브레이션 범위 표시 (파란색) */}
        {calibrationStartPercent !== null && calibrationWidthPercent !== null && (
          <div
            className="absolute top-0 bottom-0 bg-primary/30"
            style={{
              left: `${calibrationStartPercent}%`,
              width: `${calibrationWidthPercent}%`,
            }}
          />
        )}

        {/* 현재 값까지 채우기 */}
        <motion.div
          className={cn('absolute top-0 bottom-0 left-0 opacity-50', statusColors[status])}
          initial={{ width: 0 }}
          animate={{ width: `${currentPercent}%` }}
          transition={{ duration: 0.1 }}
        />

        {/* 현재 위치 마커 */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow-lg',
            statusColors[status],
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'
          )}
          initial={{ left: 0 }}
          animate={{ left: `${currentPercent}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* 라벨 */}
      {showLabels && (
        <div className="flex justify-between text-xs text-text-secondary">
          <span>0°</span>
          <span>{maxDisplayAngle}°</span>
        </div>
      )}

      {/* 범위 정보 */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-secondary/30" />
          <span className="text-text-secondary">
            {language === 'ko' ? '정상 범위' : 'Normal'}:{' '}
            <span className="text-text-primary font-medium">
              {normalRange.min}° - {normalRange.max}°
            </span>
          </span>
        </div>

        {calibration && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/30" />
            <span className="text-text-secondary">
              {language === 'ko' ? '내 범위' : 'My Range'}:{' '}
              <span className="text-text-primary font-medium">
                {Math.round(calibration.minAngle)}° - {Math.round(calibration.maxAngle)}°
              </span>
            </span>
          </div>
        )}
      </div>

      {/* 진행률 (캘리브레이션이 있을 때) */}
      {progress !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, progress)}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-xs text-text-secondary min-w-[40px] text-right">
            {Math.round(Math.max(0, progress))}%
          </span>
        </div>
      )}
    </div>
  )
}

// 좌우 비교 게이지
interface RomCompareGaugeProps {
  leftAngle: number
  rightAngle: number
  normalRange: NormalRange
  leftCalibration?: CalibrationData | null
  rightCalibration?: CalibrationData | null
  maxDisplayAngle?: number
  language?: 'ko' | 'en'
}

export function RomCompareGauge({
  leftAngle,
  rightAngle,
  normalRange,
  leftCalibration,
  rightCalibration,
  maxDisplayAngle = 180,
  language = 'ko',
}: RomCompareGaugeProps) {
  const difference = Math.abs(leftAngle - rightAngle)
  const isImbalanced = difference >= 10

  return (
    <div className="space-y-4">
      {/* 왼쪽 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {language === 'ko' ? '왼쪽' : 'Left'}
          </span>
          <span className="text-lg font-bold text-primary">{Math.round(leftAngle)}°</span>
        </div>
        <RomGauge
          currentAngle={leftAngle}
          normalRange={normalRange}
          calibration={leftCalibration}
          maxDisplayAngle={maxDisplayAngle}
          showLabels={false}
          size="sm"
          language={language}
        />
      </div>

      {/* 오른쪽 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {language === 'ko' ? '오른쪽' : 'Right'}
          </span>
          <span className="text-lg font-bold text-secondary">{Math.round(rightAngle)}°</span>
        </div>
        <RomGauge
          currentAngle={rightAngle}
          normalRange={normalRange}
          calibration={rightCalibration}
          maxDisplayAngle={maxDisplayAngle}
          showLabels={false}
          size="sm"
          language={language}
        />
      </div>

      {/* 차이 표시 */}
      <div
        className={cn(
          'p-3 rounded-lg text-center',
          isImbalanced ? 'bg-warning/10' : 'bg-secondary/10'
        )}
      >
        <div className="text-sm text-text-secondary">
          {language === 'ko' ? '좌우 차이' : 'Difference'}
        </div>
        <div
          className={cn(
            'text-2xl font-bold',
            isImbalanced ? 'text-warning' : 'text-secondary'
          )}
        >
          {Math.round(difference)}°
        </div>
        {isImbalanced && (
          <div className="text-xs text-warning mt-1">
            {language === 'ko' ? '불균형 감지됨' : 'Imbalance detected'}
          </div>
        )}
      </div>
    </div>
  )
}
