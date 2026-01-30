'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import type { MeasurementValue, PoseLandmark, LeftRightTiltMeasurements, FrontBackTiltMeasurements } from '@/types/analysis-result'
import { EPOSE_MEASUREMENT_LABELS } from '@/types/analysis-result'
import { SkeletonRenderer, SpineLineRenderer } from '@/components/posture/skeleton-renderer'

// ePose 측정값을 MeasurementValue 형식으로 변환하는 헬퍼 함수
function convertToMeasurementValue(
  value: number,
  config: { idealMin: number; idealMax: number; unit: string; maxDeviation: number }
): MeasurementValue {
  const { idealMin, idealMax, unit, maxDeviation } = config
  const deviation = Math.abs(value - (idealMin + idealMax) / 2)
  const normalThreshold = Math.abs(idealMax - idealMin) / 2
  const warningThreshold = maxDeviation * 0.6

  let status: 'normal' | 'warning' | 'danger' = 'normal'
  if (deviation > warningThreshold) {
    status = 'danger'
  } else if (deviation > normalThreshold) {
    status = 'warning'
  }

  return { value, idealMin, idealMax, unit, status }
}

// ePose 좌우 기울기 측정값을 테이블 데이터로 변환
function getLeftRightMeasurements(
  data: LeftRightTiltMeasurements | undefined,
  language: 'ko' | 'en'
): { key: string; label: string; measurement: MeasurementValue }[] {
  if (!data) return []

  const labels = EPOSE_MEASUREMENT_LABELS.leftRight
  return [
    { key: 'wholeBodyTilt', label: language === 'ko' ? labels.wholeBodyTilt.ko : labels.wholeBodyTilt.en, measurement: convertToMeasurementValue(data.wholeBodyTilt, labels.wholeBodyTilt) },
    { key: 'upperBodyTilt', label: language === 'ko' ? labels.upperBodyTilt.ko : labels.upperBodyTilt.en, measurement: convertToMeasurementValue(data.upperBodyTilt, labels.upperBodyTilt) },
    { key: 'lowerBodyTilt', label: language === 'ko' ? labels.lowerBodyTilt.ko : labels.lowerBodyTilt.en, measurement: convertToMeasurementValue(data.lowerBodyTilt, labels.lowerBodyTilt) },
    { key: 'headTilt', label: language === 'ko' ? labels.headTilt.ko : labels.headTilt.en, measurement: convertToMeasurementValue(data.headTilt, labels.headTilt) },
    { key: 'neckDeviation', label: language === 'ko' ? labels.neckDeviation.ko : labels.neckDeviation.en, measurement: convertToMeasurementValue(data.neckDeviation, labels.neckDeviation) },
    { key: 'shoulderTilt', label: language === 'ko' ? labels.shoulderTilt.ko : labels.shoulderTilt.en, measurement: convertToMeasurementValue(data.shoulderTilt, labels.shoulderTilt) },
    { key: 'chestDeviation', label: language === 'ko' ? labels.chestDeviation.ko : labels.chestDeviation.en, measurement: convertToMeasurementValue(data.chestDeviation, labels.chestDeviation) },
    { key: 'hipTilt', label: language === 'ko' ? labels.hipTilt.ko : labels.hipTilt.en, measurement: convertToMeasurementValue(data.hipTilt, labels.hipTilt) },
    { key: 'hipDeviation', label: language === 'ko' ? labels.hipDeviation.ko : labels.hipDeviation.en, measurement: convertToMeasurementValue(data.hipDeviation, labels.hipDeviation) },
  ]
}

