'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Trash2,
  Clock,
  Footprints,
  TrendingUp,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { GaitTrendChart } from '@/components/gait/gait-charts'
import { useGaitStore } from '@/stores/gait-store'
import { useTranslation } from '@/hooks/use-translation'
import { GAIT_MEASUREMENT_LABELS } from '@/lib/gait-constants'
import type { GaitAnalysisResult } from '@/types/gait'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function GaitHistoryPage() {
  const router = useRouter()
  const { language } = useTranslation()
  const { analysisHistory, deleteAnalysis, clearHistory } = useGaitStore()

  const [selectedMetric, setSelectedMetric] = useState<'gaitSpeed' | 'leftRightSymmetry'>(
    'gaitSpeed'
  )
  const [confirmClear, setConfirmClear] = useState(false)

  // 트렌드 데이터 생성
  const trendData = analysisHistory
    .slice()
    .reverse()
    .map((result) => ({
      timestamp: result.timestamp,
      value: result.averageMeasurements[selectedMetric]?.value || 0,
    }))

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500/10'
    if (score >= 60) return 'text-amber-500 bg-amber-500/10'
    return 'text-red-500 bg-red-500/10'
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(language === 'ko' ? '이 기록을 삭제하시겠습니까?' : 'Delete this record?')) {
      deleteAnalysis(id)
    }
  }

  const handleClearAll = () => {
    if (confirmClear) {
      clearHistory()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
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
                {language === 'ko' ? '보행 분석 기록' : 'Gait Analysis History'}
              </h1>
              <p className="text-text-secondary text-sm">
                {language === 'ko'
                  ? `총 ${analysisHistory.length}개의 기록`
                  : `${analysisHistory.length} records total`}
              </p>
            </div>
          </div>

          {analysisHistory.length > 0 && (
            <button
              onClick={handleClearAll}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
                confirmClear
                  ? 'bg-red-500 text-white'
                  : 'text-text-secondary hover:bg-red-500/10 hover:text-red-500'
              )}
            >
              <Trash2 className="h-4 w-4" />
              {confirmClear
                ? language === 'ko'
                  ? '클릭하여 확인'
                  : 'Click to confirm'
                : language === 'ko'
                ? '전체 삭제'
                : 'Clear All'}
            </button>
          )}
        </div>

        {/* 트렌드 차트 */}
        {analysisHistory.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* 메트릭 선택 */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('gaitSpeed')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  selectedMetric === 'gaitSpeed'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface/80'
                )}
              >
                {language === 'ko' ? '보행 속도' : 'Gait Speed'}
              </button>
              <button
                onClick={() => setSelectedMetric('leftRightSymmetry')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  selectedMetric === 'leftRightSymmetry'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface/80'
                )}
              >
                {language === 'ko' ? '좌우 대칭성' : 'Symmetry'}
              </button>
            </div>

            <GaitTrendChart history={trendData} metric={selectedMetric} />
          </motion.div>
        )}

        {/* 기록 목록 */}
        {analysisHistory.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <AlertCircle className="text-text-secondary mb-4 h-12 w-12" />
            <p className="text-text-secondary text-center">
              {language === 'ko'
                ? '아직 기록이 없습니다'
                : 'No records yet'}
            </p>
            <Link
              href="/gait-analysis"
              className="mt-4 text-primary hover:underline"
            >
              {language === 'ko' ? '첫 분석 시작하기' : 'Start your first analysis'}
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {analysisHistory.map((result, index) => (
                <HistoryCard
                  key={result.id}
                  result={result}
                  index={index}
                  language={language}
                  getScoreColor={getScoreColor}
                  onDelete={handleDelete}
                  onClick={() => router.push(`/gait-analysis/result?id=${result.id}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

// 기록 카드 컴포넌트
function HistoryCard({
  result,
  index,
  language,
  getScoreColor,
  onDelete,
  onClick,
}: {
  result: GaitAnalysisResult
  index: number
  language: string
  getScoreColor: (score: number) => string
  onDelete: (id: string, e: React.MouseEvent) => void
  onClick: () => void
}) {
  const date = new Date(result.timestamp)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-surface group cursor-pointer rounded-xl border border-border p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-4">
        {/* 점수 */}
        <div
          className={cn(
            'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-xl font-bold',
            getScoreColor(result.overallScore)
          )}
        >
          {result.overallScore}
        </div>

        {/* 정보 */}
        <div className="min-w-0 flex-1">
          <div className="text-text-primary font-medium">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {result.duration.toFixed(1)}s
            </span>
            <span className="flex items-center gap-1">
              <Footprints className="h-3.5 w-3.5" />
              {result.totalStrides} {language === 'ko' ? '걸음' : 'steps'}
            </span>
            {result.anomalies.length > 0 && (
              <span className="text-amber-500">
                {result.anomalies.length} {language === 'ko' ? '주의' : 'alerts'}
              </span>
            )}
          </div>
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => onDelete(result.id, e)}
            className="text-text-secondary hover:text-red-500 rounded-lg p-2 opacity-0 transition-all group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronRight className="text-text-secondary h-5 w-5" />
        </div>
      </div>

      {/* 주요 측정값 미리보기 */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <MiniMetric
          label={language === 'ko' ? '보행 속도' : 'Speed'}
          value={result.averageMeasurements.gaitSpeed?.value}
          unit="m/s"
          status={result.averageMeasurements.gaitSpeed?.status}
        />
        <MiniMetric
          label={language === 'ko' ? '대칭성' : 'Symmetry'}
          value={result.averageMeasurements.leftRightSymmetry?.value}
          unit=""
          status={result.averageMeasurements.leftRightSymmetry?.status}
        />
        <MiniMetric
          label={language === 'ko' ? '무릎 굴곡' : 'Knee'}
          value={
            ((result.averageMeasurements.kneeFlexionLeft?.value || 0) +
              (result.averageMeasurements.kneeFlexionRight?.value || 0)) /
            2
          }
          unit="°"
          status={result.averageMeasurements.kneeFlexionLeft?.status}
        />
      </div>
    </motion.div>
  )
}

// 미니 측정값 표시
function MiniMetric({
  label,
  value,
  unit,
  status,
}: {
  label: string
  value?: number
  unit: string
  status?: 'normal' | 'warning' | 'danger'
}) {
  const statusColors = {
    normal: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  }

  return (
    <div className="text-center">
      <div className="text-text-secondary text-xs">{label}</div>
      <div className={cn('text-sm font-medium', status ? statusColors[status] : 'text-text-primary')}>
        {value !== undefined ? value.toFixed(unit === '°' ? 0 : 2) : '--'}
        {unit}
      </div>
    </div>
  )
}
