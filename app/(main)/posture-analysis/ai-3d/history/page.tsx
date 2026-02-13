'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  Dumbbell,
  Brain,
  Shield,
  Clock,
  Image as ImageIcon,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AI3DProgressChart } from '@/components/posture/ai3d-progress-chart'
// TODO: 추후 업그레이드 후 활성화
// import { MuscleStatusVisualization } from '@/components/posture/muscle-status-visualization'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import type { AI3DAnalysisHistoryEntry, ViewAngle, Pose3DPredictedCondition, Pose3DRecommendation } from '@/types/analysis-result'
import type { BodyPartRisk } from '@/lib/analysis/pose-3d-analyzer'
import { RISK_FACTORS, getRiskFactorKey } from '@/lib/analysis/risk-factors'
import { cn } from '@/lib/utils'

export default function AI3DHistoryPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { ai3dAnalysisHistory, deleteAI3DAnalysis, clearAI3DHistory } = usePostureStore()
  const [selectedEntry, setSelectedEntry] = useState<AI3DAnalysisHistoryEntry | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())

  const sortedHistory = useMemo(() => {
    return [...ai3dAnalysisHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [ai3dAnalysisHistory])

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    if (language === 'ko') {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  const scoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10'
    if (score >= 50) return 'bg-amber-500/10'
    return 'bg-red-500/10'
  }

  const scoreStroke = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
  }

  const riskColor = (level: string) => {
    switch (level) {
      case 'danger': return 'text-red-500'
      case 'warning': return 'text-amber-500'
      default: return 'text-emerald-500'
    }
  }

  const riskBg = (level: string) => {
    switch (level) {
      case 'danger': return 'bg-red-500'
      case 'warning': return 'bg-amber-500'
      default: return 'bg-emerald-500'
    }
  }

  const riskBgLight = (level: string) => {
    switch (level) {
      case 'danger': return 'bg-red-500/10'
      case 'warning': return 'bg-amber-500/10'
      default: return 'bg-emerald-500/10'
    }
  }

  const riskLabel = (level: string) => {
    switch (level) {
      case 'danger': return t('ai3d.riskDanger')
      case 'warning': return t('ai3d.riskWarning')
      default: return t('ai3d.riskNormal')
    }
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    }
  }

  const priorityLabel = (p: string) => {
    switch (p) {
      case 'high': return t('ai3d.priorityHigh')
      case 'medium': return t('ai3d.priorityMedium')
      default: return t('ai3d.priorityLow')
    }
  }

  const viewLabel = (view: ViewAngle) => {
    switch (view) {
      case 'front': return t('ai3d.frontView')
      case 'side': return t('ai3d.sideView')
      case 'back': return t('ai3d.backView')
    }
  }

  const toggleRec = (index: number) => {
    setExpandedRecs((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleDelete = (id: string) => {
    deleteAI3DAnalysis(id)
    setShowDeleteConfirm(null)
    if (selectedEntry?.id === id) {
      setSelectedEntry(null)
    }
  }

  const handleClearAll = () => {
    clearAI3DHistory()
    setShowClearConfirm(false)
    setSelectedEntry(null)
  }

  const renderScoreGauge = (score: number, size = 140) => {
    const radius = (size / 2) - 16
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference
    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreStroke(score)}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn('text-3xl font-bold', scoreColor(score))}>{score}</span>
          <span className="text-xs text-text-secondary">/100</span>
        </div>
      </div>
    )
  }

  const renderRiskBar = (risk: BodyPartRisk) => {
    const maxVal = risk.threshold.danger * 1.5
    const pct = Math.min((risk.measuredValue / maxVal) * 100, 100)
    const warningPct = (risk.threshold.warning / maxVal) * 100
    const dangerPct = (risk.threshold.danger / maxVal) * 100

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">
            {t('ai3d.measured')}: <span className={cn('font-semibold', riskColor(risk.level))}>{risk.measuredValue}{risk.unit}</span>
          </span>
          <span className={cn('font-medium', riskColor(risk.level))}>{riskLabel(risk.level)}</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-border">
          <div className="absolute top-0 h-full w-px bg-amber-400/60" style={{ left: `${warningPct}%` }} />
          <div className="absolute top-0 h-full w-px bg-red-400/60" style={{ left: `${dangerPct}%` }} />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn('h-full rounded-full', riskBg(risk.level))}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-secondary">
          <span>0{risk.unit}</span>
          <span>{risk.threshold.warning}{risk.unit}</span>
          <span>{risk.threshold.danger}{risk.unit}</span>
        </div>
      </div>
    )
  }

  const renderRiskCard = (risk: BodyPartRisk, index: number) => {
    const factorKey = getRiskFactorKey(risk.name)
    const factors = factorKey ? RISK_FACTORS[factorKey] : undefined

    return (
      <motion.div
        key={risk.name}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className={cn('border-l-4', risk.level === 'danger' ? 'border-l-red-500' : risk.level === 'warning' ? 'border-l-amber-500' : 'border-l-emerald-500')}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', riskBgLight(risk.level))}>
                  {risk.level === 'normal' ? (
                    <CheckCircle className={cn('h-4 w-4', riskColor(risk.level))} />
                  ) : risk.level === 'warning' ? (
                    <AlertTriangle className={cn('h-4 w-4', riskColor(risk.level))} />
                  ) : (
                    <Shield className={cn('h-4 w-4', riskColor(risk.level))} />
                  )}
                </div>
                <span className="font-semibold text-text-primary">
                  {language === 'ko' ? risk.nameKo : risk.name}
                </span>
              </div>
            </div>
            {renderRiskBar(risk)}
            <p className="text-xs text-text-secondary">
              {language === 'ko' ? risk.descriptionKo : risk.description}
            </p>
            {factors && factors.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <span className="text-xs font-medium text-text-secondary">
                  {language === 'ko' ? '영향을 주는 요인들' : 'Contributing Factors'}
                </span>
                <ul className="mt-1 space-y-0.5">
                  {factors.map((f, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1">
                      <span className="text-text-secondary/50 mt-0.5">&bull;</span>
                      <span>{language === 'ko' ? f.ko : f.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderCondition = (condition: Pose3DPredictedCondition, index: number) => (
    <motion.div
      key={condition.name}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="space-y-1.5 rounded-lg border border-border p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          {language === 'ko' ? condition.nameKo : condition.name}
        </span>
        <span className={cn(
          'rounded-full border px-2 py-0.5 text-xs font-medium',
          condition.severity === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'border-border text-text-secondary',
        )}>
          {condition.severity === 'high' ? t('ai3d.riskDanger') : condition.severity === 'medium' ? t('ai3d.riskWarning') : t('ai3d.riskNormal')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${condition.probability}%` }}
            transition={{ duration: 0.6, delay: index * 0.08 }}
            className={cn(
              'h-full rounded-full',
              condition.probability >= 70 ? 'bg-red-500' : condition.probability >= 40 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
          />
        </div>
        <span className="text-xs font-semibold text-text-secondary w-10 text-right">{condition.probability}%</span>
      </div>
      <p className="text-xs text-text-secondary">
        {language === 'ko' ? condition.descriptionKo : condition.description}
      </p>
    </motion.div>
  )

  const renderRecommendation = (rec: Pose3DRecommendation, index: number) => {
    const isExpanded = expandedRecs.has(index)
    return (
      <motion.div
        key={rec.title}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => toggleRec(index)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {language === 'ko' ? rec.titleKo : rec.title}
                  </p>
                  <div className="mt-0.5">
                    <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium', priorityColor(rec.priority))}>
                      {t('ai3d.priority')}: {priorityLabel(rec.priority)}
                    </span>
                  </div>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    <p className="text-xs text-text-secondary">
                      {language === 'ko' ? rec.descriptionKo : rec.description}
                    </p>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-text-primary">{t('ai3d.exerciseList')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.exercises.map((ex) => (
                          <span key={ex.name} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {language === 'ko' ? ex.nameKo : ex.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderHistoryCard = (entry: AI3DAnalysisHistoryEntry) => {
    const hasImages = entry.images && (entry.images.front || entry.images.side || entry.images.back)
    const thumbnailImage = entry.images?.front || entry.images?.side || entry.images?.back

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className="cursor-pointer"
        onClick={() => setSelectedEntry(entry)}
      >
        <Card className={cn(
          'transition-all hover:border-primary/40 hover:shadow-md',
          selectedEntry?.id === entry.id && 'border-primary ring-2 ring-primary/20'
        )}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                {thumbnailImage ? (
                  <div className="h-20 w-16 overflow-hidden rounded-lg bg-black">
                    <img
                      src={thumbnailImage}
                      alt="Analysis"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-border">
                    <ImageIcon className="h-6 w-6 text-text-secondary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(entry.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-2xl font-bold', scoreColor(entry.overallScore))}>
                        {entry.overallScore}
                      </span>
                      <span className="text-sm text-text-secondary">/100</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(entry.id)
                    }}
                    className="rounded-lg p-2 text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Score badges */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['front', 'side', 'back'] as ViewAngle[]).map((view) => {
                    const score = view === 'front' ? entry.frontScore : view === 'side' ? entry.sideScore : entry.backScore
                    return (
                      <div
                        key={view}
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5',
                          score === null ? 'bg-border/50' : scoreBg(score)
                        )}
                      >
                        <span className="text-[10px] font-medium text-text-secondary">{viewLabel(view)}</span>
                        <span className={cn('text-xs font-bold', score === null ? 'text-text-secondary' : scoreColor(score))}>
                          {score ?? '-'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete confirmation modal */}
        <AnimatePresence>
          {showDeleteConfirm === entry.id && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(null)
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {language === 'ko' ? '기록 삭제' : 'Delete Record'}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {language === 'ko' ? '이 분석 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.' : 'Are you sure you want to delete this analysis record? This action cannot be undone.'}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(null)
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(entry.id)
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  const renderDetailView = () => {
    if (!selectedEntry) return null

    const risks: BodyPartRisk[] = []
    if (selectedEntry.frontMetrics) {
      risks.push(selectedEntry.frontMetrics.shoulderRisk as BodyPartRisk)
      risks.push(selectedEntry.frontMetrics.pelvisRisk as BodyPartRisk)
      if (selectedEntry.frontMetrics.legRisk) {
        risks.push(selectedEntry.frontMetrics.legRisk as BodyPartRisk)
      }
    }
    if (selectedEntry.sideMetrics) {
      risks.push(selectedEntry.sideMetrics.neckRisk as BodyPartRisk)
      // Use split spine risks if available, otherwise fallback to combined
      if (selectedEntry.sideMetrics.thoracicKyphosisRisk) {
        risks.push(selectedEntry.sideMetrics.thoracicKyphosisRisk as BodyPartRisk)
      }
      if (selectedEntry.sideMetrics.lumbarLordosisRisk) {
        risks.push(selectedEntry.sideMetrics.lumbarLordosisRisk as BodyPartRisk)
      }
      if (!selectedEntry.sideMetrics.thoracicKyphosisRisk && !selectedEntry.sideMetrics.lumbarLordosisRisk) {
        risks.push(selectedEntry.sideMetrics.spineRisk as BodyPartRisk)
      }
      if (selectedEntry.sideMetrics.roundShoulderRisk) {
        risks.push(selectedEntry.sideMetrics.roundShoulderRisk as BodyPartRisk)
      }
    }
    if (selectedEntry.backMetrics) {
      risks.push(selectedEntry.backMetrics.spineRisk as BodyPartRisk)
      risks.push(selectedEntry.backMetrics.scapulaRisk as BodyPartRisk)
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(selectedEntry.timestamp)}</span>
          </div>
          <button
            onClick={() => setSelectedEntry(null)}
            className="rounded-lg p-2 text-text-secondary hover:bg-background lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Images */}
        {selectedEntry.images && (
          <div className="grid grid-cols-3 gap-3">
            {(['front', 'side', 'back'] as ViewAngle[]).map((view) => {
              const image = selectedEntry.images?.[view]
              const score = view === 'front' ? selectedEntry.frontScore : view === 'side' ? selectedEntry.sideScore : selectedEntry.backScore
              return (
                <div key={view} className="relative overflow-hidden rounded-xl border border-border bg-black">
                  {image ? (
                    <div className="aspect-[3/4]">
                      <img src={image} alt={viewLabel(view)} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-text-secondary/50" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                        {viewLabel(view)}
                      </span>
                      {score !== null && (
                        <span className={cn('text-xs font-bold', scoreColor(score))}>{score}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Overall Score */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-6">
              {renderScoreGauge(selectedEntry.overallScore)}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-primary">{t('ai3d.combinedScore')}</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  {selectedEntry.overallScore >= 80
                    ? t('ai3d.goodPosture')
                    : language === 'ko'
                    ? '개선이 필요한 부위가 있습니다'
                    : 'Some areas need improvement'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Cards */}
        {risks.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Shield className="h-4 w-4" />
              {t('ai3d.viewRisks')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {risks.map((risk, i) => renderRiskCard(risk, i))}
            </div>
          </div>
        )}

        {/* Conditions */}
        {selectedEntry.conditions && selectedEntry.conditions.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
              <AlertTriangle className="h-4 w-4" />
              {t('ai3d.predictedConditions')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedEntry.conditions.map((c, i) => renderCondition(c, i))}
            </div>
          </div>
        )}

        {/* TODO: 추후 업그레이드 후 활성화 - 근육 상태 시각화 */}
        {/* {selectedEntry.conditions && selectedEntry.conditions.length > 0 && (
          <MuscleStatusVisualization
            conditions={selectedEntry.conditions}
            legAlignmentType={selectedEntry.frontMetrics?.legAlignment?.type}
          />
        )} */}

        {/* Recommendations */}
        {selectedEntry.recommendations && selectedEntry.recommendations.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Dumbbell className="h-4 w-4" />
              {t('ai3d.recommendations')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedEntry.recommendations.map((rec, i) => renderRecommendation(rec, i))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={() => router.push('/exercise/list')}
          className="w-full"
          size="lg"
        >
          <Dumbbell className="mr-2 h-4 w-4" />
          {language === 'ko' ? '운동하러 가기' : 'Go to Exercises'}
        </Button>
      </motion.div>
    )
  }

  return (
    <MainLayout title={t('ai3dHistory.title')}>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/posture-analysis/ai-3d')}
              className="rounded-lg p-2 text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('ai3dHistory.title')}</h2>
              <p className="text-sm text-text-secondary">
                {language === 'ko' ? `${sortedHistory.length}개의 기록` : `${sortedHistory.length} records`}
              </p>
            </div>
          </div>
          {sortedHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="text-red-500 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('ai3dHistory.clearAll')}
            </Button>
          )}
        </motion.div>

        {/* Content */}
        {sortedHistory.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-16"
          >
            <Clock className="mb-4 h-12 w-12 text-text-secondary/50" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">{t('ai3dHistory.noRecords')}</h3>
            <p className="text-sm text-text-secondary mb-4">{t('ai3dHistory.noRecordsDesc')}</p>
            <Button onClick={() => router.push('/posture-analysis/ai-3d')}>
              <Brain className="mr-2 h-4 w-4" />
              {t('ai3dHistory.startAnalysis')}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Progress Chart */}
            <AI3DProgressChart history={ai3dAnalysisHistory} />

            {/* History List & Detail View */}
            <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
              {/* History List */}
              <div className="space-y-3">
                {sortedHistory.map(renderHistoryCard)}
              </div>

              {/* Detail View */}
              <div className="hidden lg:block">
                {selectedEntry ? (
                  renderDetailView()
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8">
                    <p className="text-sm text-text-secondary">{t('ai3dHistory.selectRecord')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Detail View Modal */}
        <AnimatePresence>
          {selectedEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-background p-4 lg:hidden"
            >
              {renderDetailView()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear All Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowClearConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {t('ai3dHistory.clearAllTitle')}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {t('ai3dHistory.clearAllDesc')}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleClearAll}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}
