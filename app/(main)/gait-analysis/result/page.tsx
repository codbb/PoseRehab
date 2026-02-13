'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Footprints,
  Activity,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { GaitDashboard, LargeMeasurementDisplay } from '@/components/gait/gait-dashboard'
import { SymmetryChart } from '@/components/gait/gait-charts'
import {
  ResultKneeAngleChart,
  ResultHipAngleChart,
  ResultAnkleHeightChart,
} from '@/components/gait/gait-result-charts'
import { useGaitStore } from '@/stores/gait-store'
import { useTranslation } from '@/hooks/use-translation'
import { GAIT_MEASUREMENT_LABELS, GAIT_ANOMALY_LABELS } from '@/lib/gait-constants'
import type { GaitAnalysisResult, GaitAnomaly, GaitRecommendation } from '@/types/gait'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function GaitResultPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </MainLayout>
    }>
      <GaitResultContent />
    </Suspense>
  )
}

function GaitResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resultId = searchParams.get('id')
  const { language } = useTranslation()

  const { analysisHistory } = useGaitStore()
  const [result, setResult] = useState<GaitAnalysisResult | null>(null)

  // 결과 찾기
  useEffect(() => {
    if (resultId) {
      const found = analysisHistory.find((r) => r.id === resultId)
      if (found) {
        setResult(found)
      }
    } else if (analysisHistory.length > 0) {
      // ID가 없으면 최신 결과 표시
      setResult(analysisHistory[0])
    }
  }, [resultId, analysisHistory])

  if (!result) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center">
          <p className="text-text-secondary">
            {language === 'ko' ? '결과를 찾을 수 없습니다' : 'Result not found'}
          </p>
          <Link
            href="/gait-analysis"
            className="mt-4 text-primary hover:underline"
          >
            {language === 'ko' ? '보행 분석으로 돌아가기' : 'Back to Gait Analysis'}
          </Link>
        </div>
      </MainLayout>
    )
  }

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return language === 'ko' ? '우수' : 'Excellent'
    if (score >= 60) return language === 'ko' ? '보통' : 'Average'
    return language === 'ko' ? '주의 필요' : 'Needs Attention'
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-text-secondary hover:text-text-primary rounded-lg p-2 transition-colors hover:bg-surface"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-text-primary text-xl font-bold">
                {language === 'ko' ? '분석 결과' : 'Analysis Result'}
              </h1>
              <p className="text-text-secondary text-sm">
                {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="text-text-secondary hover:text-text-primary rounded-lg p-2 transition-colors hover:bg-surface">
              <Share2 className="h-5 w-5" />
            </button>
            <button className="text-text-secondary hover:text-text-primary rounded-lg p-2 transition-colors hover:bg-surface">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 전체 점수 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-2xl border border-border p-6 text-center"
        >
          <div className="mb-2 text-sm text-text-secondary">
            {language === 'ko' ? '종합 점수' : 'Overall Score'}
          </div>
          {result.totalStrides > 0 ? (
            <>
              <div className={cn('text-6xl font-bold', getScoreColor(result.overallScore))}>
                {result.overallScore}
              </div>
              <div className={cn('mt-1 text-lg font-medium', getScoreColor(result.overallScore))}>
                {getScoreLabel(result.overallScore)}
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold text-text-secondary">—</div>
              <div className="mt-1 text-lg font-medium text-text-secondary">
                {language === 'ko' ? '측정 불가' : 'Insufficient Data'}
              </div>
            </>
          )}

          {/* 요약 통계 */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
            <div>
              <div className="flex items-center justify-center gap-1 text-text-secondary">
                <Clock className="h-4 w-4" />
                <span className="text-xs">
                  {language === 'ko' ? '분석 시간' : 'Duration'}
                </span>
              </div>
              <div className="text-text-primary mt-1 text-lg font-bold">
                {result.duration.toFixed(1)}s
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-text-secondary">
                <Footprints className="h-4 w-4" />
                <span className="text-xs">
                  {language === 'ko' ? '총 걸음 수' : 'Total Steps'}
                </span>
              </div>
              <div className="text-text-primary mt-1 text-lg font-bold">
                {result.totalStrides}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-text-secondary">
                <Activity className="h-4 w-4" />
                <span className="text-xs">
                  {language === 'ko' ? '입각기 비율' : 'Stance %'}
                </span>
              </div>
              <div className="text-text-primary mt-1 text-lg font-bold">
                {result.totalStrides > 0 ? `${result.phaseBreakdown.stancePercent.toFixed(0)}%` : '—'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 보행 주기 미감지 경고 */}
        {result.totalStrides === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {language === 'ko'
                ? '보행 주기가 감지되지 않았습니다. 측면에서 걷는 영상을 사용하면 더 정확한 결과를 얻을 수 있습니다.'
                : 'No gait cycles detected. Using a side-view walking video will provide more accurate results.'}
            </p>
          </motion.div>
        )}

        {/* 측정값 상세 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-2xl border border-border p-6"
        >
          <h2 className="text-text-primary mb-4 text-lg font-bold">
            {language === 'ko' ? '측정값 상세' : 'Measurement Details'}
          </h2>
          <GaitDashboard measurements={result.averageMeasurements} showAll />
        </motion.div>

        {/* 차트 영역 */}
        {result.chartData && result.chartData.timestamps.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-text-primary text-lg font-bold">
              {language === 'ko' ? '분석 차트' : 'Analysis Charts'}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ResultKneeAngleChart chartData={result.chartData} />
              <ResultHipAngleChart chartData={result.chartData} />
              <ResultAnkleHeightChart chartData={result.chartData} />
              <div>
                {result.isSideView ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                    <AlertTriangle className="mb-2 h-6 w-6 text-amber-500" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {language === 'ko'
                        ? '측면 촬영으로 좌우 대칭성 측정 불가'
                        : 'Left-right symmetry not measurable in side view'}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {language === 'ko'
                        ? '정면 촬영 시 정확한 대칭성을 확인할 수 있습니다.'
                        : 'Use a front-view recording for accurate symmetry analysis.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <SymmetryChart measurements={result.averageMeasurements} />
                    <p className="mt-1 px-2 text-xs text-text-secondary">
                      {language === 'ko'
                        ? '※ 측면 촬영 시 좌우 각도 차이가 크게 나타날 수 있습니다.'
                        : '※ Side-view recording may exaggerate left/right angle differences.'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 보행 단계 분석 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-2xl border border-border p-6"
        >
          <h2 className="text-text-primary mb-4 text-lg font-bold">
            {language === 'ko' ? '보행 단계 분석' : 'Gait Phase Analysis'}
          </h2>
          {result.totalStrides > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              <PhaseCard
                label={language === 'ko' ? '입각기' : 'Stance Phase'}
                value={result.phaseBreakdown.stancePercent}
                ideal={60}
                unit="%"
              />
              <PhaseCard
                label={language === 'ko' ? '유각기' : 'Swing Phase'}
                value={result.phaseBreakdown.swingPercent}
                ideal={40}
                unit="%"
              />
              <PhaseCard
                label={language === 'ko' ? '양하지 지지기' : 'Double Support'}
                value={result.phaseBreakdown.doubleSupport}
                ideal={20}
                unit="%"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl bg-background py-8 text-text-secondary">
              <p className="text-sm">
                {language === 'ko'
                  ? '보행 주기가 감지되지 않아 단계 분석을 할 수 없습니다.'
                  : 'Gait phase analysis unavailable — no gait cycles detected.'}
              </p>
            </div>
          )}
        </motion.div>

        {/* 이상 징후 */}
        {result.anomalies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface rounded-2xl border border-border p-6"
          >
            <h2 className="text-text-primary mb-4 flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {language === 'ko' ? '주의 사항' : 'Attention Areas'}
            </h2>
            <div className="space-y-3">
              {result.anomalies.map((anomaly, index) => (
                <AnomalyCard key={index} anomaly={anomaly} language={language} />
              ))}
            </div>
          </motion.div>
        )}

        {/* 권장사항 */}
        {result.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface rounded-2xl border border-border p-6"
          >
            <h2 className="text-text-primary mb-4 flex items-center gap-2 text-lg font-bold">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              {language === 'ko' ? '권장사항' : 'Recommendations'}
            </h2>
            <div className="space-y-3">
              {result.recommendations.map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} language={language} />
              ))}
            </div>
          </motion.div>
        )}

        {/* 새 분석 버튼 */}
        <div className="flex justify-center pb-6">
          <Link
            href="/gait-analysis"
            className="bg-primary hover:bg-primary-hover rounded-xl px-8 py-3 text-sm font-medium text-white transition-colors"
          >
            {language === 'ko' ? '새로운 분석 시작' : 'Start New Analysis'}
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}

