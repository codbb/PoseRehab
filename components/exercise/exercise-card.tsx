'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Dumbbell, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'
import type { Exercise, ExerciseCategory, ExerciseDifficulty } from '@/types/exercise'

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

export function ExerciseCard({ exercise, index = 0, className }: ExerciseCardProps) {
  const { t, language } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/exercise/workout?id=${exercise.id}`}>
        <div
          className={cn(
            'group flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-md',
            className
          )}
        >
          {/* Icon */}
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Dumbbell className="h-7 w-7 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary truncate">
                {language === 'ko' ? exercise.nameKo : exercise.name}
              </h3>
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

            <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {exercise.duration}s
              </span>
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
