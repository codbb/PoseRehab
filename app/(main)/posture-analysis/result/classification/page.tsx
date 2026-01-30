'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import type { PoseLandmark, EPosePostureType } from '@/types/analysis-result'
import { LEG_TYPE_LABELS, EPOSE_TYPE_LABELS } from '@/types/analysis-result'
import { SpineLineRenderer } from '@/components/posture/skeleton-renderer'

// ePose 자세 유형 차트 그리드 (12가지 = 4행 x 3열)
const eposePostureGrid: {
  type: EPosePostureType
  row: number
  col: number
}[] = [
  // Row 0: 기본 유형
  { type: 'normal', row: 0, col: 0 },
  { type: 'flat_back', row: 0, col: 1 },
  { type: 'flat_lumbar', row: 0, col: 2 },
  // Row 1: 단독 만곡 이상
  { type: 'kyphosis', row: 1, col: 0 },
  { type: 'lordosis', row: 1, col: 1 },
  { type: 'kyphosis_lordosis', row: 1, col: 2 },
  // Row 2: 스웨이백 기본
  { type: 'swayback', row: 2, col: 0 },
  { type: 'swayback_flat_lumbar', row: 2, col: 1 },
  { type: 'swayback_flat_back', row: 2, col: 2 },
  // Row 3: 스웨이백 + 만곡
  { type: 'swayback_kyphosis', row: 3, col: 0 },
  { type: 'swayback_lordosis', row: 3, col: 1 },
  { type: 'swayback_kyphosis_lordosis', row: 3, col: 2 },
]

const rowLabels = [
  { key: 'basic', en: 'Basic', ko: '기본' },
  { key: 'curvature', en: 'Curvature', ko: '만곡 이상' },
  { key: 'swayback', en: 'Swayback', ko: '스웨이백' },
  { key: 'swayback_plus', en: 'Swayback+', ko: '스웨이백+만곡' },
]

const colLabels = [
  { key: 'col0', en: 'Type A', ko: '유형 A' },
  { key: 'col1', en: 'Type B', ko: '유형 B' },
  { key: 'col2', en: 'Type C', ko: '유형 C' },
]

