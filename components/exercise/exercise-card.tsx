'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Dumbbell, ChevronRight, Video, Timer } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'
import type { Exercise, ExerciseCategory, ExerciseDifficulty, ExerciseType } from '@/types/exercise'

interface ExerciseCardProps {
  exercise: Exercise
  index?: number
  className?: string
}

const categoryColors: Record<ExerciseCategory, string> = {
  stretching: 'bg-blue-500/10 text-blue-500',
  strength: 'bg-red-500/10 text-red-500',
  core: 'bg-orange-500/10 text-orange-500',
  correction: 'bg-purple-500/10 text-purple-500',
  rehabilitation: 'bg-green-500/10 text-green-500',
}

const difficultyColors: Record<ExerciseDifficulty, string> = {
  beginner: 'text-secondary',
  intermediate: 'text-warning',
  advanced: 'text-error',
}

const exerciseTypeConfig: Record<ExerciseType, { icon: typeof Video; color: string; bgColor: string }> = {
  realtime: { icon: Video, color: 'text-primary', bgColor: 'bg-primary/10' },
  guided: { icon: Timer, color: 'text-secondary', bgColor: 'bg-secondary/10' },
}

// 운동별 SVG 아이콘 정의
const ExerciseIcons: Record<string, React.FC<{ className?: string }>> = {
  chin_tuck: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="16" r="10" />
      <path d="M32 26 L32 45" />
      <path d="M22 35 L32 30 L42 35" />
      <path d="M20 55 L32 45 L44 55" />
      <path d="M38 16 L45 14" strokeDasharray="2 2" />
    </svg>
  ),
  neck_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="36" cy="16" rx="10" ry="8" transform="rotate(20 36 16)" />
      <path d="M32 24 L32 45" />
      <path d="M22 35 L32 30 L42 35" />
      <path d="M20 55 L32 45 L44 55" />
    </svg>
  ),
  upper_trap_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="14" r="8" />
      <path d="M32 22 L32 40" />
      <path d="M20 32 L32 26 L44 32" />
      <path d="M18 50 L32 40 L46 50" />
      <path d="M44 32 L54 22" />
    </svg>
  ),
  wall_slide: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="50" y="5" width="4" height="54" fill="currentColor" opacity="0.2" />
      <circle cx="32" cy="14" r="8" />
      <path d="M32 22 L32 42" />
      <path d="M40 30 L48 18" />
      <path d="M24 30 L16 18" />
      <path d="M24 52 L32 42 L40 52" />
    </svg>
  ),
  chest_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="5" width="4" height="54" fill="currentColor" opacity="0.2" />
      <rect x="52" y="5" width="4" height="54" fill="currentColor" opacity="0.2" />
      <circle cx="32" cy="18" r="8" />
      <path d="M32 26 L32 42" />
      <path d="M24 34 L12 24" />
      <path d="M40 34 L52 24" />
      <path d="M24 52 L32 42 L40 52" />
    </svg>
  ),
  pelvic_tilt: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="14" cy="44" r="6" />
      <path d="M20 44 L36 44" />
      <path d="M36 44 L42 38" />
      <path d="M42 38 L54 44" />
    </svg>
  ),
  clamshell: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="14" cy="40" r="6" />
      <path d="M20 40 L34 40" />
      <path d="M34 40 L42 28" />
      <path d="M42 28 L54 28" />
      <path d="M34 40 L40 44 L52 44" />
    </svg>
  ),
  bridge: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="12" cy="44" r="5" />
      <path d="M17 44 L24 44" />
      <path d="M24 44 L32 30" />
      <path d="M32 30 L40 44" />
      <path d="M40 44 L50 50" />
    </svg>
  ),
  plank: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="12" cy="34" r="5" />
      <path d="M17 36 L52 42" />
      <path d="M20 42 L20 50" />
      <path d="M48 46 L48 50" />
    </svg>
  ),
  cat_cow: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      <circle cx="12" cy="30" r="4" />
      <path d="M16 32 L22 32" />
      <path d="M22 32 Q32 20 42 32" />
      <path d="M42 32 L48 32" />
      <path d="M22 36 L22 55" />
      <path d="M42 36 L42 55" />
    </svg>
  ),
  dead_bug: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="32" cy="44" r="5" />
      <path d="M27 44 L12 44" />
      <path d="M37 44 L52 44" />
      <path d="M12 44 L8 30" />
      <path d="M52 44 L56 30" />
    </svg>
  ),
  hip_abduction: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="14" cy="38" r="6" />
      <path d="M20 38 L34 38" />
      <path d="M34 38 L34 50" />
      <path d="M34 38 L50 20" />
    </svg>
  ),
  it_band_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="12" r="6" />
      <path d="M32 18 L32 32" />
      <path d="M24 26 L32 22 L40 26" />
      <path d="M32 32 L24 50" />
      <path d="M32 32 L48 50" />
    </svg>
  ),
  side_lunge: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      <circle cx="24" cy="14" r="6" />
      <path d="M24 20 L24 32" />
      <path d="M16 28 L24 24 L32 28" />
      <path d="M24 32 L14 55" />
      <path d="M24 32 L44 45" />
      <path d="M44 45 L52 55" />
    </svg>
  ),
  squat: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      <circle cx="32" cy="14" r="6" />
      <path d="M32 20 L32 30" />
      <path d="M24 26 L32 22 L40 26" />
      <path d="M32 30 L24 45" />
      <path d="M32 30 L40 45" />
      <path d="M24 45 L20 55" />
      <path d="M40 45 L44 55" />
    </svg>
  ),
  lunge: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      <circle cx="28" cy="14" r="6" />
      <path d="M28 20 L28 32" />
      <path d="M20 28 L28 24 L36 28" />
      <path d="M28 32 L18 55" />
      <path d="M28 32 L42 45" />
      <path d="M42 45 L50 55" />
    </svg>
  ),
  pushup: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="12" cy="30" r="5" />
      <path d="M17 32 L52 38" />
      <path d="M20 38 L20 50" />
      <path d="M48 42 L48 50" />
      <path d="M32 28 L32 38" />
    </svg>
  ),
  crunch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="32" cy="28" r="5" />
      <path d="M32 33 L32 42" />
      <path d="M32 42 L24 50" />
      <path d="M32 42 L40 50" />
      <path d="M24 50 L18 45" />
      <path d="M40 50 L46 45" />
    </svg>
  ),
}

