'use client'

import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, XCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CircularProgress, Progress } from '@/components/ui/progress'
import { useTranslation } from '@/hooks/use-translation'
import { cn, getScoreColor, getScoreLabel } from '@/lib/utils'
import type { PostureAnalysisResult, BodyPartAnalysis } from '@/types/posture'

interface AnalysisResultProps {
  result: PostureAnalysisResult
  className?: string
}

function StatusIcon({ status }: { status: 'good' | 'warning' | 'poor' }) {
  if (status === 'good') {
    return <CheckCircle className="h-5 w-5 text-secondary" />
  }
  if (status === 'warning') {
    return <AlertCircle className="h-5 w-5 text-warning" />
  }
  return <XCircle className="h-5 w-5 text-error" />
}

function BodyPartCard({
  analysis,
  language,
}: {
  analysis: BodyPartAnalysis
  language: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-4">
      <StatusIcon status={analysis.status} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-text-primary">
            {language === 'ko' ? analysis.nameKo : analysis.name}
          </h4>
          <span className={cn('font-semibold', getScoreColor(analysis.score))}>
            {Math.round(analysis.score)}%
          </span>
        </div>
        <Progress
          value={analysis.score}
          size="sm"
          variant={
            analysis.status === 'good'
              ? 'success'
              : analysis.status === 'warning'
              ? 'warning'
              : 'error'
          }
          className="mt-2"
        />
        <p className="mt-2 text-sm text-text-secondary">
          {language === 'ko' ? analysis.feedbackKo : analysis.feedback}
        </p>
      </div>
    </div>
  )
}

export function AnalysisResult({ result, className }: AnalysisResultProps) {
  const { t, language } = useTranslation()

  const bodyParts = [
    result.bodyParts.head,
    result.bodyParts.shoulders,
    result.bodyParts.spine,
    result.bodyParts.pelvis,
    result.bodyParts.knees,
  ]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Score */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {t('postureAnalysis.result.overallScore')}
            </h3>
            <p className={cn('mt-1 text-3xl font-bold', getScoreColor(result.overallScore))}>
              {result.overallScore}
              <span className="text-lg text-text-secondary">/100</span>
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {getScoreLabel(result.overallScore, language)}
            </p>
          </div>
          <CircularProgress
            value={result.overallScore}
            size={120}
            strokeWidth={10}
            variant={
              result.overallScore >= 80
                ? 'success'
                : result.overallScore >= 60
                ? 'warning'
                : 'error'
            }
          />
        </CardContent>
      </Card>

      {/* Body Part Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>{t('postureAnalysis.result.bodyParts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bodyParts.map((part, index) => (
            <motion.div
              key={part.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <BodyPartCard analysis={part} language={language} />
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Potential Conditions */}
      {result.potentialConditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('postureAnalysis.result.potentialConditions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.potentialConditions.map((condition, index) => (
              <motion.div
                key={condition.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <h4 className="font-medium text-text-primary">
                    {language === 'ko' ? condition.nameKo : condition.name}
                  </h4>
                  <p className="mt-1 text-sm text-text-secondary">
                    {language === 'ko' ? condition.descriptionKo : condition.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-warning">
                    {condition.probability}%
                  </span>
                  <p className="text-xs text-text-secondary">probability</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('postureAnalysis.result.recommendations')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.recommendations.map((rec, index) => (
              <motion.div
                key={rec.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-text-primary">
                    {language === 'ko' ? rec.titleKo : rec.title}
                  </h4>
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {language === 'ko' ? rec.descriptionKo : rec.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {rec.exercises.map((exercise) => (
                    <span
                      key={exercise}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {exercise}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
