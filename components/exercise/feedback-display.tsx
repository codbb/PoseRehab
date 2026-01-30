'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface FeedbackDisplayProps {
  feedback: string
  accuracy: number
  className?: string
}

export function FeedbackDisplay({ feedback, accuracy, className }: FeedbackDisplayProps) {
  const { t } = useTranslation()

  const getFeedbackType = () => {
    if (feedback === 'good' || feedback === 'perfectForm') return 'success'
    if (!feedback) return 'info'
    return 'warning'
  }

  const type = getFeedbackType()

  const icons = {
    success: <CheckCircle className="h-6 w-6 text-secondary" />,
    warning: <AlertCircle className="h-6 w-6 text-warning" />,
    info: <Info className="h-6 w-6 text-primary" />,
  }

  const colors = {
    success: 'bg-secondary/10 border-secondary/20',
    warning: 'bg-warning/10 border-warning/20',
    info: 'bg-primary/10 border-primary/20',
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Accuracy bar */}
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-text-secondary">{t('exercise.session.accuracy')}</span>
          <span className="font-medium text-text-primary">{Math.round(accuracy)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className={cn(
              'h-full rounded-full',
              accuracy >= 80 ? 'bg-secondary' : accuracy >= 50 ? 'bg-warning' : 'bg-error'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${accuracy}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Feedback message */}
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-4',
              colors[type]
            )}
          >
            {icons[type]}
            <span className="font-medium text-text-primary">
              {t(`exercise.session.feedback.${feedback}`)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
