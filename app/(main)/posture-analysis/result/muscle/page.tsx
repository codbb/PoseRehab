'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import { AnatomicalBody, isMuscleVisibleInView, type MuscleState } from '@/components/posture/anatomical-body'
import type { MuscleInfo } from '@/types/analysis-result'

interface MuscleToggleProps {
  muscle: MuscleInfo
  type: 'contracted' | 'stretched'
  language: 'ko' | 'en'
  onToggle: (id: string) => void
  isInCurrentView?: boolean
}

function MuscleToggle({ muscle, type, language, onToggle, isInCurrentView = true }: MuscleToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg transition-all',
        muscle.visible
          ? type === 'contracted'
            ? 'bg-error/10'
            : 'bg-primary/10'
          : 'bg-background',
        !isInCurrentView && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-sm',
            muscle.visible ? 'text-text-primary' : 'text-text-secondary'
          )}
        >
          {language === 'ko' ? muscle.nameKo : muscle.name}
        </span>
        {!isInCurrentView && (
          <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-border/50 rounded">
            {language === 'ko' ? '다른 뷰' : 'Other view'}
          </span>
        )}
      </div>
      <button
        onClick={() => onToggle(muscle.id)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-all flex-shrink-0',
          muscle.visible
            ? type === 'contracted'
              ? 'bg-error'
              : 'bg-primary'
            : 'bg-border'
        )}
      >
        <motion.div
          animate={{ x: muscle.visible ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </motion.div>
  )
}

