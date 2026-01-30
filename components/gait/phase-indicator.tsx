'use client'

import { motion } from 'framer-motion'
import type { GaitPhaseState, GaitPhase } from '@/types/gait'
import { GAIT_PHASE_LABELS } from '@/lib/gait-constants'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface PhaseIndicatorProps {
  phaseState: GaitPhaseState | null
  compact?: boolean
}

// 보행 단계 순서
const PHASE_ORDER: GaitPhase[] = [
  'initial_contact',
  'loading_response',
  'mid_stance',
  'terminal_stance',
  'pre_swing',
  'initial_swing',
  'mid_swing',
  'terminal_swing',
]

export function PhaseIndicator({ phaseState, compact = false }: PhaseIndicatorProps) {
  const { language } = useTranslation()

  if (!phaseState) {
    return (
      <div className="bg-surface/50 rounded-xl border border-border/50 p-4">
        <div className="text-text-secondary text-center text-sm">
          {language === 'ko' ? '보행 감지 대기 중...' : 'Waiting for gait detection...'}
        </div>
      </div>
    )
  }

  const leftPhaseLabel = GAIT_PHASE_LABELS[phaseState.leftPhase]
  const rightPhaseLabel = GAIT_PHASE_LABELS[phaseState.rightPhase]

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {/* 왼발 */}
        <div className="flex-1">
          <div className="text-text-secondary mb-1 text-xs">
            {language === 'ko' ? '왼발' : 'Left'}
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-1 text-center text-sm font-medium',
              phaseState.leftLeg === 'stance'
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-blue-500/20 text-blue-500'
            )}
          >
            {language === 'ko' ? leftPhaseLabel.ko : leftPhaseLabel.en}
          </div>
        </div>

        {/* 오른발 */}
        <div className="flex-1">
          <div className="text-text-secondary mb-1 text-xs">
            {language === 'ko' ? '오른발' : 'Right'}
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-1 text-center text-sm font-medium',
              phaseState.rightLeg === 'stance'
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-blue-500/20 text-blue-500'
            )}
          >
            {language === 'ko' ? rightPhaseLabel.ko : rightPhaseLabel.en}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 제목 */}
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-medium">
          {language === 'ko' ? '보행 단계' : 'Gait Phase'}
        </h3>
        <div className="text-text-secondary text-sm">
          {language === 'ko' ? '걸음 수' : 'Steps'}: {phaseState.cycleCount}
        </div>
      </div>

      {/* 왼발 진행바 */}
      <div>
        <div className="text-text-secondary mb-2 flex items-center gap-2 text-xs">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              phaseState.leftLeg === 'stance' ? 'bg-emerald-500' : 'bg-blue-500'
            )}
          />
          <span>{language === 'ko' ? '왼발' : 'Left Leg'}</span>
          <span className="ml-auto">
            {language === 'ko' ? leftPhaseLabel.ko : leftPhaseLabel.en}
          </span>
        </div>
        <PhaseProgressBar
          currentPhase={phaseState.leftPhase}
          isStance={phaseState.leftLeg === 'stance'}
        />
      </div>

      {/* 오른발 진행바 */}
      <div>
        <div className="text-text-secondary mb-2 flex items-center gap-2 text-xs">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              phaseState.rightLeg === 'stance' ? 'bg-emerald-500' : 'bg-blue-500'
            )}
          />
          <span>{language === 'ko' ? '오른발' : 'Right Leg'}</span>
          <span className="ml-auto">
            {language === 'ko' ? rightPhaseLabel.ko : rightPhaseLabel.en}
          </span>
        </div>
        <PhaseProgressBar
          currentPhase={phaseState.rightPhase}
          isStance={phaseState.rightLeg === 'stance'}
        />
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-2 w-4 rounded bg-emerald-500" />
          <span className="text-text-secondary">
            {language === 'ko' ? '입각기' : 'Stance'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-4 rounded bg-blue-500" />
          <span className="text-text-secondary">
            {language === 'ko' ? '유각기' : 'Swing'}
          </span>
        </div>
      </div>
    </div>
  )
}

function PhaseProgressBar({
  currentPhase,
  isStance,
}: {
  currentPhase: GaitPhase
  isStance: boolean
}) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  const progress = ((currentIndex + 1) / PHASE_ORDER.length) * 100

  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-border/30">
      {/* 입각기 영역 (60%) */}
      <div className="absolute left-0 top-0 h-full w-[60%] bg-emerald-500/20" />

      {/* 유각기 영역 (40%) */}
      <div className="absolute right-0 top-0 h-full w-[40%] bg-blue-500/20" />

      {/* 진행 표시 */}
      <motion.div
        className={cn(
          'absolute left-0 top-0 h-full rounded-full',
          isStance ? 'bg-emerald-500' : 'bg-blue-500'
        )}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* 단계 구분선 */}
      {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((percent) => (
        <div
          key={percent}
          className="absolute top-0 h-full w-px bg-border/50"
          style={{ left: `${percent}%` }}
        />
      ))}
    </div>
  )
}

// 간단한 상태 배지
export function PhaseStateBadge({
  phase,
  leg,
}: {
  phase: GaitPhase
  leg: 'stance' | 'swing'
}) {
  const { language } = useTranslation()
  const label = GAIT_PHASE_LABELS[phase]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        leg === 'stance'
          ? 'bg-emerald-500/20 text-emerald-500'
          : 'bg-blue-500/20 text-blue-500'
      )}
    >
      {language === 'ko' ? label.ko : label.en}
    </span>
  )
}
