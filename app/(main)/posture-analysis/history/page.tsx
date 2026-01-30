'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Scan,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import { generateDetailedResult } from '@/lib/mock-analysis-data'
import { cn } from '@/lib/utils'
import type { PostureAnalysisResult } from '@/types/posture'

// Group analysis results by date
function groupByDate(results: PostureAnalysisResult[]): Record<string, PostureAnalysisResult[]> {
  const groups: Record<string, PostureAnalysisResult[]> = {}

  for (const result of results) {
    const date = result.timestamp.split('T')[0]
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(result)
  }

  return groups
}

// Format date for display
function formatDate(dateStr: string, language: string): string {
  const date = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }
  return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', options)
}

// Format time for display
function formatTime(timestamp: string, language: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get score color
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-secondary'
  if (score >= 60) return 'text-warning'
  return 'text-error'
}

// Get score background
function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-secondary/10'
  if (score >= 60) return 'bg-warning/10'
  return 'bg-error/10'
}

export default function PostureAnalysisHistoryPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const {
    analysisHistory,
    setCurrentAnalysis,
    clearHistory,
    setDetailedResult,
    saveDetailedResult,
    loadDetailedResultById,
    setViewingFromHistory,
  } = usePostureStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Group results by date
  const groupedResults = useMemo(() => groupByDate(analysisHistory), [analysisHistory])
  const sortedDates = useMemo(
    () => Object.keys(groupedResults).sort((a, b) => b.localeCompare(a)),
    [groupedResults]
  )

  // Get dates with analyses for the current month
  const datesWithAnalyses = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return sortedDates.filter((date) => {
      const d = new Date(date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [sortedDates, currentMonth])

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }

  // Calculate trend between consecutive analyses
  const getTrend = (index: number): 'up' | 'down' | 'stable' | null => {
    if (index >= analysisHistory.length - 1) return null
    const current = analysisHistory[index].overallScore
    const previous = analysisHistory[index + 1].overallScore
    if (current > previous + 5) return 'up'
    if (current < previous - 5) return 'down'
    return 'stable'
  }

  // Handle view detail - 상세 페이지로 이동
  const handleViewDetail = (result: PostureAnalysisResult) => {
    setCurrentAnalysis(result)

    // 저장된 상세 결과가 있으면 불러오고, 없으면 생성
    let detailedResult = loadDetailedResultById(result.id)
    if (!detailedResult) {
      detailedResult = generateDetailedResult(result)
      saveDetailedResult(result.id, detailedResult)
    }

    setDetailedResult(detailedResult)
    setViewingFromHistory(true)

    // 결과 페이지로 이동
    router.push('/posture-analysis/result/classification')
  }

  // Handle delete all
  const handleDeleteAll = () => {
    clearHistory()
    setShowDeleteConfirm(false)
  }

  // Get stats
  const stats = useMemo(() => {
    if (analysisHistory.length === 0) return null

    const scores = analysisHistory.map((r) => r.overallScore)
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const totalCount = analysisHistory.length

    // Score trend (compare first 5 vs last 5)
    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (analysisHistory.length >= 10) {
      const recent = analysisHistory.slice(0, 5)
      const older = analysisHistory.slice(-5)
      const recentAvg = recent.reduce((a, b) => a + b.overallScore, 0) / 5
      const olderAvg = older.reduce((a, b) => a + b.overallScore, 0) / 5
      if (recentAvg > olderAvg + 5) trend = 'improving'
      else if (recentAvg < olderAvg - 5) trend = 'declining'
    }

    return { avgScore, maxScore, minScore, totalCount, trend }
  }, [analysisHistory])

  return (
    <MainLayout
      title={language === 'ko' ? '분석 기록' : 'Analysis History'}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header with Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">
                  {language === 'ko' ? '총 분석 횟수' : 'Total Analyses'}
                </p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">
                  {language === 'ko' ? '평균 점수' : 'Average Score'}
                </p>
                <p className={cn('text-2xl font-bold', getScoreColor(stats.avgScore))}>
                  {stats.avgScore}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">
                  {language === 'ko' ? '최고 점수' : 'Best Score'}
                </p>
                <p className="text-2xl font-bold text-secondary">{stats.maxScore}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">
                  {language === 'ko' ? '추세' : 'Trend'}
                </p>
                <div className="flex items-center gap-2">
                  {stats.trend === 'improving' && (
                    <>
                      <TrendingUp className="h-5 w-5 text-secondary" />
                      <span className="text-secondary font-medium">
                        {language === 'ko' ? '개선 중' : 'Improving'}
                      </span>
                    </>
                  )}
                  {stats.trend === 'declining' && (
                    <>
                      <TrendingDown className="h-5 w-5 text-error" />
                      <span className="text-error font-medium">
                        {language === 'ko' ? '악화 중' : 'Declining'}
                      </span>
                    </>
                  )}
                  {stats.trend === 'stable' && (
                    <>
                      <Minus className="h-5 w-5 text-text-secondary" />
                      <span className="text-text-secondary font-medium">
                        {language === 'ko' ? '유지 중' : 'Stable'}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium text-text-primary">
              {currentMonth.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                year: 'numeric',
                month: 'long',
              })}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {analysisHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-error hover:bg-error/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {language === 'ko' ? '전체 삭제' : 'Delete All'}
            </Button>
          )}
        </div>

        {/* Results List */}
        {analysisHistory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Scan className="h-16 w-16 text-text-secondary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {language === 'ko' ? '분석 기록이 없습니다' : 'No analysis history'}
              </h3>
              <p className="text-text-secondary text-center mb-4">
                {language === 'ko'
                  ? '자세 분석을 진행하면 여기에 기록이 표시됩니다.'
                  : 'Your posture analysis results will appear here.'}
              </p>
              <Button onClick={() => (window.location.href = '/posture-analysis')}>
                <Scan className="mr-2 h-4 w-4" />
                {language === 'ko' ? '자세 분석하기' : 'Start Analysis'}
              </Button>
            </CardContent>
          </Card>
        ) : datesWithAnalyses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-text-secondary mb-4" />
              <p className="text-text-secondary">
                {language === 'ko'
                  ? '이 달에는 분석 기록이 없습니다'
                  : 'No analyses this month'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {datesWithAnalyses.map((date) => (
              <div key={date}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <Calendar className="h-4 w-4" />
                  {formatDate(date, language)}
                </h3>
                <div className="space-y-3">
                  {groupedResults[date].map((result, idx) => {
                    const globalIndex = analysisHistory.findIndex((r) => r.id === result.id)
                    const trend = getTrend(globalIndex)

                    return (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card
                          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                          onClick={() => handleViewDetail(result)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              {/* Thumbnail */}
                              {result.imageData && (
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-background">
                                  <img
                                    src={result.imageData}
                                    alt="Analysis"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm text-text-secondary">
                                    {formatTime(result.timestamp, language)}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-background text-text-secondary">
                                    {result.direction === 'front'
                                      ? language === 'ko'
                                        ? '정면'
                                        : 'Front'
                                      : result.direction === 'side'
                                      ? language === 'ko'
                                        ? '측면'
                                        : 'Side'
                                      : language === 'ko'
                                      ? '후면'
                                      : 'Back'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {result.postureTypes
                                    .filter((t) => t !== 'normal')
                                    .slice(0, 3)
                                    .map((type) => (
                                      <span
                                        key={type}
                                        className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning"
                                      >
                                        {type.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                  {result.postureTypes.filter((t) => t !== 'normal').length ===
                                    0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                      {language === 'ko' ? '정상' : 'Normal'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Score */}
                              <div className="flex items-center gap-3">
                                {trend && (
                                  <div className="flex items-center">
                                    {trend === 'up' && (
                                      <TrendingUp className="h-4 w-4 text-secondary" />
                                    )}
                                    {trend === 'down' && (
                                      <TrendingDown className="h-4 w-4 text-error" />
                                    )}
                                    {trend === 'stable' && (
                                      <Minus className="h-4 w-4 text-text-secondary" />
                                    )}
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    'flex h-12 w-12 items-center justify-center rounded-full',
                                    getScoreBg(result.overallScore)
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'text-lg font-bold',
                                      getScoreColor(result.overallScore)
                                    )}
                                  >
                                    {result.overallScore}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title={language === 'ko' ? '전체 삭제' : 'Delete All'}
        >
          <div className="space-y-4">
            <p className="text-text-secondary">
              {language === 'ko'
                ? '모든 분석 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
                : 'Are you sure you want to delete all analysis history? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDeleteAll}
                className="bg-error hover:bg-error/90 text-white"
              >
                {language === 'ko' ? '삭제' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  )
}