// 이상 징후 카드
function AnomalyCard({ anomaly, language }: { anomaly: GaitAnomaly; language: string }) {
  const severityColors = {
    mild: 'border-amber-500/30 bg-amber-500/10',
    moderate: 'border-orange-500/30 bg-orange-500/10',
    severe: 'border-red-500/30 bg-red-500/10',
  }

  const severityLabels = {
    mild: language === 'ko' ? '경미' : 'Mild',
    moderate: language === 'ko' ? '중간' : 'Moderate',
    severe: language === 'ko' ? '심함' : 'Severe',
  }

  const labelInfo = GAIT_ANOMALY_LABELS[anomaly.type]

  return (
    <div className={cn('rounded-xl border p-4', severityColors[anomaly.severity])}>
      <div className="flex items-center justify-between">
        <span className="text-text-primary font-medium">
          {language === 'ko' ? labelInfo.ko : labelInfo.en}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            anomaly.severity === 'severe'
              ? 'bg-red-500/20 text-red-500'
              : anomaly.severity === 'moderate'
              ? 'bg-orange-500/20 text-orange-500'
              : 'bg-amber-500/20 text-amber-500'
          )}
        >
          {severityLabels[anomaly.severity]}
        </span>
      </div>
      <p className="text-text-secondary mt-1 text-sm">
        {language === 'ko' ? anomaly.descriptionKo : anomaly.description}
      </p>
      {anomaly.affectedSide && (
        <p className="text-text-secondary mt-1 text-xs">
          {language === 'ko' ? '영향 부위: ' : 'Affected: '}
          {anomaly.affectedSide === 'left'
            ? language === 'ko'
              ? '왼쪽'
              : 'Left'
            : anomaly.affectedSide === 'right'
            ? language === 'ko'
              ? '오른쪽'
              : 'Right'
            : language === 'ko'
            ? '양쪽'
            : 'Both'}
        </p>
      )}
    </div>
  )
}