export default function MusclePage() {
  const router = useRouter()
  const { language } = useTranslation()
  const { detailedResult } = usePostureStore()
  const [viewMode, setViewMode] = useState<'front' | 'rear'>('front')
  const [contractedMuscles, setContractedMuscles] = useState<MuscleInfo[]>([])
  const [stretchedMuscles, setStretchedMuscles] = useState<MuscleInfo[]>([])
  const [showContracted, setShowContracted] = useState(true)
  const [showStretched, setShowStretched] = useState(true)

  // 결과가 없으면 분석 페이지로 리다이렉트
  useEffect(() => {
    if (!detailedResult) {
      router.replace('/posture-analysis')
      return
    }
    setContractedMuscles(detailedResult.muscleAnalysis.contracted)
    setStretchedMuscles(detailedResult.muscleAnalysis.stretched)
  }, [detailedResult, router])

  // 결과가 없으면 로딩 표시
  if (!detailedResult) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const toggleMuscle = (id: string, type: 'contracted' | 'stretched') => {
    if (type === 'contracted') {
      setContractedMuscles((prev) =>
        prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
      )
    } else {
      setStretchedMuscles((prev) =>
        prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
      )
    }
  }

  const toggleAllContracted = (visible: boolean) => {
    setContractedMuscles((prev) => prev.map((m) => ({ ...m, visible })))
    setShowContracted(visible)
  }

  const toggleAllStretched = (visible: boolean) => {
    setStretchedMuscles((prev) => prev.map((m) => ({ ...m, visible })))
    setShowStretched(visible)
  }

  const showAll = () => {
    toggleAllContracted(true)
    toggleAllStretched(true)
  }

  const hideAll = () => {
    toggleAllContracted(false)
    toggleAllStretched(false)
  }

  // 현재 뷰에서 표시 가능한 근육 필터링
  const filteredContractedMuscles = contractedMuscles.filter((m) =>
    isMuscleVisibleInView(m.id, viewMode)
  )

  const filteredStretchedMuscles = stretchedMuscles.filter((m) =>
    isMuscleVisibleInView(m.id, viewMode)
  )

  // AnatomicalBody에 전달할 근육 상태 생성
  const muscleStates: MuscleState[] = [
    ...contractedMuscles
      .filter((m) => m.visible)
      .map((m) => ({ id: m.id, visible: true, type: 'contracted' as const })),
    ...stretchedMuscles
      .filter((m) => m.visible)
      .map((m) => ({ id: m.id, visible: true, type: 'stretched' as const })),
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 인체 해부도 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {language === 'ko' ? '근육 분포도' : 'Muscle Distribution'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'front' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('front')}
                >
                  Front
                </Button>
                <Button
                  variant={viewMode === 'rear' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('rear')}
                >
                  Rear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[3/4] bg-background rounded-lg overflow-hidden">
              {/* 해부학적 인체 SVG */}
              <AnatomicalBody
                view={viewMode}
                muscles={muscleStates}
                className="w-full h-full"
              />

              {/* 뷰 라벨 */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 text-white text-sm rounded">
                {viewMode === 'front'
                  ? language === 'ko'
                    ? '전면'
                    : 'Front'
                  : language === 'ko'
                  ? '후면'
                  : 'Rear'}
              </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-error rounded-full" />
                <span className="text-sm text-text-secondary">
                  {language === 'ko' ? '수축된 근육' : 'Contracted'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded-full" />
                <span className="text-sm text-text-secondary">
                  {language === 'ko' ? '늘어난 근육' : 'Stretched'}
                </span>
              </div>
            </div>

            {/* 전체 표시/숨기기 버튼 */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={showAll} className="gap-2">
                <Eye className="w-4 h-4" />
                {language === 'ko' ? '전체 표시' : 'Show All'}
              </Button>
              <Button variant="outline" size="sm" onClick={hideAll} className="gap-2">
                <EyeOff className="w-4 h-4" />
                {language === 'ko' ? '전체 숨기기' : 'Hide All'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 근육 목록 */}
        <div className="space-y-6">
          {/* 수축된 근육 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-error rounded-full" />
                  {language === 'ko'
                    ? '수축된 근육 (Contracted muscles)'
                    : 'Contracted Muscles'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllContracted(!showContracted)}
                  className="gap-2"
                >
                  {showContracted ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hidden
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Display
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {contractedMuscles.map((muscle, index) => (
                  <motion.div
                    key={muscle.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <MuscleToggle
                      muscle={muscle}
                      type="contracted"
                      language={language}
                      onToggle={(id) => toggleMuscle(id, 'contracted')}
                      isInCurrentView={isMuscleVisibleInView(muscle.id, viewMode)}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 늘어난 근육 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full" />
                  {language === 'ko'
                    ? '늘어난 근육 (Stretching muscles)'
                    : 'Stretched Muscles'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllStretched(!showStretched)}
                  className="gap-2"
                >
                  {showStretched ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hidden
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Display
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {stretchedMuscles.map((muscle, index) => (
                  <motion.div
                    key={muscle.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <MuscleToggle
                      muscle={muscle}
                      type="stretched"
                      language={language}
                      onToggle={(id) => toggleMuscle(id, 'stretched')}
                      isInCurrentView={isMuscleVisibleInView(muscle.id, viewMode)}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 근육 불균형 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ko' ? '근육 불균형 요약' : 'Muscle Imbalance Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-error/10 rounded-lg text-center">
              <div className="text-3xl font-bold text-error">
                {contractedMuscles.length}
              </div>
              <div className="text-sm text-text-secondary mt-1">
                {language === 'ko' ? '수축된 근육' : 'Contracted Muscles'}
              </div>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">
                {stretchedMuscles.length}
              </div>
              <div className="text-sm text-text-secondary mt-1">
                {language === 'ko' ? '늘어난 근육' : 'Stretched Muscles'}
              </div>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg text-center">
              <div className="text-3xl font-bold text-secondary">
                {contractedMuscles.length + stretchedMuscles.length}
              </div>
              <div className="text-sm text-text-secondary mt-1">
                {language === 'ko' ? '전체 영향 근육' : 'Total Affected'}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-background rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">
              {language === 'ko' ? '권장 사항' : 'Recommendations'}
            </h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 mt-1.5 bg-error rounded-full flex-shrink-0" />
                {language === 'ko'
                  ? '수축된 근육은 스트레칭 운동이 필요합니다.'
                  : 'Contracted muscles require stretching exercises.'}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 mt-1.5 bg-primary rounded-full flex-shrink-0" />
                {language === 'ko'
                  ? '늘어난 근육은 강화 운동이 필요합니다.'
                  : 'Stretched muscles require strengthening exercises.'}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 mt-1.5 bg-secondary rounded-full flex-shrink-0" />
                {language === 'ko'
                  ? '균형 잡힌 운동 프로그램을 통해 근육 불균형을 개선하세요.'
                  : 'Improve muscle imbalance through a balanced exercise program.'}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
