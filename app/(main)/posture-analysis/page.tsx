'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Upload,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CameraView } from '@/components/posture/camera-view'
import { PoseOverlay } from '@/components/posture/pose-overlay'
import { ImageUpload } from '@/components/posture/image-upload'
import { useTranslation } from '@/hooks/use-translation'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { usePostureStore } from '@/stores/posture-store'
import { useUserStore } from '@/stores/user-store'
import { analyzePosture } from '@/lib/analysis/posture-analyzer'
import { generateDetailedResult, type UploadedImageInfo } from '@/lib/mock-analysis-data'
import { CAPTURE_GUIDES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PostureAnalysisResult, Landmark } from '@/types/posture'

type Mode = 'select' | 'camera' | 'upload' | 'capturing' | 'analyzing'
type Direction = 'front' | 'side' | 'back'

export default function PostureAnalysisPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const [mode, setMode] = useState<Mode>('select')
  const [direction, setDirection] = useState<Direction>('front')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [captures, setCaptures] = useState<{ direction: Direction; image: string; landmarks: Landmark[] }[]>([])
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })

  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
    captureFrame,
  } = useCamera({ width: 640, height: 480 })

  const {
    isLoading: poseLoading,
    landmarks,
    startDetection,
    stopDetection,
  } = usePoseDetection()

  const {
    setCurrentAnalysis,
    addToHistory,
    setIsAnalyzing,
    setDetailedResult,
    saveDetailedResult,
    setViewingFromHistory,
  } = usePostureStore()
  const { setPostureScore } = useUserStore()

  // Update video dimensions when streaming
  useEffect(() => {
    if (isStreaming && videoRef.current) {
      const updateDimensions = () => {
        if (videoRef.current) {
          setVideoDimensions({
            width: videoRef.current.videoWidth || 640,
            height: videoRef.current.videoHeight || 480,
          })
        }
      }
      videoRef.current.addEventListener('loadedmetadata', updateDimensions)
      updateDimensions()
    }
  }, [isStreaming, videoRef])

  // Start pose detection when camera is streaming
  useEffect(() => {
    if (isStreaming && videoRef.current && mode === 'camera') {
      startDetection(videoRef.current)
    }
    return () => stopDetection()
  }, [isStreaming, mode, videoRef, startDetection, stopDetection])

  const handleStartCamera = async () => {
    setMode('camera')
    await startCamera()
  }

  const handleCapture = useCallback(() => {
    setCountdown(3)
  }, [])

  // Countdown logic
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }

    // Capture when countdown reaches 0
    if (countdown === 0) {
      const image = captureFrame()
      if (image && landmarks.length > 0) {
        setCaptures((prev) => [...prev, { direction, image, landmarks: [...landmarks] }])

        // Move to next direction or analyze
        const directions: Direction[] = ['front', 'side', 'back']
        const currentIndex = directions.indexOf(direction)

        if (currentIndex < directions.length - 1) {
          setDirection(directions[currentIndex + 1])
        } else {
          // All captures done, analyze
          handleAnalyze()
        }
      }
      setCountdown(null)
    }
  }, [countdown, captureFrame, direction, landmarks])

  const handleAnalyze = useCallback(async () => {
    setMode('analyzing')
    setIsAnalyzing(true)

    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 캡처된 이미지들에서 방향별 추출
    const frontCapture = captures.find((c) => c.direction === 'front')
    const sideCapture = captures.find((c) => c.direction === 'side')
    const backCapture = captures.find((c) => c.direction === 'back')

    // 분석할 메인 이미지 선택 (우선순위: 정면 > 측면 > 후면)
    const captureToAnalyze = frontCapture || sideCapture || backCapture || captures[0]

    if (captureToAnalyze && captureToAnalyze.landmarks.length > 0) {
      const dir = captureToAnalyze.direction
      const result = analyzePosture(captureToAnalyze.landmarks, dir)
      result.imageData = captureToAnalyze.image
      // 방향 정보 추가
      ;(result as any).direction = dir

      setCurrentAnalysis(result)
      addToHistory(result)
      setPostureScore(result.overallScore)

      // 캡처된 이미지들을 UploadedImageInfo 형태로 변환
      const uploadedImageInfos: UploadedImageInfo[] = captures.map(cap => ({
        direction: cap.direction,
        imageData: cap.image,
        landmarks: cap.landmarks.map(l => ({
          x: l.x,
          y: l.y,
          z: l.z,
          visibility: l.visibility,
        })),
      }))

      // 상세 결과 생성 및 저장 (모든 방향의 이미지 정보 전달)
      const detailedResult = generateDetailedResult(result, uploadedImageInfos)
      setDetailedResult(detailedResult)
      saveDetailedResult(result.id, detailedResult)
      setViewingFromHistory(false)

      // 결과 페이지로 이동
      stopCamera()
      setIsAnalyzing(false)
      router.push('/posture-analysis/result/classification')
      return
    }

    setIsAnalyzing(false)
    stopCamera()
  }, [captures, setCurrentAnalysis, addToHistory, setPostureScore, setIsAnalyzing, stopCamera, setDetailedResult, saveDetailedResult, setViewingFromHistory, router])

  const handleReset = () => {
    setMode('select')
    setDirection('front')
    setCaptures([])
    setCurrentAnalysis(null)
    stopCamera()
  }

  // Handle uploaded image analysis completion
  const handleImageUploadComplete = useCallback(
    async (uploadedImages: Array<{
      direction: 'front' | 'side' | 'back'
      preview: string
      landmarks: Landmark[]
      status: 'pending' | 'analyzing' | 'success' | 'error'
    }>) => {
      setMode('analyzing')
      setIsAnalyzing(true)

      // Simulate analysis delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 성공한 이미지들만 필터링
      const successfulImages = uploadedImages.filter((img) => img.status === 'success')

      // Get the front image, or fall back to side, then first successful one
      const frontImage = successfulImages.find((img) => img.direction === 'front')
      const sideImage = successfulImages.find((img) => img.direction === 'side')
      const backImage = successfulImages.find((img) => img.direction === 'back')

      // 분석할 메인 이미지 선택 (우선순위: 정면 > 측면 > 후면)
      const imageToAnalyze = frontImage || sideImage || backImage

      if (imageToAnalyze && imageToAnalyze.landmarks.length > 0) {
        const dir = imageToAnalyze.direction as 'front' | 'side' | 'back'
        const result = analyzePosture(imageToAnalyze.landmarks, dir)
        result.imageData = imageToAnalyze.preview
        // 방향 정보 추가
        ;(result as any).direction = dir

        setCurrentAnalysis(result)
        addToHistory(result)
        setPostureScore(result.overallScore)

        // 업로드된 이미지 정보를 UploadedImageInfo 형태로 변환
        const uploadedImageInfos: UploadedImageInfo[] = successfulImages.map(img => ({
          direction: img.direction,
          imageData: img.preview,
          landmarks: img.landmarks.map(l => ({
            x: l.x,
            y: l.y,
            z: l.z,
            visibility: l.visibility,
          })),
        }))

        // 상세 결과 생성 및 저장 (모든 방향의 이미지 정보 전달)
        const detailedResult = generateDetailedResult(result, uploadedImageInfos)
        setDetailedResult(detailedResult)
        saveDetailedResult(result.id, detailedResult)
        setViewingFromHistory(false)

        // 결과 페이지로 이동
        setIsAnalyzing(false)
        router.push('/posture-analysis/result/classification')
        return
      }

      setIsAnalyzing(false)
    },
    [setCurrentAnalysis, addToHistory, setPostureScore, setIsAnalyzing, setDetailedResult, saveDetailedResult, setViewingFromHistory, router]
  )

  const { currentAnalysis } = usePostureStore()

  const currentGuide = CAPTURE_GUIDES.find((g) => g.direction === direction)

  return (
    <MainLayout title={t('postureAnalysis.title')}>
      <div className="mx-auto max-w-4xl">
        <AnimatePresence mode="wait">
          {/* Mode Selection */}
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-primary">
                  {t('postureAnalysis.selectMode')}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                  onClick={handleStartCamera}
                >
                  <CardContent className="flex flex-col items-center p-8">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {t('postureAnalysis.cameraMode')}
                    </h3>
                    <p className="mt-2 text-center text-sm text-text-secondary">
                      {t('postureAnalysis.cameraModeDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                  onClick={() => setMode('upload')}
                >
                  <CardContent className="flex flex-col items-center p-8">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                      <Upload className="h-8 w-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {t('postureAnalysis.uploadMode')}
                    </h3>
                    <p className="mt-2 text-center text-sm text-text-secondary">
                      {t('postureAnalysis.uploadModeDesc')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Direction indicator */}
              <div className="flex items-center justify-center gap-4">
                {(['front', 'side', 'back'] as const).map((dir, index) => (
                  <div key={dir} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                        direction === dir
                          ? 'bg-primary text-white'
                          : captures.some((c) => c.direction === dir)
                          ? 'bg-secondary text-white'
                          : 'bg-border text-text-secondary'
                      )}
                    >
                      {captures.some((c) => c.direction === dir) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        direction === dir ? 'font-medium text-text-primary' : 'text-text-secondary'
                      )}
                    >
                      {t(`postureAnalysis.captureGuide.${dir}`)}
                    </span>
                    {index < 2 && <ChevronRight className="h-4 w-4 text-text-secondary" />}
                  </div>
                ))}
              </div>

              {/* Camera view */}
              <div className="relative">
                <CameraView
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isStreaming={isStreaming}
                  showGuide={true}
                  direction={direction}
                  className="aspect-[4/3] w-full"
                >
                  {/* Pose overlay */}
                  {landmarks.length > 0 && (
                    <PoseOverlay
                      landmarks={landmarks}
                      width={videoDimensions.width}
                      height={videoDimensions.height}
                      className="absolute inset-0 h-full w-full"
                    />
                  )}

                  {/* Countdown overlay */}
                  {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <motion.div
                        key={countdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl font-bold text-white"
                      >
                        {countdown}
                      </motion.div>
                    </div>
                  )}
                </CameraView>

                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface">
                    <div className="text-center text-error">
                      <p>{cameraError}</p>
                      <Button onClick={handleStartCamera} className="mt-4">
                        {t('common.retry')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {currentGuide && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-text-primary">
                      {t('postureAnalysis.captureGuide.instructions')}
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                      {(language === 'ko' ? currentGuide.instructionsKo : currentGuide.instructions).map(
                        (instruction, index) => (
                          <li key={index}>• {instruction}</li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleCapture}
                  disabled={!isStreaming || landmarks.length === 0 || countdown !== null}
                  size="lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  {t('postureAnalysis.captureGuide.countdown')} {countdown ?? ''}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Analyzing */}
          {mode === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[400px] flex-col items-center justify-center"
            >
              <div className="mb-4">
                <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-lg font-medium text-text-primary">
                {t('postureAnalysis.analyzing')}
              </p>
            </motion.div>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <ImageUpload
                onComplete={handleImageUploadComplete}
                onCancel={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}
