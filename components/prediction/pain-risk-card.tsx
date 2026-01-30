'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/hooks/use-translation'
import type { PainPrediction } from '@/lib/prediction'

interface PainRiskCardProps {
  prediction: PainPrediction
  onClick?: () => void
}

export function PainRiskCard({ prediction, onClick }: PainRiskCardProps) {
  const { language } = useTranslation()

  const getRiskIcon = () => {
    switch (prediction.riskLevel) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-error" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-warning" />
      case 'low':
        return <CheckCircle className="h-5 w-5 text-secondary" />
    }
  }

  const getRiskColor = () => {
    switch (prediction.riskLevel) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'success'
    }
  }

  const getRiskLabel = () => {
    switch (prediction.riskLevel) {
      case 'high':
        return language === 'ko' ? '높음' : 'High'
      case 'medium':
        return language === 'ko' ? '중간' : 'Medium'
      case 'low':
        return language === 'ko' ? '낮음' : 'Low'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          onClick ? 'hover:border-primary/50' : ''
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">{getRiskIcon()}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">
                  {language === 'ko' ? prediction.areaKo : prediction.area}
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  {language === 'ko' ? prediction.timelineKo : prediction.timeline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-lg font-bold text-text-primary">
                  {prediction.probability}%
                </span>
                <p className="text-xs text-text-secondary">{getRiskLabel()}</p>
              </div>
              {onClick && (
                <ChevronRight className="h-5 w-5 text-text-secondary" />
              )}
            </div>
          </div>

          <div className="mt-3">
            <Progress
              value={prediction.probability}
              variant={getRiskColor()}
              className="h-2"
            />
          </div>

          {prediction.contributingFactors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {(language === 'ko'
                ? prediction.contributingFactorsKo
                : prediction.contributingFactors
              ).map((factor, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs text-text-secondary"
                >
                  {factor}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