// 권장사항 카드
function RecommendationCard({
  recommendation,
  language,
}: {
  recommendation: GaitRecommendation
  language: string
}) {
  const typeIcons = {
    exercise: '🏋️',
    posture: '🧘',
    medical: '🏥',
    lifestyle: '🌟',
  }

  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-blue-500',
  }

  return (
    <div
      className={cn(
        'bg-background rounded-lg border-l-4 p-4',
        priorityColors[recommendation.priority]
      )}
    >
      <div className="flex items-center gap-2">
        <span>{typeIcons[recommendation.type]}</span>
        <span className="text-text-primary font-medium">
          {language === 'ko' ? recommendation.titleKo : recommendation.title}
        </span>
      </div>
      <p className="text-text-secondary mt-1 text-sm">
        {language === 'ko' ? recommendation.descriptionKo : recommendation.description}
      </p>
    </div>
  )
}

// 보행 단계 카드
function PhaseCard({
  label,
  value,
  ideal,
  unit,
}: {
  label: string
  value: number
  ideal: number
  unit: string
}) {
  const diff = value - ideal
  const isNormal = Math.abs(diff) <= 5

  return (
    <div className="bg-background rounded-xl p-4 text-center">
      <div className="text-text-secondary text-xs">{label}</div>
      <div
        className={cn(
          'mt-1 text-2xl font-bold',
          isNormal ? 'text-emerald-500' : 'text-amber-500'
        )}
      >
        {value.toFixed(0)}
        {unit}
      </div>
      <div className="text-text-secondary mt-1 text-xs">
        정상: {ideal}
        {unit}
      </div>
    </div>
  )
}
