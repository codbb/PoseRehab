'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface RepCounterProps {
  currentReps: number
  targetReps: number
  currentSet: number
  targetSets: number
  className?: string
}

export function RepCounter({
  currentReps,
  targetReps,
  currentSet,
  targetSets,
  className,
}: RepCounterProps) {
  const { t } = useTranslation()

  const repProgress = (currentReps / targetReps) * 100
  const setProgress = ((currentSet - 1) / targetSets) * 100 + (repProgress / targetSets)

  return (
    <div className={cn('rounded-card bg-surface p-4', className)}>
      {/* Main counter */}
      <div className="flex items-center justify-center gap-4">
        <motion.div
          key={currentReps}
          initial={{ scale: 1.2, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-bold text-primary"
        >
          {currentReps}
        </motion.div>
        <div className="text-2xl text-text-secondary">/</div>
        <div className="text-3xl font-medium text-text-secondary">{targetReps}</div>
      </div>

      <p className="mt-2 text-center text-sm text-text-secondary">
        {t('exercise.session.repsCompleted')}
      </p>

      {/* Rep progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${repProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Set counter */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-text-secondary">{t('exercise.session.currentSet')}</span>
        <span className="font-medium text-text-primary">
          {currentSet} / {targetSets}
        </span>
      </div>

      {/* Set progress bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${setProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}
