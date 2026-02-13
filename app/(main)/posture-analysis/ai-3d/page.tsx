'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Shield,
  Dumbbell,
  Brain,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Info,
  Download,
  Camera,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ViewOverlayCanvas } from '@/components/posture/view-overlay-canvas'
import { WebcamCaptureModal } from '@/components/posture/webcam-capture-modal'
import { PoseSilhouette } from '@/components/posture/pose-silhouette'
import { ViewResultSection } from '@/components/posture/view-result-section'
import dynamic from 'next/dynamic'
import { ExerciseGuideCard } from '@/components/exercise/exercise-guide-card'
import { useTranslation } from '@/hooks/use-translation'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useOnnxModel } from '@/hooks/use-onnx-model'
import type { Pose3DResult } from '@/hooks/use-onnx-model'
import { analyzeMultiView } from '@/lib/analysis/pose-3d-analyzer'
import type { BodyPartRisk, PredictedCondition, Recommendation3D } from '@/lib/analysis/pose-3d-analyzer'
import type { ViewAngle, MultiView3DAnalysisResult, PoseLandmark, AI3DAnalysisHistoryEntry } from '@/types/analysis-result'
import { RISK_FACTORS, getRiskFactorKey } from '@/lib/analysis/risk-factors'
import { usePostureStore } from '@/stores/posture-store'
import { cn } from '@/lib/utils'
import { EXERCISES } from '@/lib/constants'
import { generateReportPDF } from '@/lib/pdf/generate-report-pdf'

const Muscle3DViewer = dynamic(
  () => import('@/components/posture/muscle-3d-viewer').then((m) => ({ default: m.Muscle3DViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-border bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

// TODO: VRM 자세 재현 기능 - 필요시 주석 해제
// const PoseVrmViewer = dynamic(
//   () => import('@/components/posture/pose-vrm-viewer').then((m) => ({ default: m.PoseVrmViewer })),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex h-[380px] items-center justify-center rounded-xl border border-border bg-surface">
//         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//       </div>
//     ),
//   }
// )

type PageState = 'idle' | 'analyzing' | 'result'

// 이미지를 압축하여 base64로 변환 (용량 관리)
const compressImageToBase64 = (imageDataUrl: string, maxWidth = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.6)) // JPEG 60% 품질
      } else {
        resolve(imageDataUrl)
      }
    }
    img.onerror = () => resolve(imageDataUrl)
    img.src = imageDataUrl
  })
}

interface ViewImageData {
  imageDataUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  landmarks2D: PoseLandmark[] | null
  pose3D: Pose3DResult | null
  status: 'empty' | 'uploaded' | 'error'
  errorMessage?: string
}

const VIEWS: ViewAngle[] = ['front', 'side', 'back']

const INITIAL_VIEW: ViewImageData = {
  imageDataUrl: null,
  imageWidth: null,
  imageHeight: null,
  landmarks2D: null,
  pose3D: null,
  status: 'empty',
}

// TODO: VRM 자세 재현 기능 - 필요시 주석 해제
// function Pose3DReconstructionSection({
//   viewImages,
//   language,
//   t,
// }: {
//   viewImages: Record<ViewAngle, ViewImageData>
//   language: string
//   t: (key: string) => string
// }) {
//   const [activeTab, setActiveTab] = useState<ViewAngle>('front')
//   const tabs: { view: ViewAngle; label: string }[] = [
//     { view: 'front', label: language === 'ko' ? '정면' : 'Front' },
//     { view: 'side', label: language === 'ko' ? '측면' : 'Side' },
//     { view: 'back', label: language === 'ko' ? '후면' : 'Back' },
//   ]
//   const availableTabs = tabs.filter((tab) => viewImages[tab.view].pose3D !== null)
//   const currentPose = viewImages[activeTab]?.pose3D ?? null
//   useEffect(() => {
//     if (!currentPose && availableTabs.length > 0) setActiveTab(availableTabs[0].view)
//   }, [currentPose, availableTabs])
//   if (availableTabs.length === 0) return null
//   return (
//     <div className="rounded-xl border border-border bg-surface overflow-hidden">
//       <div className="flex items-center justify-between border-b border-border px-4 py-3">
//         <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
//           <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
//             <User className="h-3.5 w-3.5 text-primary" />
//           </span>
//           {language === 'ko' ? '3D 자세 재현' : '3D Pose Reconstruction'}
//         </h3>
//         {availableTabs.length > 1 && (
//           <div className="flex rounded-lg bg-background p-1">
//             {availableTabs.map((tab) => (
//               <button key={tab.view} onClick={() => setActiveTab(tab.view)}
//                 className={cn('rounded-md px-3 py-1 text-xs font-medium transition-colors',
//                   activeTab === tab.view ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')}>
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//         )}
//       </div>
//       <div className="p-4">
//         <PoseVrmViewer joints3D={currentPose}
//           viewLabel={tabs.find((t) => t.view === activeTab)?.label}
//           language={language as 'ko' | 'en'} className="h-[380px]" />
//         <p className="mt-2 text-center text-[11px] text-text-secondary">
//           {language === 'ko'
//             ? 'ONNX 3D 좌표를 VRM 아바타에 적용한 자세 재현입니다.'
//             : 'Pose reconstruction from ONNX 3D coordinates.'}
//         </p>
//       </div>
//     </div>
//   )
// }