// ePose 전후 기울기 측정값을 테이블 데이터로 변환
function getFrontBackMeasurements(
  data: FrontBackTiltMeasurements | undefined,
  language: 'ko' | 'en'
): { key: string; label: string; measurement: MeasurementValue }[] {
  if (!data) return []

  const labels = EPOSE_MEASUREMENT_LABELS.frontBack
  return [
    { key: 'wholeBodyTilt', label: language === 'ko' ? labels.wholeBodyTilt.ko : labels.wholeBodyTilt.en, measurement: convertToMeasurementValue(data.wholeBodyTilt, labels.wholeBodyTilt) },
    { key: 'upperBodyTilt', label: language === 'ko' ? labels.upperBodyTilt.ko : labels.upperBodyTilt.en, measurement: convertToMeasurementValue(data.upperBodyTilt, labels.upperBodyTilt) },
    { key: 'lowerBodyTilt', label: language === 'ko' ? labels.lowerBodyTilt.ko : labels.lowerBodyTilt.en, measurement: convertToMeasurementValue(data.lowerBodyTilt, labels.lowerBodyTilt) },
    { key: 'headTilt', label: language === 'ko' ? labels.headTilt.ko : labels.headTilt.en, measurement: convertToMeasurementValue(data.headTilt, labels.headTilt) },
    { key: 'neckDeviation', label: language === 'ko' ? labels.neckDeviation.ko : labels.neckDeviation.en, measurement: convertToMeasurementValue(data.neckDeviation, labels.neckDeviation) },
    { key: 'pelvicTilt', label: language === 'ko' ? labels.pelvicTilt.ko : labels.pelvicTilt.en, measurement: convertToMeasurementValue(data.pelvicTilt, labels.pelvicTilt) },
    { key: 'hipDeviation', label: language === 'ko' ? labels.hipDeviation.ko : labels.hipDeviation.en, measurement: convertToMeasurementValue(data.hipDeviation, labels.hipDeviation) },
    { key: 'kneeFlexionAngle', label: language === 'ko' ? labels.kneeFlexionAngle.ko : labels.kneeFlexionAngle.en, measurement: convertToMeasurementValue(data.kneeFlexionAngle, labels.kneeFlexionAngle) },
  ]
}

interface MeasurementRowProps {
  label: string
  measurement: MeasurementValue
  showBefore?: boolean
  beforeValue?: number
  language: 'ko' | 'en'
  delay?: number
}

