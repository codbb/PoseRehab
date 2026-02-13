'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, Brain, Sparkles, XCircle, Activity } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface AIFeedback {
  isCorrect: boolean
  confidence: number
}

interface AIValidation {
  isPostureCorrect: boolean
  postureConfidence: number
  isExerciseMatch: boolean
  detectedExercise: string
  exerciseConfidence: number
}

interface FeedbackDisplayProps {
  feedback: string
  accuracy: number
  aiFeedback?: AIFeedback | null
  aiValidation?: AIValidation | null
  className?: string
}

export function FeedbackDisplay({ feedback, accuracy, aiFeedback, aiValidation, className }: FeedbackDisplayProps) {
  const { t } = useTranslation()

  const getFeedbackType = () => {
    if (feedback === 'good' || feedback === 'perfectForm') return 'success'
    if (!feedback) return 'info'
    if (feedback.startsWith('wrongExercise:') || feedback === 'incorrectPosture') return 'error'
    return 'warning'
  }

  // 피드백 메시지 처리
  const getFeedbackMessage = () => {
    if (feedback.startsWith('wrongExercise:')) {
      const detected = feedback.split(':').slice(1).join(':')
      return t('exercise.session.feedback.wrongExercise', { detected })
    }
    if (feedback === 'incorrectPosture') {
      return t('exercise.session.feedback.incorrectPosture')
    }
    const key = `exercise.session.feedback.${feedback}`
    const translated = t(key)
    // If translation key doesn't exist, t() returns the key itself
    return translated === key ? feedback : translated
  }

  const type = getFeedbackType()

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="h-6 w-6 text-secondary" />,
    warning: <AlertCircle className="h-6 w-6 text-warning" />,
    info: <Info className="h-6 w-6 text-primary" />,
    error: <XCircle className="h-6 w-6 text-error" />,
  }

  const colors: Record<string, string> = {
    success: 'bg-secondary/10 border-secondary/20',
    warning: 'bg-warning/10 border-warning/20',
    info: 'bg-primary/10 border-primary/20',
    error: 'bg-error/10 border-error/20',
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

      {/* AI Exercise Recognition */}
      {aiValidation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3',
            aiValidation.isExerciseMatch
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-red-500/10 border-red-500/20'
          )}
        >
          <Activity className={cn(
            'h-5 w-5',
            aiValidation.isExerciseMatch ? 'text-blue-500' : 'text-red-500'
          )} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={cn(
                'text-sm font-medium',
                aiValidation.isExerciseMatch ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
              )}>
                {t('exercise.session.aiRecognition.detected')}: {aiValidation.detectedExercise}
              </span>
              <span className="text-xs text-text-secondary">
                {(aiValidation.exerciseConfidence * 100).toFixed(0)}%
              </span>
            </div>
            {!aiValidation.isExerciseMatch && (
              <span className="text-xs text-red-500">
                {t('exercise.session.aiRecognition.mismatch')}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Rule-based Feedback message */}
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
              {getFeedbackMessage()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Model Feedback */}
      {aiFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3',
            aiFeedback.isCorrect
              ? 'bg-purple-500/10 border-purple-500/20'
              : 'bg-orange-500/10 border-orange-500/20'
          )}
        >
          <div className="flex items-center gap-2">
            <Brain className={cn(
              'h-5 w-5',
              aiFeedback.isCorrect ? 'text-purple-500' : 'text-orange-500'
            )} />
            <Sparkles className="h-3 w-3 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={cn(
                'text-sm font-medium',
                aiFeedback.isCorrect ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'
              )}>
                {aiFeedback.isCorrect
                  ? t('exercise.session.aiFeedback.correct')
                  : t('exercise.session.aiFeedback.incorrect')}
              </span>
              <span className="text-xs text-text-secondary">
                {t('exercise.session.aiFeedback.confidence')}: {(aiFeedback.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  aiFeedback.isCorrect ? 'bg-purple-500' : 'bg-orange-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${aiFeedback.confidence * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