// 기본 아이콘
const DefaultExerciseIcon = ({ className }: { className?: string }) => (
  <Dumbbell className={className} />
)

export function ExerciseCard({ exercise, index = 0, className }: ExerciseCardProps) {
  const { t, language } = useTranslation()

  // 운동 타입에 따라 다른 페이지로 이동
  const exerciseType = exercise.exerciseType || 'realtime'
  const href = exerciseType === 'guided'
    ? `/exercise/guided?id=${exercise.id}`
    : `/exercise/workout?id=${exercise.id}`

  const TypeIcon = exerciseTypeConfig[exerciseType].icon
  const ExerciseIcon = ExerciseIcons[exercise.id] || DefaultExerciseIcon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={href}>
        <div
          className={cn(
            'group flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-md',
            className
          )}
        >
          {/* Icon */}
          <div className={cn(
            'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg',
            exerciseTypeConfig[exerciseType].bgColor
          )}>
            <ExerciseIcon className={cn('h-9 w-9', exerciseTypeConfig[exerciseType].color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary truncate">
                {language === 'ko' ? exercise.nameKo : exercise.name}
              </h3>
              {/* 운동 타입 뱃지 */}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1',
                  exerciseTypeConfig[exerciseType].bgColor,
                  exerciseTypeConfig[exerciseType].color
                )}
              >
                <TypeIcon className="h-3 w-3" />
                {t(`exercise.list.exerciseType.${exerciseType}`)}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  categoryColors[exercise.category]
                )}
              >
                {t(`exercise.list.categories.${exercise.category}`)}
              </span>
            </div>

            <p className="mt-1 text-sm text-text-secondary line-clamp-1">
              {language === 'ko' ? exercise.descriptionKo : exercise.description}
            </p>

            <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary flex-wrap">
              {exerciseType === 'guided' && exercise.holdDuration ? (
                <span className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {exercise.holdDuration}s {t('exercise.guided.hold')}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {exercise.duration}s
                </span>
              )}
              <span>
                {exercise.defaultReps} {t('exercise.list.reps')} × {exercise.defaultSets} {t('exercise.list.sets')}
              </span>
              <span className={cn('font-medium', difficultyColors[exercise.difficulty])}>
                {t(`exercise.list.difficulty.${exercise.difficulty}`)}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </Link>
    </motion.div>
  )
}