function MeasurementRow({
  label,
  measurement,
  showBefore = false,
  beforeValue,
  language,
  delay = 0,
}: MeasurementRowProps) {
  const { value, idealMin, idealMax, unit, status } = measurement
  const range = Math.abs(idealMax - idealMin) * 3 // 표시 범위를 이상적 범위의 3배로
  const center = (idealMin + idealMax) / 2
  const minDisplay = center - range / 2
  const maxDisplay = center + range / 2

  // 값을 0-100% 위치로 변환
  const valuePercent = ((value - minDisplay) / (maxDisplay - minDisplay)) * 100
  const idealMinPercent = ((idealMin - minDisplay) / (maxDisplay - minDisplay)) * 100
  const idealMaxPercent = ((idealMax - minDisplay) / (maxDisplay - minDisplay)) * 100
  const beforePercent = beforeValue
    ? ((beforeValue - minDisplay) / (maxDisplay - minDisplay)) * 100
    : 0

  const statusColors = {
    normal: 'bg-secondary',
    warning: 'bg-warning',
    danger: 'bg-error',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="grid grid-cols-12 gap-2 items-center py-3 border-b border-border last:border-0"
    >
      {/* 라벨 */}
      <div className="col-span-4 text-sm text-text-primary font-medium">
        {label}
      </div>

      {/* rear 값 */}
      {showBefore && (
        <div className="col-span-1 text-sm text-text-secondary text-center">
          {beforeValue?.toFixed(1)}
        </div>
      )}

      {/* 이상적 값 */}
      <div className="col-span-2 text-sm text-secondary text-center">
        {idealMin === idealMax
          ? `${idealMin}${unit}`
          : `${idealMin}~${idealMax}${unit}`}
      </div>

      {/* 슬라이더 */}
      <div className={cn('relative h-8', showBefore ? 'col-span-4' : 'col-span-5')}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-border rounded-full">
          {/* 이상적 범위 */}
          <div
            className="absolute top-0 bottom-0 bg-secondary/30 rounded-full"
            style={{
              left: `${Math.max(0, idealMinPercent)}%`,
              width: `${Math.min(100, idealMaxPercent) - Math.max(0, idealMinPercent)}%`,
            }}
          />
        </div>

        {/* 이상적 범위 중심점 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-secondary rounded-sm"
          style={{ left: `${(idealMinPercent + idealMaxPercent) / 2}%`, transform: 'translate(-50%, -50%)' }}
        />

        {/* before 값 (있는 경우) */}
        {showBefore && beforeValue !== undefined && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-secondary rounded-full border-2 border-surface"
            style={{
              left: `${Math.max(0, Math.min(100, beforePercent))}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        {/* 현재 값 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3 }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-surface shadow-md',
            statusColors[status]
          )}
          style={{
            left: `${Math.max(0, Math.min(100, valuePercent))}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* 현재 값 */}
      <div
        className={cn(
          'col-span-1 text-sm font-semibold text-center',
          status === 'normal'
            ? 'text-secondary'
            : status === 'warning'
            ? 'text-warning'
            : 'text-error'
        )}
      >
        {value.toFixed(1)}{unit}
      </div>
    </motion.div>
  )
}

export default function VisualizationPage() {
  const router = useRouter()
  const { language } = useTranslation()
  const { detailedResult } = usePostureStore()

  // 이미지 컨테이너 refs
  const frontContainerRef = useRef<HTMLDivElement>(null)
  const sideContainerRef = useRef<HTMLDivElement>(null)

  // 이미지 원본 크기
  const [frontImageSize, setFrontImageSize] = useState({ width: 0, height: 0 })
  const [sideImageSize, setSideImageSize] = useState({ width: 0, height: 0 })

  // 결과가 없으면 분석 페이지로 리다이렉트
  useEffect(() => {
    if (!detailedResult) {
      router.replace('/posture-analysis')
    }
  }, [detailedResult, router])

  // 결과가 없으면 로딩 표시
  if (!detailedResult) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const result = detailedResult
  const { visualization } = result
  const epose = result.classification.epose

  // ePose 데이터가 있으면 ePose 측정값 사용, 없으면 기존 데이터 폴백
  const frontBackMeasurements = getFrontBackMeasurements(epose?.frontBackTilt, language)
  const leftRightMeasurements = getLeftRightMeasurements(epose?.leftRightTilt, language)

  return (
    <div className="space-y-6">
      {/* 측면 분석 (Sagittal Plane) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-secondary">Standing Sagittal Plane</span>
            <span className="text-text-secondary">
              ({language === 'ko' ? '측면 분석' : 'Side Analysis'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 측면 이미지 */}
            <div className="lg:col-span-1">
              <div
                ref={sideContainerRef}
                className="relative aspect-[3/4] bg-background rounded-lg overflow-hidden"
              >
                {/* 배경 이미지 */}
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

                {/* 측면 스켈레톤 렌더링 */}
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
                ) : result.sideLandmarks && result.sideLandmarks.length > 0 ? (
                  <svg
                    viewBox="0 0 100 133.33"
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* 이상적 수직선 */}
                    <line
                      x1={result.sideLandmarks[result.sideLandmarks.length - 1].x * 100}
                      y1={result.sideLandmarks[0].y * 133.33 - 5}
                      x2={result.sideLandmarks[result.sideLandmarks.length - 1].x * 100}
                      y2={result.sideLandmarks[result.sideLandmarks.length - 1].y * 133.33 + 5}
                      stroke="rgba(59, 130, 246, 0.5)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                    {/* 척추 라인 */}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                      d={result.sideLandmarks
                        .map((point, i) =>
                          i === 0
                            ? `M${point.x * 100} ${point.y * 133.33}`
                            : `L${point.x * 100} ${point.y * 133.33}`
                        )
                        .join(' ')}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* 포인트 */}
                    {result.sideLandmarks.map((point, index) => (
                      <motion.circle
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        cx={point.x * 100}
                        cy={point.y * 133.33}
                        r="4"
                        fill="#10B981"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                ) : null}

                {/* 측면 사진이 없는 경우 안내 메시지 */}
                {!result.sideImage && !result.sideLandmarks?.length && !result.images?.side && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-text-primary">
                      {language === 'ko' ? '측면 사진 없음' : 'No side photo'}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {language === 'ko'
                        ? '측면 분석을 위해 측면 사진이 필요합니다'
                        : 'Side photo required for analysis'}
                    </p>
                  </div>
                )}

                {/* 라벨 */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2 py-1 bg-secondary/80 text-white text-xs rounded">
                    {language === 'ko' ? '측면' : 'Side'}
                  </span>
                  {result.sideImage && (
                    <span className="px-2 py-1 bg-primary/80 text-white text-xs rounded">
                      {language === 'ko' ? '분석 완료' : 'Analyzed'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 측정 테이블 */}
            <div className="lg:col-span-2">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b-2 border-border text-xs text-text-secondary font-medium">
                <div className="col-span-4">
                  {language === 'ko' ? '항목' : 'Item'}
                </div>
                <div className="col-span-1 text-center">rear</div>
                <div className="col-span-2 text-center text-secondary">
                  {language === 'ko' ? '이상적 값' : 'Ideal'}
                </div>
                <div className="col-span-4 text-center">
                  {language === 'ko' ? '위치' : 'Position'}
                </div>
                <div className="col-span-1 text-center">before</div>
              </div>

              {/* 측정 행들 - ePose 전후 기울기 8개 */}
              {frontBackMeasurements.length > 0 ? (
                frontBackMeasurements.map((item, index) => (
                  <MeasurementRow
                    key={item.key}
                    label={item.label}
                    measurement={item.measurement}
                    showBefore
                    beforeValue={item.measurement.value * 0.8} // 이전 값 예시
                    language={language}
                    delay={index * 0.05}
                  />
                ))
              ) : (
                // ePose 데이터가 없으면 기존 데이터 사용 (폴백)
                Object.entries(visualization.sagittalPlane).map(
                  ([key, measurement], index) => {
                    const labels = EPOSE_MEASUREMENT_LABELS.frontBack
                    const label = labels[key as keyof typeof labels]
                    return (
                      <MeasurementRow
                        key={key}
                        label={language === 'ko' ? (label?.ko ?? key) : (label?.en ?? key)}
                        measurement={measurement}
                        showBefore
                        beforeValue={measurement.value * 0.8}
                        language={language}
                        delay={index * 0.05}
                      />
                    )
                  }
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 정면 분석 (Frontal Plane) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-secondary">Standing Frontal Plane</span>
            <span className="text-text-secondary">
              ({language === 'ko' ? '정면 분석' : 'Front Analysis'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 정면 이미지 */}
            <div className="lg:col-span-1">
              <div
                ref={frontContainerRef}
                className="relative aspect-[3/4] bg-background rounded-lg overflow-hidden"
              >
                {/* 배경 이미지 */}
                {result.frontImage && (
                  <img
                    src={result.frontImage}
                    alt="Front view"
                    className="absolute inset-0 w-full h-full object-contain"
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement
                      setFrontImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                    }}
                  />
                )}

                {/* 정면 스켈레톤 렌더링 */}
                {result.images?.front?.landmarks && result.images.front.landmarks.length >= 33 ? (
                  <SkeletonRenderer
                    landmarks={result.images.front.landmarks}
                    orientation="front"
                    imageNaturalWidth={frontImageSize.width || 300}
                    imageNaturalHeight={frontImageSize.height || 400}
                    containerRef={frontContainerRef}
                    problemAreas={result.problemAreas}
                    className="absolute inset-0 w-full h-full"
                  />
                ) : result.frontLandmarks && result.frontLandmarks.length >= 33 ? (
                  <SkeletonRenderer
                    landmarks={result.frontLandmarks as PoseLandmark[]}
                    orientation="front"
                    imageNaturalWidth={frontImageSize.width || 300}
                    imageNaturalHeight={frontImageSize.height || 400}
                    containerRef={frontContainerRef}
                    problemAreas={result.problemAreas}
                    className="absolute inset-0 w-full h-full"
                  />
                ) : result.frontLandmarks && result.frontLandmarks.length > 0 ? (
                  <svg
                    viewBox="0 0 100 133.33"
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* 중심선 */}
                    <line
                      x1="50"
                      y1="5"
                      x2="50"
                      y2="145"
                      stroke="rgba(59, 130, 246, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    {/* 포인트 */}
                    {result.frontLandmarks.map((point, index) => (
                      <motion.circle
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        cx={point.x * 100}
                        cy={point.y * 133.33}
                        r="4"
                        fill="#10B981"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                ) : null}

                {/* 정면 사진이 없는 경우 안내 메시지 */}
                {!result.frontImage && !result.frontLandmarks?.length && !result.images?.front && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-text-primary">
                      {language === 'ko' ? '정면 사진 없음' : 'No front photo'}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {language === 'ko'
                        ? '정면 분석을 위해 정면 사진이 필요합니다'
                        : 'Front photo required for analysis'}
                    </p>
                  </div>
                )}

                {/* 좌우 라벨 - 이미지 기준 (피검자 기준 거울처럼 표시) */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2 py-1 bg-primary/80 text-white text-xs rounded">
                    {language === 'ko' ? '오른쪽(R)' : 'Right(R)'}
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className="px-2 py-1 bg-error/80 text-white text-xs rounded">
                    {language === 'ko' ? '왼쪽(L)' : 'Left(L)'}
                  </span>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <span className="px-2 py-1 bg-secondary/80 text-white text-xs rounded">
                    {language === 'ko' ? '정면' : 'Front'}
                  </span>
                  {result.frontImage && (
                    <span className="px-2 py-1 bg-primary/80 text-white text-xs rounded">
                      {language === 'ko' ? '분석 완료' : 'Analyzed'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 측정 테이블 */}
            <div className="lg:col-span-2">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b-2 border-border text-xs text-text-secondary font-medium">
                <div className="col-span-4">
                  {language === 'ko' ? '항목' : 'Item'}
                </div>
                <div className="col-span-2 text-center text-secondary">
                  {language === 'ko' ? '이상적 값' : 'Ideal'}
                </div>
                <div className="col-span-5 text-center">
                  {language === 'ko' ? '위치' : 'Position'}
                </div>
                <div className="col-span-1 text-center">
                  {language === 'ko' ? '값' : 'Value'}
                </div>
              </div>

              {/* 측정 행들 - ePose 좌우 기울기 9개 */}
              {leftRightMeasurements.length > 0 ? (
                leftRightMeasurements.map((item, index) => (
                  <MeasurementRow
                    key={item.key}
                    label={item.label}
                    measurement={item.measurement}
                    showBefore={false}
                    language={language}
                    delay={index * 0.05}
                  />
                ))
              ) : (
                // ePose 데이터가 없으면 기존 데이터 사용 (폴백)
                Object.entries(visualization.frontalPlane).map(
                  ([key, measurement], index) => {
                    const labels = EPOSE_MEASUREMENT_LABELS.leftRight
                    const label = labels[key as keyof typeof labels]
                    return (
                      <MeasurementRow
                        key={key}
                        label={language === 'ko' ? (label?.ko ?? key) : (label?.en ?? key)}
                        measurement={measurement}
                        showBefore={false}
                        language={language}
                        delay={index * 0.05}
                      />
                    )
                  }
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 범례 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 상태 범례 */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-secondary rounded-full" />
              <span className="text-sm text-text-secondary">
                {language === 'ko' ? '정상 범위' : 'Normal Range'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-warning rounded-full" />
              <span className="text-sm text-text-secondary">
                {language === 'ko' ? '주의' : 'Warning'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-error rounded-full" />
              <span className="text-sm text-text-secondary">
                {language === 'ko' ? '위험' : 'Danger'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-secondary/30 rounded" />
              <span className="text-sm text-text-secondary">
                {language === 'ko' ? '이상적 범위' : 'Ideal Range'}
              </span>
            </div>
          </div>

          {/* 좌우 표기 설명 */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-text-secondary text-center">
              {language === 'ko'
                ? '※ 좌우 표기는 이미지 기준입니다. (피검자가 카메라를 바라볼 때, 이미지의 왼쪽 = 피검자의 오른쪽)'
                : '※ Left/Right labels are based on the image. (When subject faces camera, image left = subject\'s right)'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
