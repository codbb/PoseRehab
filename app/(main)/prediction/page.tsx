'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, AlertTriangle, TrendingUp, Activity } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  PainRiskCard,
  BodyPainMap,
  BodyProgression,
  PreventionTips,
} from '@/components/prediction'
import { usePostureStore } from '@/stores/posture-store'
import { useTranslation } from '@/hooks/use-translation'
import { predictPain, getOverallPainRisk } from '@/lib/prediction'
import type { PainPrediction } from '@/lib/prediction'
import { useRouter } from 'next/navigation'

export default function PredictionPage() {
  const { language } = useTranslation()
  const router = useRouter()
  const { currentAnalysis, analysisHistory } = usePostureStore()

  const [activeTab, setActiveTab] = useState('pain')
  const [selectedPrediction, setSelectedPrediction] = useState<PainPrediction | null>(
    null
  )

  const painPredictions = useMemo(() => {
    return predictPain(analysisHistory, currentAnalysis)
  }, [analysisHistory, currentAnalysis])

  const overallRisk = useMemo(() => {
    return getOverallPainRisk(painPredictions)
  }, [painPredictions])

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'text-error'
      case 'medium':
        return 'text-warning'
      case 'low':
        return 'text-secondary'
    }
  }

  const getRiskBgColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'bg-error/10'
      case 'medium':
        return 'bg-warning/10'
      case 'low':
        return 'bg-secondary/10'
    }
  }

  const handleAreaClick = (area: string) => {
    const prediction = painPredictions.find((p) => p.area === area)
    if (prediction) {
      setSelectedPrediction(prediction)
    }
  }

  if (!currentAnalysis) {
    return (
      <MainLayout title={language === 'ko' ? '통증 예측' : 'Pain Prediction'}>
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-16 w-16 text-text-secondary mb-4" />
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                {language === 'ko'
                  ? '자세 분석이 필요합니다'
                  : 'Posture Analysis Required'}
              </h2>
              <p className="text-text-secondary mb-6 max-w-md">
                {language === 'ko'
                  ? '통증 예측을 위해 먼저 자세 분석을 진행해주세요. 분석 결과를 바탕으로 통증 위험도와 예방 방법을 알려드립니다.'
                  : 'Please complete a posture analysis first. We will predict pain risks and prevention methods based on your analysis results.'}
              </p>
              <Button onClick={() => router.push('/posture-analysis')}>
                {language === 'ko' ? '자세 분석하기' : 'Start Analysis'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={language === 'ko' ? '통증 예측' : 'Pain Prediction'}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${getRiskBgColor(
                  overallRisk.level
                )}`}
              >
                <AlertTriangle className={`h-6 w-6 ${getRiskColor(overallRisk.level)}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${getRiskColor(overallRisk.level)}`}>
                  {overallRisk.level === 'high'
                    ? language === 'ko'
                      ? '높음'
                      : 'High'
                    : overallRisk.level === 'medium'
                    ? language === 'ko'
                      ? '중간'
                      : 'Medium'
                    : language === 'ko'
                    ? '낮음'
                    : 'Low'}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '전체 위험도' : 'Overall Risk'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {overallRisk.areasAtRisk}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '위험 부위' : 'Areas at Risk'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {currentAnalysis.overallScore}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '현재 자세 점수' : 'Current Posture Score'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="pain" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pain">
              {language === 'ko' ? '통증 예측' : 'Pain Prediction'}
            </TabsTrigger>
            <TabsTrigger value="body">
              {language === 'ko' ? '체형 변화' : 'Body Change'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pain" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Body Pain Map */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {language === 'ko' ? '통증 위험 지도' : 'Pain Risk Map'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BodyPainMap
                      predictions={painPredictions}
                      onAreaClick={handleAreaClick}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pain Risk List */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-semibold text-text-primary">
                  {language === 'ko' ? '부위별 위험도' : 'Risk by Area'}
                </h3>
                {painPredictions.length === 0 ? (
                  <Card>
                    <CardContent className="flex h-40 items-center justify-center text-text-secondary">
                      {language === 'ko'
                        ? '감지된 위험이 없습니다'
                        : 'No risks detected'}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {painPredictions.map((prediction) => (
                      <PainRiskCard
                        key={prediction.area}
                        prediction={prediction}
                        onClick={() => setSelectedPrediction(prediction)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Prevention Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <PreventionTips predictions={painPredictions} />
            </motion.div>
          </TabsContent>

          <TabsContent value="body" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <BodyProgression
                  analysisHistory={analysisHistory}
                  currentAnalysis={currentAnalysis}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PreventionTips predictions={painPredictions} />
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedPrediction}
        onClose={() => setSelectedPrediction(null)}
        title={
          selectedPrediction
            ? language === 'ko'
              ? `${selectedPrediction.areaKo} 상세`
              : `${selectedPrediction.area} Details`
            : ''
        }
      >
        {selectedPrediction && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background">
              <span className="text-text-secondary">
                {language === 'ko' ? '위험도' : 'Risk Level'}
              </span>
              <span
                className={`font-bold ${getRiskColor(selectedPrediction.riskLevel)}`}
              >
                {selectedPrediction.probability}%
              </span>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">
                {language === 'ko' ? '예상 시기' : 'Expected Timeline'}
              </h4>
              <p className="text-text-secondary">
                {language === 'ko'
                  ? selectedPrediction.timelineKo
                  : selectedPrediction.timeline}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">
                {language === 'ko' ? '원인' : 'Contributing Factors'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(language === 'ko'
                  ? selectedPrediction.contributingFactorsKo
                  : selectedPrediction.contributingFactors
                ).map((factor, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-background text-sm text-text-secondary"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">
                {language === 'ko' ? '추천 운동' : 'Recommended Exercises'}
              </h4>
              <ul className="space-y-2">
                {(language === 'ko'
                  ? selectedPrediction.recommendationsKo
                  : selectedPrediction.recommendations
                ).map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-text-secondary"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="w-full mt-4"
              onClick={() => {
                setSelectedPrediction(null)
                router.push('/exercise/list')
              }}
            >
              {language === 'ko' ? '운동 시작하기' : 'Start Exercises'}
            </Button>
          </div>
        )}
      </Modal>
    </MainLayout>
  )
}
