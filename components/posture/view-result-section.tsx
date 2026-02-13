'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ViewOverlayCanvas } from '@/components/posture/view-overlay-canvas'
import { MeasurementCard, type RiskStatus } from '@/components/posture/measurement-card'
import { useTranslation } from '@/hooks/use-translation'
import type { ViewAngle, PoseLandmark, FrontViewMetrics, SideViewMetrics, BackViewMetrics } from '@/types/analysis-result'
import type { BodyPartRisk } from '@/lib/analysis/pose-3d-analyzer'
import { RISK_FACTORS, getRiskFactorKey } from '@/lib/analysis/risk-factors'
import { cn } from '@/lib/utils'
import { User, Camera } from 'lucide-react'

interface ViewResultSectionProps {
  viewAngle: ViewAngle
  imageData: {
    imageDataUrl: string | null
    landmarks2D: PoseLandmark[] | null
    imageWidth: number | null
    imageHeight: number | null
  }
  metrics: FrontViewMetrics | SideViewMetrics | BackViewMetrics | null
  risks: BodyPartRisk[]
  score: number | null
}

function riskToStatus(level: string): RiskStatus {
  switch (level) {
    case 'danger':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'normal'
  }
}

const viewConfig: Record<ViewAngle, { labelKo: string; labelEn: string; icon: React.ReactNode }> = {
  front: {
    labelKo: '정면 분석',
    labelEn: 'Front View Analysis',
    icon: <User className="h-5 w-5" />,
  },
  side: {
    labelKo: '측면 분석',
    labelEn: 'Side View Analysis',
    icon: <User className="h-5 w-5 rotate-90" />,
  },
  back: {
    labelKo: '후면 분석',
    labelEn: 'Back View Analysis',
    icon: <User className="h-5 w-5" />,
  },
}

export function ViewResultSection({
  viewAngle,
  imageData,
  metrics,
  risks,
  score,
}: ViewResultSectionProps) {
  const { language } = useTranslation()
  const config = viewConfig[viewAngle]
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerDimensions, setContainerDimensions] = useState({ width: 300, height: 400 })

  // Track container size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setContainerDimensions({ width, height })
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Score color
  const scoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400'
    if (s >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {config.icon}
            {language === 'ko' ? config.labelKo : config.labelEn}
          </CardTitle>
          {score !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                {language === 'ko' ? '점수' : 'Score'}
              </span>
              <span className={cn('text-lg font-bold', scoreColor(score))}>
                {score}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Image with overlay */}
          <div
            ref={containerRef}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-background"
          >
            {imageData.imageDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageData.imageDataUrl}
                  alt={`${viewAngle} view`}
                  className="h-full w-full object-contain"
                />
                {imageData.landmarks2D && metrics && (
                  <ViewOverlayCanvas
                    landmarks2D={imageData.landmarks2D}
                    viewAngle={viewAngle}
                    originalImageWidth={imageData.imageWidth || 640}
                    originalImageHeight={imageData.imageHeight || 480}
                    containerWidth={containerDimensions.width}
                    containerHeight={containerDimensions.height}
                    metrics={metrics}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-text-secondary">
                <Camera className="h-12 w-12 opacity-30 mb-2" />
                <span className="text-sm">
                  {language === 'ko' ? '이미지 없음' : 'No image'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Measurement cards */}
          <div className="space-y-3">
            {risks.length > 0 ? (
              risks.map((risk) => {
                const factorKey = getRiskFactorKey(risk.name)
                const factors = factorKey ? RISK_FACTORS[factorKey] : undefined
                return (
                  <MeasurementCard
                    key={risk.name}
                    name={risk.name}
                    nameKo={risk.nameKo}
                    value={risk.measuredValue}
                    unit={risk.unit}
                    status={riskToStatus(risk.level)}
                    threshold={risk.threshold}
                    description={risk.description}
                    descriptionKo={risk.descriptionKo}
                    factors={factors}
                  />
                )
              })
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-text-secondary">
                <span className="text-sm">
                  {language === 'ko'
                    ? '이 뷰에서 감지된 문제가 없습니다'
                    : 'No issues detected in this view'}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