export default function ClassificationPage() {
  const router = useRouter()
  const { language } = useTranslation()
  const { detailedResult } = usePostureStore()

  // 이미지 컨테이너 ref
  const sideContainerRef = useRef<HTMLDivElement>(null)

  // 이미지 원본 크기
  const [sideImageSize, setSideImageSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!detailedResult) {
      router.replace('/posture-analysis')
    }
  }, [detailedResult, router])

  if (!detailedResult) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const result = detailedResult
  const { classification } = result
  const epose = classification.epose

  return (
    <div className="space-y-6">
      {/* AI 자세 유형 태그 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ko' ? 'AI 자세 유형 판별' : 'AI Posture Type Detection'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {classification.tags.map((tag, index) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="px-4 py-2 bg-secondary/10 text-secondary rounded-full text-sm font-medium"
              >
                {tag}
              </motion.span>
            ))}
          </div>

          {/* ePose 자세 유형 표시 */}
          {epose && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">
                    {language === 'ko' ? 'ePose 분류 결과' : 'ePose Classification'}
                  </p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {language === 'ko'
                      ? EPOSE_TYPE_LABELS[epose.postureType].ko
                      : EPOSE_TYPE_LABELS[epose.postureType].en}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {language === 'ko'
                      ? EPOSE_TYPE_LABELS[epose.postureType].descriptionKo
                      : EPOSE_TYPE_LABELS[epose.postureType].description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">
                    {language === 'ko' ? '신뢰도' : 'Confidence'}
                  </p>
                  <p className="text-2xl font-bold text-primary">{epose.confidence}%</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3요소 분류 기준 */}
      {epose && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ko' ? '3요소 분류 기준' : '3-Factor Classification'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 골반 전방 변위 */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <span className="text-sm font-medium text-text-primary">
                    {language === 'ko' ? '골반 전방 변위' : 'Pelvic Displacement'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-text-primary">
                  {epose.classificationFactors.anteriorPelvicDisplacement.toFixed(1)}
                  <span className="text-lg font-normal text-text-secondary ml-1">cm</span>
                </div>
                <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(epose.classificationFactors.anteriorPelvicDisplacement) * 10)}%` }}
                    className={cn(
                      'h-full rounded-full',
                      Math.abs(epose.classificationFactors.anteriorPelvicDisplacement) > 3 ? 'bg-error' : 'bg-secondary'
                    )}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  {language === 'ko'
                    ? '발목 수직선 기준 골반 위치'
                    : 'Pelvis position from ankle vertical'}
                </p>
              </div>

              {/* 척추 만곡도 */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm font-medium text-text-primary">
                    {language === 'ko' ? '척추 만곡도' : 'Spinal Curvature'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-text-primary">
                  {epose.classificationFactors.spinalCurvature.toFixed(1)}
                  <span className="text-lg font-normal text-text-secondary ml-1">°</span>
                </div>
                <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(epose.classificationFactors.spinalCurvature) * 5)}%` }}
                    className={cn(
                      'h-full rounded-full',
                      Math.abs(epose.classificationFactors.spinalCurvature) > 8 ? 'bg-warning' : 'bg-secondary'
                    )}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  {language === 'ko'
                    ? '상체 전후 기울기 (양수: 후만)'
                    : 'Upper body tilt (+: kyphosis)'}
                </p>
              </div>

              {/* 골반 전후 기울기 */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-text-primary">
                    {language === 'ko' ? '골반 전후 기울기' : 'Pelvic Tilt'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-text-primary">
                  {epose.classificationFactors.anteriorPosteriorPelvicTilt.toFixed(1)}
                  <span className="text-lg font-normal text-text-secondary ml-1">°</span>
                </div>
                <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(epose.classificationFactors.anteriorPosteriorPelvicTilt) * 5)}%` }}
                    className={cn(
                      'h-full rounded-full',
                      epose.classificationFactors.anteriorPosteriorPelvicTilt > 15 ? 'bg-primary' : 'bg-secondary'
                    )}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  {language === 'ko'
                    ? 'ASIS-PSIS 기울기 (양수: 전방경사)'
                    : 'ASIS-PSIS tilt (+: anterior)'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 척추 라인 + 자세 유형 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 측면 사진 with 척추 라인 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ko' ? '측면 척추 라인' : 'Side Spine Line'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={sideContainerRef}
              className="relative aspect-[3/4] bg-background rounded-lg overflow-hidden"
            >
              {result.sideImage && (
                <img
                  src={result.sideImage}
                  alt="Side view"
                  className="absolute inset-0 w-full h-full object-contain"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement
                    setSideImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                  }}
                />
              )}

              {result.images?.side?.landmarks && result.images.side.landmarks.length >= 33 ? (
                <SpineLineRenderer
                  landmarks={result.images.side.landmarks}
                  imageNaturalWidth={sideImageSize.width || 300}
                  imageNaturalHeight={sideImageSize.height || 400}
                  containerRef={sideContainerRef}
                  showIdealLine={true}
                  problemAreas={result.problemAreas}
                  className="absolute inset-0 w-full h-full"
                />
              ) : result.sideLandmarks && result.sideLandmarks.length >= 33 ? (
                <SpineLineRenderer
                  landmarks={result.sideLandmarks as PoseLandmark[]}
                  imageNaturalWidth={sideImageSize.width || 300}
                  imageNaturalHeight={sideImageSize.height || 400}
                  containerRef={sideContainerRef}
                  showIdealLine={true}
                  problemAreas={result.problemAreas}
                  className="absolute inset-0 w-full h-full"
                />
              ) : null}

              {!result.sideImage && !result.sideLandmarks?.length && !result.images?.side && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-1">
                    {language === 'ko' ? '측면 사진이 없습니다' : 'No side photo available'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {language === 'ko'
                      ? '더 정확한 척추 라인 분석을 위해 측면 사진을 추가해주세요'
                      : 'Add a side photo for more accurate spine analysis'}
                  </p>
                </div>
              )}

              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-black/50 text-white text-xs rounded">
                  {language === 'ko' ? '측면' : 'Side'}
                </span>
                {result.sideImage && (
                  <span className="px-2 py-1 bg-secondary/80 text-white text-xs rounded">
                    {language === 'ko' ? '분석됨' : 'Analyzed'}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ePose 자세 유형 차트 (4x3 그리드 = 12가지) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ko' ? 'ePose 자세 유형 차트 (12가지)' : 'ePose Posture Type Chart (12 Types)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* 열 라벨 */}
              <div className="grid grid-cols-4 gap-2 text-xs text-text-secondary">
                <div />
                {colLabels.map((label) => (
                  <div key={label.key} className="text-center font-medium">
                    {language === 'ko' ? label.ko : label.en}
                  </div>
                ))}
              </div>

              {/* 그리드 */}
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="grid grid-cols-4 gap-2">
                  {/* 행 라벨 */}
                  <div className="flex items-center justify-end pr-2 text-xs text-text-secondary font-medium">
                    {language === 'ko' ? rowLabels[row].ko : rowLabels[row].en}
                  </div>
                  {/* 셀들 */}
                  {[0, 1, 2].map((col) => {
                    const cell = eposePostureGrid.find(
                      (g) => g.row === row && g.col === col
                    )
                    const isSelected = epose && cell?.type === epose.postureType

                    return (
                      <motion.div
                        key={`${row}-${col}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (row * 3 + col) * 0.03 }}
                        className={cn(
                          'aspect-[4/3] rounded-lg flex items-center justify-center p-1 text-center transition-all cursor-default',
                          isSelected
                            ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-surface'
                            : 'bg-background text-text-secondary hover:bg-background/80',
                          'text-[10px] leading-tight'
                        )}
                      >
                        {cell && (
                          <span className={cn(isSelected && 'font-semibold')}>
                            {language === 'ko'
                              ? EPOSE_TYPE_LABELS[cell.type].ko
                              : EPOSE_TYPE_LABELS[cell.type].en}
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              ))}

              {/* 신뢰도 표시 */}
              {epose && (
                <div className="mt-4 p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {language === 'ko' ? '판별 신뢰도' : 'Detection Confidence'}
                    </span>
                    <span className="font-semibold text-primary">
                      {epose.confidence}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${epose.confidence}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* X다리/O다리 판별 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ko' ? '다리 형태 분석' : 'Leg Shape Analysis'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 다리 다이어그램 */}
            <div className="relative aspect-[3/4] bg-background rounded-lg overflow-hidden">
              <svg
                viewBox="0 0 100 150"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <ellipse
                  cx="50"
                  cy="20"
                  rx="25"
                  ry="8"
                  fill="rgba(100, 100, 100, 0.3)"
                  stroke="rgba(150, 150, 150, 0.5)"
                  strokeWidth="0.5"
                />
                <path
                  d={
                    classification.legAnalysis.type === 'x_legs'
                      ? 'M35 25 Q30 70 45 130'
                      : classification.legAnalysis.type === 'o_legs'
                      ? 'M35 25 Q25 70 35 130'
                      : 'M35 25 L35 130'
                  }
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d={
                    classification.legAnalysis.type === 'x_legs'
                      ? 'M65 25 Q70 70 55 130'
                      : classification.legAnalysis.type === 'o_legs'
                      ? 'M65 25 Q75 70 65 130'
                      : 'M65 25 L65 130'
                  }
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <line
                  x1="50"
                  y1="25"
                  x2="50"
                  y2="130"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text x="50" y="80" textAnchor="middle" fontSize="8" fill="#fff">
                  {classification.legAnalysis.overallAngle.toFixed(1)}°
                </text>
              </svg>

              <div
                className={cn(
                  'absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-medium',
                  classification.legAnalysis.type === 'normal'
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-warning/20 text-warning'
                )}
              >
                {language === 'ko'
                  ? LEG_TYPE_LABELS[classification.legAnalysis.type].ko
                  : LEG_TYPE_LABELS[classification.legAnalysis.type].en}
              </div>
            </div>

            {/* 각도 정보 */}
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg">
                <div className="text-sm text-text-secondary mb-1">
                  {language === 'ko' ? '전체 각도' : 'Overall Angle'}
                </div>
                <div className="text-3xl font-bold text-text-primary">
                  {classification.legAnalysis.overallAngle.toFixed(1)}°
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {language === 'ko'
                    ? '이상적 범위: 175° - 180°'
                    : 'Ideal range: 175° - 180°'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-text-secondary mb-1">
                    {language === 'ko' ? '왼쪽 다리' : 'Left Leg'}
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {classification.legAnalysis.leftAngle.toFixed(1)}°
                  </div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-text-secondary mb-1">
                    {language === 'ko' ? '오른쪽 다리' : 'Right Leg'}
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {classification.legAnalysis.rightAngle.toFixed(1)}°
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 무게중심 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ko' ? '무게중심 분석' : 'Weight Center Analysis'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* 발바닥 다이어그램 */}
            <div className="relative aspect-[4/3] bg-background rounded-lg overflow-hidden">
              <svg
                viewBox="0 0 200 150"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <ellipse
                  cx="60"
                  cy="75"
                  rx="35"
                  ry="55"
                  fill="rgba(100, 100, 100, 0.2)"
                  stroke="rgba(150, 150, 150, 0.5)"
                  strokeWidth="1"
                />
                <circle
                  cx={30 + classification.weightCenter.left.x * 60}
                  cy={30 + classification.weightCenter.left.y * 90}
                  r="8"
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x="60"
                  y="140"
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  className="fill-text-secondary"
                >
                  {language === 'ko' ? '왼발' : 'Left'}
                </text>

                <ellipse
                  cx="140"
                  cy="75"
                  rx="35"
                  ry="55"
                  fill="rgba(100, 100, 100, 0.2)"
                  stroke="rgba(150, 150, 150, 0.5)"
                  strokeWidth="1"
                />
                <circle
                  cx={110 + classification.weightCenter.right.x * 60}
                  cy={30 + classification.weightCenter.right.y * 90}
                  r="8"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x="140"
                  y="140"
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  className="fill-text-secondary"
                >
                  {language === 'ko' ? '오른발' : 'Right'}
                </text>
              </svg>
            </div>

            {/* 무게중심 수치 */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 p-4 bg-background rounded-lg text-center">
                  <div className="w-4 h-4 bg-error rounded-full mx-auto mb-2" />
                  <div className="text-2xl font-bold text-text-primary">
                    {classification.weightCenter.leftPercent}%
                  </div>
                  <div className="text-sm text-text-secondary">
                    {language === 'ko' ? '왼쪽' : 'Left'}
                  </div>
                </div>
                <div className="flex-1 p-4 bg-background rounded-lg text-center">
                  <div className="w-4 h-4 bg-primary rounded-full mx-auto mb-2" />
                  <div className="text-2xl font-bold text-text-primary">
                    {classification.weightCenter.rightPercent}%
                  </div>
                  <div className="text-sm text-text-secondary">
                    {language === 'ko' ? '오른쪽' : 'Right'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>{language === 'ko' ? '왼쪽' : 'Left'}</span>
                  <span>{language === 'ko' ? '균형' : 'Balanced'}</span>
                  <span>{language === 'ko' ? '오른쪽' : 'Right'}</span>
                </div>
                <div className="relative h-4 bg-border rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-secondary z-10" />
                  <motion.div
                    initial={{ left: '50%' }}
                    animate={{
                      left: `${100 - classification.weightCenter.leftPercent}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-warning rounded-full border-2 border-white shadow-md"
                  />
                </div>
                <div className="text-center text-sm">
                  <span
                    className={cn(
                      'font-medium',
                      classification.weightCenter.balance === 'balanced'
                        ? 'text-secondary'
                        : 'text-warning'
                    )}
                  >
                    {classification.weightCenter.balance === 'balanced'
                      ? language === 'ko'
                        ? '균형 잡힘'
                        : 'Balanced'
                      : classification.weightCenter.balance === 'left'
                      ? language === 'ko'
                        ? '왼쪽으로 쏠림'
                        : 'Leaning Left'
                      : language === 'ko'
                      ? '오른쪽으로 쏠림'
                      : 'Leaning Right'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
