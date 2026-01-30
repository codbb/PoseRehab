'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, Upload, Play, Square, AlertCircle, Loader2, X } from 'lucide-react'
import { GaitSkeleton } from './gait-skeleton'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'
import type { Landmark } from '@/types/posture'

interface GaitCameraProps {
  mode: 'webcam' | 'video'
  isAnalyzing: boolean
  showSkeleton?: boolean
  onModeChange?: (mode: 'webcam' | 'video') => void
  onAnalysisStart?: () => void
  onAnalysisStop?: () => void
  onVideoChange?: () => void  // 영상 변경 시 호출 (분석 결과 초기화용)
  onFrame?: (landmarks: Landmark[], timestamp: number) => void
  targetFps?: number
}

export function GaitCamera({
  mode,
  isAnalyzing,
  showSkeleton = true,
  onModeChange,
  onAnalysisStart,
  onAnalysisStop,
  onVideoChange,
  onFrame,
  targetFps = 30,
}: GaitCameraProps) {
  const { language } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const videoUploadRef = useRef<HTMLInputElement>(null)
  const uploadedVideoRef = useRef<HTMLVideoElement>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const cameraInitializedRef = useRef(false)
  const analysisLoopRef = useRef<number | null>(null)

  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })
  const [uploadedVideoSrc, setUploadedVideoSrc] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // 카메라 훅
  const {
    videoRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useCamera()

  // MediaPipe Pose 훅
  const {
    isLoading: isModelLoading,
    isReady: isModelReady,
    error: modelError,
    landmarks,
    loadModel,
    detectPose,
    startDetection,
    stopDetection,
  } = usePoseDetection({
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  // 비디오 크기 업데이트 (실제 비디오 크기 기준)
  const updateVideoDimensions = useCallback((video: HTMLVideoElement) => {
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
      })
      console.log('[GaitCamera] Video dimensions:', video.videoWidth, 'x', video.videoHeight)
    }
  }, [])

  // 웹캠 모드에서 카메라 시작 (한 번만)
  useEffect(() => {
    if (mode === 'webcam' && !cameraInitializedRef.current && !isStreaming) {
      cameraInitializedRef.current = true
      setIsInitializing(true)
      console.log('[GaitCamera] Starting webcam...')
      startCamera().finally(() => {
        setIsInitializing(false)
        console.log('[GaitCamera] Webcam started')
      })
    } else if (mode === 'video') {
      cameraInitializedRef.current = false
      stopCamera()
    }

    return () => {
      stopDetection()
      if (analysisLoopRef.current) {
        cancelAnimationFrame(analysisLoopRef.current)
        analysisLoopRef.current = null
      }
    }
  }, [mode])

  // 비디오 메타데이터 로드 시 크기 업데이트
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      updateVideoDimensions(video)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    if (video.readyState >= 1) {
      updateVideoDimensions(video)
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoRef, updateVideoDimensions])

  // 비디오 모드에서 모델 미리 로딩
  useEffect(() => {
    if (mode === 'video' && uploadedVideoSrc && !isModelReady && !isModelLoading) {
      console.log('[GaitCamera] Preloading model for video mode...')
      loadModel()
    }
  }, [mode, uploadedVideoSrc, isModelReady, isModelLoading, loadModel])

  // 분석 상태 변경 처리 - 웹캠 모드
  useEffect(() => {
    if (mode !== 'webcam') return

    if (isAnalyzing && isModelReady && videoRef.current) {
      console.log('[GaitCamera] Starting webcam detection...')
      startDetection(videoRef.current)
    } else if (!isAnalyzing) {
      stopDetection()
    }
  }, [isAnalyzing, isModelReady, mode, videoRef, startDetection, stopDetection])

  // 비디오 모드 분석 루프
  useEffect(() => {
    if (mode !== 'video' || !isAnalyzing || !isModelReady || !uploadedVideoRef.current) {
      return
    }

    const video = uploadedVideoRef.current
    let isActive = true

    console.log('[GaitCamera] Starting video analysis loop...')
    console.log('[GaitCamera] Video readyState:', video.readyState)
    console.log('[GaitCamera] Video paused:', video.paused)
    console.log('[GaitCamera] Model ready:', isModelReady)

    // 비디오 분석 루프 - detectPose 사용 (단일 프레임 감지)
    const analyzeFrame = async () => {
      if (!isActive || !uploadedVideoRef.current) {
        console.log('[GaitCamera] Analysis stopped')
        return
      }

      const currentVideo = uploadedVideoRef.current

      if (currentVideo.readyState >= 2 && !currentVideo.paused && !currentVideo.ended) {
        try {
          await detectPose(currentVideo)
          setDebugInfo(`Analyzing: ${currentVideo.currentTime.toFixed(2)}s`)
        } catch (err) {
          console.error('[GaitCamera] Detection error:', err)
        }
      } else if (currentVideo.ended) {
        setDebugInfo('Video ended')
        return
      } else {
        setDebugInfo(`Waiting: readyState=${currentVideo.readyState}, paused=${currentVideo.paused}`)
      }

      if (isActive) {
        analysisLoopRef.current = requestAnimationFrame(analyzeFrame)
      }
    }

    // 비디오 재생 시작
    if (video.paused) {
      video.currentTime = 0 // 처음부터 재생
      video.play().then(() => {
        console.log('[GaitCamera] Video playing, starting analysis')
        analyzeFrame()
      }).catch(err => {
        console.error('[GaitCamera] Failed to play video:', err)
      })
    } else {
      analyzeFrame()
    }

    return () => {
      isActive = false
      if (analysisLoopRef.current) {
        cancelAnimationFrame(analysisLoopRef.current)
        analysisLoopRef.current = null
      }
    }
  }, [isAnalyzing, isModelReady, mode, detectPose])

  // 랜드마크 변경 시 콜백 호출 및 FPS 계산
  useEffect(() => {
    if (landmarks && landmarks.length > 0 && isAnalyzing) {
      const now = performance.now()
      const frameInterval = 1000 / targetFps

      // FPS 계산
      if (lastFrameTimeRef.current > 0) {
        const elapsed = now - lastFrameTimeRef.current
        setFps(Math.round(1000 / elapsed))
      }

      // 타겟 FPS에 맞게 프레임 스킵
      if (now - lastFrameTimeRef.current >= frameInterval) {
        console.log('[GaitCamera] Landmark detected, landmarks count:', landmarks.length)
        onFrame?.(landmarks, now)
        lastFrameTimeRef.current = now
      }
    }
  }, [landmarks, isAnalyzing, onFrame, targetFps])

  // 비디오 업로드 처리
  const handleVideoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        console.log('[GaitCamera] Video file selected:', file.name)
        // 기존 URL 정리
        if (uploadedVideoSrc) {
          URL.revokeObjectURL(uploadedVideoSrc)
        }
        const url = URL.createObjectURL(file)
        setUploadedVideoSrc(url)
        setIsVideoReady(false)
        // 영상 변경 시 분석 결과 초기화
        onVideoChange?.()
      }
      // input 값 리셋 (같은 파일도 다시 선택 가능하도록)
      event.target.value = ''
    },
    [uploadedVideoSrc, onVideoChange]
  )

  // 비디오 삭제 처리
  const handleVideoRemove = useCallback(() => {
    if (isAnalyzing) {
      onAnalysisStop?.()
    }
    if (uploadedVideoSrc) {
      URL.revokeObjectURL(uploadedVideoSrc)
    }
    setUploadedVideoSrc(null)
    setIsVideoReady(false)
    setDebugInfo('')
    onVideoChange?.()
  }, [uploadedVideoSrc, isAnalyzing, onAnalysisStop, onVideoChange])

  // 업로드된 비디오 메타데이터 로드
  const handleUploadedVideoLoaded = useCallback(() => {
    if (uploadedVideoRef.current) {
      console.log('[GaitCamera] Uploaded video metadata loaded')
      updateVideoDimensions(uploadedVideoRef.current)
      setIsVideoReady(true)
    }
  }, [updateVideoDimensions])

  // 업로드된 비디오 재생 가능 상태
  const handleCanPlay = useCallback(() => {
    console.log('[GaitCamera] Video can play')
    setIsVideoReady(true)
  }, [])

  // 분석 시작/중지 토글
  const handleToggleAnalysis = useCallback(() => {
    if (isAnalyzing) {
      console.log('[GaitCamera] Stopping analysis')
      if (mode === 'video' && uploadedVideoRef.current) {
        uploadedVideoRef.current.pause()
      }
      onAnalysisStop?.()
    } else {
      console.log('[GaitCamera] Starting analysis')
      // 분석 시작 시 FPS 카운터 리셋
      lastFrameTimeRef.current = 0
      setFps(0)
      onAnalysisStart?.()
    }
  }, [isAnalyzing, mode, onAnalysisStart, onAnalysisStop])

  const error = cameraError || modelError
  const showLoadingOverlay = isModelLoading || isInitializing

  // 비디오 모드에서 컨트롤 버튼 표시 조건
  const showVideoControls = mode === 'video' && uploadedVideoSrc && isVideoReady && isModelReady

  return (
    <div className="flex flex-col gap-4">
      {/* 모드 선택 */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange?.('webcam')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            mode === 'webcam'
              ? 'bg-primary text-white'
              : 'bg-surface text-text-secondary hover:bg-surface/80'
          )}
        >
          <Camera className="h-4 w-4" />
          {language === 'ko' ? '웹캠' : 'Webcam'}
        </button>
        <button
          onClick={() => onModeChange?.('video')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            mode === 'video'
              ? 'bg-primary text-white'
              : 'bg-surface text-text-secondary hover:bg-surface/80'
          )}
        >
          <Upload className="h-4 w-4" />
          {language === 'ko' ? '업로드' : 'Upload'}
        </button>
      </div>

      {/* 비디오 영역 */}
      <div
        ref={(el) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          ;(videoContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        className="bg-surface relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border"
      >
        {/* 모델 로딩 중 */}
        {showLoadingOverlay && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-white">
              {isInitializing
                ? language === 'ko' ? '카메라 초기화 중...' : 'Initializing camera...'
                : language === 'ko' ? '모델 로딩 중...' : 'Loading model...'}
            </span>
          </div>
        )}

        {/* 에러 표시 */}
        {error && !showLoadingOverlay && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50">
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <span className="text-sm text-white">{error}</span>
          </div>
        )}

        {/* 웹캠 모드 */}
        {mode === 'webcam' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* 비디오 업로드 모드 */}
        {mode === 'video' && (
          <>
            {uploadedVideoSrc ? (
              <>
                <video
                  ref={uploadedVideoRef}
                  src={uploadedVideoSrc}
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                  onLoadedMetadata={handleUploadedVideoLoaded}
                  onCanPlay={handleCanPlay}
                />
                {/* 영상 삭제/교체 버튼 */}
                {!isAnalyzing && (
                  <div className="absolute left-3 top-3 z-30 flex gap-2">
                    <button
                      onClick={handleVideoRemove}
                      className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1.5 text-xs text-white transition-colors hover:bg-black/80"
                      title={language === 'ko' ? '영상 삭제' : 'Remove video'}
                    >
                      <X className="h-3.5 w-3.5" />
                      {language === 'ko' ? '삭제' : 'Remove'}
                    </button>
                    <button
                      onClick={() => videoUploadRef.current?.click()}
                      className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1.5 text-xs text-white transition-colors hover:bg-black/80"
                      title={language === 'ko' ? '다른 영상 선택' : 'Choose another video'}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {language === 'ko' ? '변경' : 'Change'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={() => videoUploadRef.current?.click()}
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-4 transition-colors hover:bg-border/20"
              >
                <Upload className="text-text-secondary h-12 w-12" />
                <span className="text-text-secondary text-sm">
                  {language === 'ko'
                    ? '비디오를 업로드하세요'
                    : 'Upload a video'}
                </span>
              </div>
            )}
            <input
              ref={videoUploadRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </>
        )}

        {/* 스켈레톤 오버레이 */}
        {showSkeleton && landmarks && landmarks.length > 0 && (
          <div
            className="absolute inset-0 z-10"
            style={{
              transform: mode === 'webcam' ? 'scaleX(-1)' : 'none'
            }}
          >
            <GaitSkeleton
              landmarks={landmarks}
              videoWidth={videoDimensions.width}
              videoHeight={videoDimensions.height}
              containerRef={videoContainerRef}
              mirrored={false}
            />
          </div>
        )}

        {/* FPS 표시 */}
        {isAnalyzing && (
          <div className="absolute left-3 top-3 z-30 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {fps} FPS
          </div>
        )}

        {/* 분석 중 표시 */}
        {isAnalyzing && (
          <motion.div
            className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-lg bg-red-500/90 px-2 py-1"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className="h-2 w-2 rounded-full bg-white" />
            <span className="text-xs font-medium text-white">
              {language === 'ko' ? '분석 중' : 'Analyzing'}
            </span>
          </motion.div>
        )}

        {/* 랜드마크 감지 상태 */}
        {isAnalyzing && (
          <div className={cn(
            "absolute bottom-3 left-3 z-30 rounded-lg px-2 py-1 text-xs font-medium text-white",
            landmarks && landmarks.length > 0 ? "bg-emerald-500/80" : "bg-amber-500/80"
          )}>
            {landmarks && landmarks.length > 0
              ? (language === 'ko' ? `포즈 감지됨 (${landmarks.length})` : `Pose Detected (${landmarks.length})`)
              : (language === 'ko' ? '포즈 감지 대기 중...' : 'Waiting for pose...')
            }
          </div>
        )}

        {/* 디버그 정보 */}
        {mode === 'video' && debugInfo && (
          <div className="absolute bottom-3 right-3 z-30 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">
            {debugInfo}
          </div>
        )}
      </div>

      {/* 컨트롤 버튼 - 웹캠 모드 */}
      {mode === 'webcam' && isModelReady && isStreaming && (
        <button
          onClick={handleToggleAnalysis}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors',
            isAnalyzing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-primary text-white hover:bg-primary-hover'
          )}
        >
          {isAnalyzing ? (
            <>
              <Square className="h-4 w-4" />
              {language === 'ko' ? '분석 중지' : 'Stop Analysis'}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {language === 'ko' ? '분석 시작' : 'Start Analysis'}
            </>
          )}
        </button>
      )}

      {/* 컨트롤 버튼 - 비디오 모드 */}
      {showVideoControls && (
        <button
          onClick={handleToggleAnalysis}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors',
            isAnalyzing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-primary text-white hover:bg-primary-hover'
          )}
        >
          {isAnalyzing ? (
            <>
              <Square className="h-4 w-4" />
              {language === 'ko' ? '분석 중지' : 'Stop Analysis'}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {language === 'ko' ? '분석 시작' : 'Start Analysis'}
            </>
          )}
        </button>
      )}

      {/* 비디오 모드 안내 메시지 */}
      {mode === 'video' && uploadedVideoSrc && !isVideoReady && (
        <p className="text-text-secondary text-center text-xs">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          {language === 'ko' ? '비디오 로딩 중...' : 'Loading video...'}
        </p>
      )}

      {mode === 'video' && uploadedVideoSrc && isVideoReady && !isModelReady && (
        <p className="text-text-secondary text-center text-xs">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          {language === 'ko' ? '모델 로딩 중...' : 'Loading model...'}
        </p>
      )}

      {/* 안내 메시지 */}
      {!isAnalyzing && isModelReady && mode === 'webcam' && isStreaming && (
        <p className="text-text-secondary text-center text-xs">
          {language === 'ko'
            ? '카메라에서 측면으로 서서 걷는 모습이 보이도록 해주세요'
            : 'Stand sideways so your walking profile is visible to the camera'}
        </p>
      )}

      {!isAnalyzing && mode === 'video' && showVideoControls && (
        <p className="text-text-secondary text-center text-xs">
          {language === 'ko'
            ? '"분석 시작" 버튼을 눌러 보행 분석을 시작하세요'
            : 'Click "Start Analysis" to begin gait analysis'}
        </p>
      )}
    </div>
  )
}
