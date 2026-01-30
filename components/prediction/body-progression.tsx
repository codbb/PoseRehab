'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { useTranslation } from '@/hooks/use-translation'
import type { BodyPrediction, Timeframe } from '@/lib/prediction'
import { predictAllTimeframes } from '@/lib/prediction'
import type { PostureAnalysisResult } from '@/types/posture'

interface BodyProgressionProps {
  analysisHistory: PostureAnalysisResult[]
  currentAnalysis: PostureAnalysisResult | null
}

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string; labelKo: string }[] = [
  { value: '6months', label: '6 Months', labelKo: '6개월' },
  { value: '1year', label: '1 Year', labelKo: '1년' },
  { value: '2years', label: '2 Years', labelKo: '2년' },
]

export function BodyProgression({
  analysisHistory,
  currentAnalysis,
}: BodyProgressionProps) {
  const { language } = useTranslation()
  const [selectedTimeframeIndex, setSelectedTimeframeIndex] = useState(0)

  const predictions = predictAllTimeframes(analysisHistory, currentAnalysis)
  const selectedPrediction = predictions[selectedTimeframeIndex]

  if (!selectedPrediction || !currentAnalysis) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-text-secondary">
          {language === 'ko'
            ? '자세 분석을 먼저 진행해주세요'
            : 'Please complete posture analysis first'}
        </CardContent>
      </Card>
    )
  }

  const currentScore = currentAnalysis.overallScore
  const predictedScore = selectedPrediction.predictedScore
  const scoreChange = predictedScore - currentScore

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {language === 'ko' ? '체형 변화 예측' : 'Body Change Prediction'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>{language === 'ko' ? '현재' : 'Now'}</span>
            <span>
              {language === 'ko'
                ? TIMEFRAME_OPTIONS[selectedTimeframeIndex].labelKo
                : TIMEFRAME_OPTIONS[selectedTimeframeIndex].label}
            </span>
          </div>
          <Slider
            value={selectedTimeframeIndex}
            onChange={(value) => setSelectedTimeframeIndex(value)}
            min={0}
            max={2}
            step={1}
            showValue={false}
          />
          <div className="flex justify-between text-xs text-text-secondary">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <span key={opt.value}>
                {language === 'ko' ? opt.labelKo : opt.label}
              </span>
            ))}
          </div>
        </div>

        {/* Score Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            key="current"
            className="rounded-lg bg-background p-4 text-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-sm text-text-secondary mb-1">
              {language === 'ko' ? '현재 점수' : 'Current Score'}
            </p>
            <p className="text-3xl font-bold text-primary">{currentScore}</p>
          </motion.div>

          <motion.div
            key="predicted"
            className="rounded-lg bg-background p-4 text-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-sm text-text-secondary mb-1">
              {language === 'ko' ? '예측 점수' : 'Predicted Score'}
            </p>
            <p
              className={`text-3xl font-bold ${
                predictedScore >= currentScore ? 'text-secondary' : 'text-error'
              }`}
            >
              {predictedScore}
            </p>
          </motion.div>
        </div>

        {/* Change Indicator */}
        <motion.div
          className={`flex items-center justify-center gap-2 rounded-lg p-3 ${
            scoreChange >= 0 ? 'bg-secondary/10' : 'bg-error/10'
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {scoreChange >= 0 ? (
            <TrendingUp className="h-5 w-5 text-secondary" />
          ) : (
            <TrendingDown className="h-5 w-5 text-error" />
          )}
          <span
            className={`font-medium ${
              scoreChange >= 0 ? 'text-secondary' : 'text-error'
            }`}
          >
            {scoreChange >= 0 ? '+' : ''}
            {scoreChange}{' '}
            {language === 'ko' ? '점 변화 예상' : 'points expected change'}
          </span>
        </motion.div>

        {/* Warning Message */}
        {selectedPrediction.warning && (
          <motion.div
            className="flex items-start gap-3 rounded-lg bg-warning/10 p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              {language === 'ko'
                ? selectedPrediction.warningKo
                : selectedPrediction.warning}
            </p>
          </motion.div>
        )}

        {/* Improvement Potential */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              {language === 'ko' ? '운동 시 개선 가능성' : 'Improvement with Exercise'}
            </span>
            <span className="font-semibold text-secondary">
              {selectedPrediction.improvementPotential}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-background overflow-hidden">
            <motion.div
              className="h-full bg-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${selectedPrediction.improvementPotential}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {language === 'ko'
              ? '규칙적인 교정 운동을 통해 자세를 개선할 수 있습니다.'
              : 'Regular corrective exercises can help improve your posture.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