export default function AI3DAnalysisPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const [pageState, setPageState] = useState<PageState>('idle')
  const [viewImages, setViewImages] = useState<Record<ViewAngle, ViewImageData>>({
    front: { ...INITIAL_VIEW },
    side: { ...INITIAL_VIEW },
    back: { ...INITIAL_VIEW },
  })
  const [multiViewResult, setMultiViewResult] = useState<MultiView3DAnalysisResult | null>(null)
  const [activeResultTab, setActiveResultTab] = useState<ViewAngle>('front')
  const [analyzingStep, setAnalyzingStep] = useState(0)
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())
  const [detectError, setDetectError] = useState<string | null>(null)
  const [isPdfDownloading, setIsPdfDownloading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [webcamView, setWebcamView] = useState<ViewAngle | null>(null)
  const [containerDimensions, setContainerDimensions] = useState<Record<ViewAngle, { width: number; height: number }>>({
    front: { width: 300, height: 400 },
    side: { width: 300, height: 400 },
    back: { width: 300, height: 400 },
  })

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  }

  const imageContainerRefs = {
    front: useRef<HTMLDivElement>(null),
    side: useRef<HTMLDivElement>(null),
    back: useRef<HTMLDivElement>(null),
  }

  // ResizeObserver로 컨테이너 크기 추적
  useEffect(() => {
    const observers: ResizeObserver[] = []

    VIEWS.forEach((view) => {
      const ref = imageContainerRefs[view]
      if (ref.current) {
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) {
              setContainerDimensions((prev) => ({
                ...prev,
                [view]: { width, height },
              }))
            }
          }
        })
        observer.observe(ref.current)
        observers.push(observer)
      }
    })

    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [pageState])

  const {
    detectPoseFromImage,
  } = usePoseDetection()

  const {
    isLoading: onnxLoading,
    isReady: onnxReady,
    error: onnxError,
    predict: predictPose3D,
  } = useOnnxModel()

  const { addAI3DAnalysis } = usePostureStore()

  const uploadedCount = VIEWS.filter((v) => viewImages[v].status === 'uploaded').length
  const allUploaded = uploadedCount === 3

  const handleFileSelect = useCallback((view: ViewAngle, file: File) => {
    setDetectError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // 이미지 크기를 가져오기 위해 Image 객체 생성
      const img = new Image()
      img.onload = () => {
        setViewImages((prev) => ({
          ...prev,
          [view]: {
            ...INITIAL_VIEW,
            imageDataUrl: dataUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            status: 'uploaded' as const,
          },
        }))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRemovePhoto = useCallback((view: ViewAngle) => {
    setViewImages((prev) => ({
      ...prev,
      [view]: { ...INITIAL_VIEW },
    }))
    setDetectError(null)
  }, [])

  const handleDrop = useCallback((view: ViewAngle, e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(view, file)
    }
  }, [handleFileSelect])

  const handleWebcamCapture = useCallback((view: ViewAngle, dataUrl: string, width: number, height: number) => {
    setDetectError(null)
    setViewImages((prev) => ({
      ...prev,
      [view]: {
        ...INITIAL_VIEW,
        imageDataUrl: dataUrl,
        imageWidth: width,
        imageHeight: height,
        status: 'uploaded' as const,
      },
    }))
  }, [])

  const handleStartAnalysis = useCallback(async () => {
    if (!allUploaded) return
    setPageState('analyzing')
    setDetectError(null)
    setAnalyzingStep(0)

    const results: Record<ViewAngle, { pose3D: Pose3DResult; landmarks2D: PoseLandmark[] } | null> = {
      front: null,
      side: null,
      back: null,
    }

    for (let i = 0; i < VIEWS.length; i++) {
      const view = VIEWS[i]
      setAnalyzingStep(i + 1)

      const imageDataUrl = viewImages[view].imageDataUrl
      if (!imageDataUrl) continue

      try {
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Image load failed'))
          img.src = imageDataUrl
        })

        const detected = await detectPoseFromImage(img)
        if (detected.length < 33) {
          setViewImages((prev) => ({
            ...prev,
            [view]: { ...prev[view], status: 'error' as const, errorMessage: t('ai3d.noPersonDetected') },
          }))
          continue
        }

        const pose3D = await predictPose3D(detected)
        if (!pose3D) {
          setViewImages((prev) => ({
            ...prev,
            [view]: { ...prev[view], status: 'error' as const, errorMessage: t('ai3d.noPersonDetected') },
          }))
          continue
        }

        setViewImages((prev) => ({
          ...prev,
          [view]: { ...prev[view], landmarks2D: detected, pose3D },
        }))

        results[view] = { pose3D, landmarks2D: detected }
      } catch {
        setViewImages((prev) => ({
          ...prev,
          [view]: { ...prev[view], status: 'error' as const, errorMessage: t('ai3d.noPersonDetected') },
        }))
      }
    }

    const hasAnyResult = Object.values(results).some((r) => r !== null)
    if (!hasAnyResult) {
      setDetectError(t('ai3d.noPersonDetected'))
      setPageState('idle')
      return
    }

    const analysis = analyzeMultiView(
      results.front?.pose3D ?? null,
      results.side?.pose3D ?? null,
      results.back?.pose3D ?? null,
    )

    setMultiViewResult(analysis)
    setPageState('result')

    // Save to history with compressed images
    const compressImages = async () => {
      const images: { front?: string; side?: string; back?: string } = {}
      if (viewImages.front.imageDataUrl) {
        images.front = await compressImageToBase64(viewImages.front.imageDataUrl)
      }
      if (viewImages.side.imageDataUrl) {
        images.side = await compressImageToBase64(viewImages.side.imageDataUrl)
      }
      if (viewImages.back.imageDataUrl) {
        images.back = await compressImageToBase64(viewImages.back.imageDataUrl)
      }
      return images
    }

    compressImages().then((images) => {
      const historyEntry: AI3DAnalysisHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        overallScore: analysis.overallScore,
        frontScore: analysis.frontScore,
        sideScore: analysis.sideScore,
        backScore: analysis.backScore,
        metrics: {
          neckForwardAngle: analysis.sideMetrics?.neckForwardAngle,
          shoulderTilt: analysis.frontMetrics?.shoulderHeightDifference,
          pelvisTilt: analysis.frontMetrics?.pelvisHeightDifference,
          thoracicKyphosis: analysis.sideMetrics?.thoracicKyphosisAngle,
          lumbarLordosis: analysis.sideMetrics?.lumbarLordosisAngle,
          spineLateralDeviation: analysis.backMetrics?.spineLateralDeviation,
          scapulaAsymmetry: analysis.backMetrics?.scapulaAsymmetry,
          roundShoulderAngle: analysis.sideMetrics?.shoulderProtraction?.angle,
          legAlignmentType: analysis.frontMetrics?.legAlignment?.type,
        },
        images,
        conditions: analysis.conditions,
        recommendations: analysis.recommendations,
        frontMetrics: analysis.frontMetrics,
        sideMetrics: analysis.sideMetrics,
        backMetrics: analysis.backMetrics,
      }
      addAI3DAnalysis(historyEntry)
    }).catch((err) => {
      console.error('Failed to save history:', err)
    })
  }, [allUploaded, viewImages, detectPoseFromImage, predictPose3D, t, addAI3DAnalysis])

  const handleReset = useCallback(() => {
    setPageState('idle')
    setViewImages({
      front: { ...INITIAL_VIEW },
      side: { ...INITIAL_VIEW },
      back: { ...INITIAL_VIEW },
    })
    setMultiViewResult(null)
    setDetectError(null)
    setExpandedRecs(new Set())
    setAnalyzingStep(0)
  }, [])

  const handleDownloadPDF = useCallback(async () => {
    if (!multiViewResult) return

    setIsPdfDownloading(true)
    setPdfError(null)
    try {
      await generateReportPDF({
        analysisResult: multiViewResult,
        viewImages: {
          front: {
            imageDataUrl: viewImages.front.imageDataUrl,
            landmarks2D: viewImages.front.landmarks2D,
            imageWidth: viewImages.front.imageWidth,
            imageHeight: viewImages.front.imageHeight,
          },
          side: {
            imageDataUrl: viewImages.side.imageDataUrl,
            landmarks2D: viewImages.side.landmarks2D,
            imageWidth: viewImages.side.imageWidth,
            imageHeight: viewImages.side.imageHeight,
          },
          back: {
            imageDataUrl: viewImages.back.imageDataUrl,
            landmarks2D: viewImages.back.landmarks2D,
            imageWidth: viewImages.back.imageWidth,
            imageHeight: viewImages.back.imageHeight,
          },
        },
        language: language as 'ko' | 'en',
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      setPdfError(language === 'ko' ? 'PDF 생성에 실패했습니다. 다시 시도해주세요.' : 'PDF generation failed. Please try again.')
    } finally {
      setIsPdfDownloading(false)
    }
  }, [multiViewResult, viewImages, language])

  const toggleRec = (index: number) => {
    setExpandedRecs((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
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

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }
  const scoreStroke = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
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

  const renderScoreGauge = (score: number) => {
    const radius = 54
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference
    return (
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-border" />
          <circle
            cx="70" cy="70" r={radius} fill="none"
            stroke={scoreStroke(score)} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
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
          <span className="text-text-secondary">{t('ai3d.measured')}: <span className={cn('font-semibold', riskColor(risk.level))}>{risk.measuredValue}{risk.unit}</span></span>
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

  const renderCondition = (condition: PredictedCondition, index: number) => (
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

  const renderRecommendation = (rec: Recommendation3D, index: number) => {
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
                      <p className="mb-2 text-xs font-medium text-text-primary">{t('ai3d.exerciseList')}</p>
                      <div className="grid gap-2">
                        {rec.exercises.map((ex) => (
                          <ExerciseGuideCard
                            key={ex.id}
                            exerciseId={ex.id}
                            name={ex.name}
                            nameKo={ex.nameKo}
                            onStartExercise={() => {
                              const found = EXERCISES.find((e) => e.id === ex.id)
                              const route = found?.exerciseType === 'guided'
                                ? `/exercise/guided?id=${ex.id}`
                                : `/exercise/workout?id=${ex.id}`
                              router.push(route)
                            }}
                            compact
                          />
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

  const renderUploadCard = (view: ViewAngle) => {
    const data = viewImages[view]
    const label = viewLabel(view)

    return (
      <div key={view} className="flex-1 min-w-0">
        <input
          ref={fileInputRefs[view]}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(view, file)
            e.target.value = ''
          }}
        />

        {data.status === 'empty' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(view, e)}
            className="rounded-xl border-2 border-dashed border-border transition-all bg-border/5"
          >
            <div className="flex flex-col items-center justify-center p-4 aspect-[3/4]">
              <div className="mb-3 flex items-center justify-center h-24 w-16">
                <PoseSilhouette view={view} className="h-full w-auto" />
              </div>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-secondary mb-3">{label}</span>
              {/* Two option buttons */}
              <div className="flex flex-col gap-2 w-full px-1">
                <button
                  onClick={() => fileInputRefs[view].current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t('ai3d.webcam.uploadPhoto')}
                </button>
                <button
                  onClick={() => setWebcamView(view)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {t('ai3d.webcam.takePhoto')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl border border-border overflow-hidden bg-black">
            <div className="aspect-[3/4]">
              <img
                src={data.imageDataUrl!}
                alt={label}
                className="h-full w-full object-contain"
              />
            </div>
            <button
              onClick={() => handleRemovePhoto(view)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white">{label}</span>
            </div>
            {data.status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="text-center px-3">
                  <AlertTriangle className="mx-auto mb-1 h-6 w-6 text-red-400" />
                  <p className="text-xs text-red-300">{data.errorMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderResultImage = (view: ViewAngle) => {
    const data = viewImages[view]
    if (!data.imageDataUrl) return null

    const metrics = multiViewResult
      ? view === 'front' ? multiViewResult.frontMetrics
        : view === 'side' ? multiViewResult.sideMetrics
        : multiViewResult.backMetrics
      : null

    return (
      <div key={view} className="flex-1 min-w-0">
        <div className="relative rounded-xl border border-border overflow-hidden bg-black">
          <div className="aspect-[3/4] relative" ref={imageContainerRefs[view]}>
            <img
              src={data.imageDataUrl}
              alt={viewLabel(view)}
              className="h-full w-full object-contain"
            />
            {data.landmarks2D && metrics && containerDimensions[view].width > 0 && (
              <ViewOverlayCanvas
                viewAngle={view}
                landmarks2D={data.landmarks2D}
                containerWidth={containerDimensions[view].width}
                containerHeight={containerDimensions[view].height}
                originalImageWidth={data.imageWidth || undefined}
                originalImageHeight={data.imageHeight || undefined}
                metrics={metrics}
              />
            )}
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white">{viewLabel(view)}</span>
          </div>
          {data.status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderViewRiskCards = (view: ViewAngle) => {
    if (!multiViewResult) return null

    switch (view) {
      case 'front': {
        const m = multiViewResult.frontMetrics
        if (!m) return <p className="text-sm text-text-secondary">{t('ai3d.noPersonDetected')}</p>
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {renderRiskCard(m.shoulderRisk as BodyPartRisk, 0)}
            {renderRiskCard(m.pelvisRisk as BodyPartRisk, 1)}
            {m.legRisk && renderRiskCard(m.legRisk as BodyPartRisk, 2)}
          </div>
        )
      }
      case 'side': {
        const m = multiViewResult.sideMetrics
        if (!m) return <p className="text-sm text-text-secondary">{t('ai3d.noPersonDetected')}</p>
        const sideRisks: BodyPartRisk[] = [
          m.neckRisk as BodyPartRisk,
          (m.thoracicKyphosisRisk ?? m.spineRisk) as BodyPartRisk,
          ...(m.lumbarLordosisRisk ? [m.lumbarLordosisRisk as BodyPartRisk] : []),
          ...(m.roundShoulderRisk ? [m.roundShoulderRisk as BodyPartRisk] : []),
        ]
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sideRisks.map((risk, i) => renderRiskCard(risk, i))}
          </div>
        )
      }
      case 'back': {
        const m = multiViewResult.backMetrics
        if (!m) return <p className="text-sm text-text-secondary">{t('ai3d.noPersonDetected')}</p>
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderRiskCard(m.spineRisk as BodyPartRisk, 0)}
            {renderRiskCard(m.scapulaRisk as BodyPartRisk, 1)}
          </div>
        )
      }
    }
  }

  return (
    <MainLayout title={t('ai3d.title')}>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-text-primary">{t('ai3d.multiViewTitle')}</h2>
            <p className="text-sm text-text-secondary">{t('ai3d.multiViewSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary flex items-center">
              <Brain className="mr-1 h-3 w-3" />
              {t('ai3d.modelBadge')}
            </span>
            <span className="rounded-full border border-secondary/30 bg-secondary/5 px-2.5 py-0.5 text-xs font-medium text-secondary">
              {t('ai3d.joints24')}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-secondary">
              {t('ai3d.wasmEngine')}
            </span>
            {onnxLoading && (
              <span className="rounded-full border border-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-500 flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {t('ai3d.modelLoading')}
              </span>
            )}
            {onnxReady && !onnxLoading && (
              <span className="rounded-full border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-500 flex items-center">
                <CheckCircle className="mr-1 h-3 w-3" />
                {t('ai3d.modelReady')}
              </span>
            )}
            {onnxError && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-medium text-white">
                {t('ai3d.modelError')}
              </span>
            )}
          </div>
        </motion.div>

        {/* 에러 배너 */}
        {detectError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3"
          >
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-500">{detectError}</span>
            <button onClick={() => setDetectError(null)} className="ml-auto">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </motion.div>
        )}

        {/* IDLE: 업로드 UI */}
        {pageState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex gap-3">
              {VIEWS.map((view) => renderUploadCard(view))}
            </div>

            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-2">{t('ai3d.uploadGuidelinesTitle')}</h3>
                    <ul className="space-y-1 text-xs text-text-secondary">
                      <li>{t('ai3d.guidelineFullBody')}</li>
                      <li>{t('ai3d.guidelineStandStraight')}</li>
                      <li>{t('ai3d.guidelineLighting')}</li>
                      <li>{t('ai3d.guidelineTightClothes')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={handleStartAnalysis}
                disabled={!allUploaded || !onnxReady}
                className="w-full max-w-md"
                size="lg"
              >
                {onnxLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('ai3d.modelLoading')}
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    {t('ai3d.startAnalysis')} ({uploadedCount}/3)
                  </>
                )}
              </Button>
              {!allUploaded && (
                <p className="text-xs text-text-secondary">{t('ai3d.allPhotosRequired')}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ANALYZING */}
        {pageState === 'analyzing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-border p-16"
          >
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-base font-medium text-text-primary">
              {t('ai3d.analyzingView')} {viewLabel(VIEWS[analyzingStep - 1] || 'front')}... ({analyzingStep} {t('ai3d.analyzingProgress')})
            </p>
            <p className="mt-2 text-xs text-text-secondary">{t('ai3d.analyzingDesc')}</p>
            <div className="mt-4 flex gap-2">
              {VIEWS.map((view, i) => (
                <div key={view} className={cn(
                  'h-2 w-16 rounded-full transition-colors',
                  i < analyzingStep ? 'bg-primary' : 'bg-border',
                )} />
              ))}
            </div>
          </motion.div>
        )}

        {/* RESULT */}
        {pageState === 'result' && multiViewResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 1. 정면 뷰 섹션 */}
            {viewImages.front.imageDataUrl && (
              <ViewResultSection
                viewAngle="front"
                imageData={{
                  imageDataUrl: viewImages.front.imageDataUrl,
                  landmarks2D: viewImages.front.landmarks2D,
                  imageWidth: viewImages.front.imageWidth,
                  imageHeight: viewImages.front.imageHeight,
                }}
                metrics={multiViewResult.frontMetrics}
                risks={multiViewResult.frontMetrics ? [
                  multiViewResult.frontMetrics.shoulderRisk as BodyPartRisk,
                  multiViewResult.frontMetrics.pelvisRisk as BodyPartRisk,
                  ...(multiViewResult.frontMetrics.legRisk ? [multiViewResult.frontMetrics.legRisk as BodyPartRisk] : []),
                ] : []}
                score={multiViewResult.frontScore}
              />
            )}

            {/* 2. 측면 뷰 섹션 */}
            {viewImages.side.imageDataUrl && (
              <ViewResultSection
                viewAngle="side"
                imageData={{
                  imageDataUrl: viewImages.side.imageDataUrl,
                  landmarks2D: viewImages.side.landmarks2D,
                  imageWidth: viewImages.side.imageWidth,
                  imageHeight: viewImages.side.imageHeight,
                }}
                metrics={multiViewResult.sideMetrics}
                risks={multiViewResult.sideMetrics ? [
                  multiViewResult.sideMetrics.neckRisk as BodyPartRisk,
                  (multiViewResult.sideMetrics.thoracicKyphosisRisk ?? multiViewResult.sideMetrics.spineRisk) as BodyPartRisk,
                  ...(multiViewResult.sideMetrics.lumbarLordosisRisk ? [multiViewResult.sideMetrics.lumbarLordosisRisk as BodyPartRisk] : []),
                  ...(multiViewResult.sideMetrics.roundShoulderRisk ? [multiViewResult.sideMetrics.roundShoulderRisk as BodyPartRisk] : []),
                ] : []}
                score={multiViewResult.sideScore}
              />
            )}

            {/* 3. 후면 뷰 섹션 */}
            {viewImages.back.imageDataUrl && (
              <ViewResultSection
                viewAngle="back"
                imageData={{
                  imageDataUrl: viewImages.back.imageDataUrl,
                  landmarks2D: viewImages.back.landmarks2D,
                  imageWidth: viewImages.back.imageWidth,
                  imageHeight: viewImages.back.imageHeight,
                }}
                metrics={multiViewResult.backMetrics}
                risks={multiViewResult.backMetrics ? [
                  multiViewResult.backMetrics.spineRisk as BodyPartRisk,
                  multiViewResult.backMetrics.scapulaRisk as BodyPartRisk,
                ] : []}
                score={multiViewResult.backScore}
              />
            )}

            {/* 4. 종합 점수 */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-6">
                  {renderScoreGauge(multiViewResult.overallScore)}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary">{t('ai3d.combinedScore')}</h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      {multiViewResult.overallScore >= 80
                        ? t('ai3d.goodPosture')
                        : language === 'ko'
                        ? '개선이 필요한 부위가 있습니다'
                        : 'Some areas need improvement'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([['front', multiViewResult.frontScore], ['side', multiViewResult.sideScore], ['back', multiViewResult.backScore]] as [ViewAngle, number | null][]).map(([view, score]) => (
                        <div key={view} className={cn(
                          'flex items-center gap-1.5 rounded-full px-2.5 py-1',
                          score === null ? 'bg-border/50' : score >= 80 ? 'bg-emerald-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10',
                        )}>
                          <span className="text-[10px] font-medium text-text-secondary">{viewLabel(view)}</span>
                          <span className={cn('text-xs font-bold', score === null ? 'text-text-secondary' : scoreColor(score))}>
                            {score ?? '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. 예측 질환 목록 */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                <AlertTriangle className="h-4 w-4" />
                {t('ai3d.predictedConditions')}
              </h3>
              {multiViewResult.conditions.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center gap-2 p-4">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-text-secondary">{t('ai3d.noConditions')}</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {multiViewResult.conditions.map((c, i) => renderCondition(c, i))}
                </div>
              )}
            </div>

            {/* 근육 상태 3D 시각화 */}
            {multiViewResult.conditions.length > 0 && (
              <Muscle3DViewer
                conditions={multiViewResult.conditions}
                legAlignmentType={multiViewResult.frontMetrics?.legAlignment?.type}
                language={language}
              />
            )}

            {/* TODO: VRM 자세 재현 기능 - 필요시 주석 해제 */}
            {/* {(viewImages.front.pose3D || viewImages.side.pose3D || viewImages.back.pose3D) && (
              <Pose3DReconstructionSection
                viewImages={viewImages}
                language={language}
                t={t}
              />
            )} */}

            {/* 7. 추천 운동 */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                <Dumbbell className="h-4 w-4" />
                {t('ai3d.recommendations')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {multiViewResult.recommendations.map((rec, i) => renderRecommendation(rec, i))}
              </div>
            </div>

            {/* 7. 액션 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/exercise/list')}
                className="flex-1"
                size="lg"
              >
                <Dumbbell className="mr-2 h-4 w-4" />
                {language === 'ko' ? '운동하러 가기' : 'Go to Exercises'}
              </Button>
              <Button
                onClick={() => router.push('/avatar')}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Brain className="mr-2 h-4 w-4" />
                {language === 'ko' ? '3D 자세 확인하기' : 'View 3D Posture'}
              </Button>
            </div>

            {/* PDF 다운로드 버튼 */}
            <Button
              onClick={handleDownloadPDF}
              disabled={isPdfDownloading}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              {isPdfDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('ai3d.pdf.downloading')}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t('ai3d.pdf.downloadButton')}
                </>
              )}
            </Button>
            {pdfError && (
              <p className="text-sm text-error text-center">{pdfError}</p>
            )}

            {/* AI 모델 정보 */}
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-[11px] leading-relaxed text-text-secondary">
                  {t('ai3d.aiModelInfo')}
                </p>
              </CardContent>
            </Card>

            {/* 다시 분석 버튼 */}
            <Button variant="outline" onClick={handleReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('ai3d.reAnalyze')}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Webcam Capture Modal */}
      {webcamView && (
        <WebcamCaptureModal
          isOpen={webcamView !== null}
          viewAngle={webcamView}
          onCapture={(dataUrl, width, height) => handleWebcamCapture(webcamView, dataUrl, width, height)}
          onClose={() => setWebcamView(null)}
        />
      )}
    </MainLayout>
  )
}
