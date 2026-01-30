'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  User,
  Hand,
  Gamepad2,
  Camera as CameraIcon,
  AlertCircle,
  Bug,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VrmViewer, VrmViewerRef } from '@/components/avatar/vrm-viewer'
import { AvatarControls } from '@/components/avatar/avatar-controls'
import { useTranslation } from '@/hooks/use-translation'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useHandDetection, HandResult, HAND_CONNECTIONS } from '@/hooks/use-hand-detection'
import { cn } from '@/lib/utils'
import type { TrackingMode, CameraPreset, AvatarSettings } from '@/types/avatar'
import { DEFAULT_VRM_MODELS } from '@/types/avatar'

const TRACKING_MODES: { mode: TrackingMode; icon: React.ElementType; labelKey: string }[] = [
  { mode: 'fullbody', icon: User, labelKey: 'avatar.mode.fullbody' },
  { mode: 'hands', icon: Hand, labelKey: 'avatar.mode.hands' },
  { mode: 'game', icon: Gamepad2, labelKey: 'avatar.mode.game' },
]

// Pose connection pairs for skeleton drawing
const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
]

export default function AvatarPage() {
  const { t } = useTranslation()
  const vrmViewerRef = useRef<VrmViewerRef>(null)
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null)

  // Settings state
  const [settings, setSettings] = useState<AvatarSettings>({
    backgroundColor: '#1a1a1a',
    lightingIntensity: 1.0,
    cameraPreset: 'front',
    selectedVrmUrl: DEFAULT_VRM_MODELS[0].url,
  })

  const [trackingMode, setTrackingMode] = useState<TrackingMode>('fullbody')
  const [isTracking, setIsTracking] = useState(false)
  const [controlsCollapsed, setControlsCollapsed] = useState(false)
  const [showDebug, setShowDebug] = useState(true)
  const [handError, setHandError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState({
    poseDetected: false,
    landmarkCount: 0,
    handsDetected: 0,
    handLandmarkCount: 0,
    vrmReady: false,
    lastUpdate: '',
  })

  // Camera hook
  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useCamera({ width: 640, height: 480 })

  // Pose detection (for fullbody/game mode)
  const {
    landmarks: poseLandmarks,
    isLoading: poseLoading,
    isReady: poseReady,
    startDetection: startPoseDetection,
    stopDetection: stopPoseDetection,
  } = usePoseDetection({
    onResults: (landmarks) => {
      console.log('[Avatar] Pose landmarks received:', landmarks.length)
    }
  })

  // Hand detection (for hands/game mode)
  const {
    hands,
    isLoading: handsLoading,
    isReady: handsReady,
    error: handsError,
    startDetection: startHandDetection,
    stopDetection: stopHandDetection,
  } = useHandDetection({
    onResults: (detectedHands) => {
      if (detectedHands.length > 0) {
        console.log('[Avatar] Hands detected:', detectedHands.length,
          'Landmarks:', detectedHands[0]?.landmarks.length || 0)
      }
    }
  })

  // Update hand error state
  useEffect(() => {
    if (handsError) {
      console.error('[Avatar] Hand detection error:', handsError)
      setHandError(handsError)
    }
  }, [handsError])

  // Draw hand skeleton on canvas
  // Note: Canvas already has CSS scale-x-[-1], so we use coordinates directly
  const drawHandSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number; z: number }[],
    color: string,
    width: number,
    height: number
  ) => {
    if (landmarks.length < 21) return

    // Draw connections
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const startLm = landmarks[start]
      const endLm = landmarks[end]
      if (startLm && endLm) {
        ctx.beginPath()
        // Don't mirror here - CSS scale-x-[-1] already handles mirroring
        ctx.moveTo(startLm.x * width, startLm.y * height)
        ctx.lineTo(endLm.x * width, endLm.y * height)
        ctx.stroke()
      }
    })

    // Draw landmarks
    landmarks.forEach((lm, index) => {
      ctx.beginPath()
      // Don't mirror here - CSS handles it
      ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI)
      // Different colors for different finger parts
      if (index === 0) ctx.fillStyle = '#FFFFFF' // Wrist - white
      else if (index <= 4) ctx.fillStyle = '#FF6B6B' // Thumb - red
      else if (index <= 8) ctx.fillStyle = '#4ECDC4' // Index - teal
      else if (index <= 12) ctx.fillStyle = '#45B7D1' // Middle - blue
      else if (index <= 16) ctx.fillStyle = '#96CEB4' // Ring - green
      else ctx.fillStyle = '#FFEAA7' // Pinky - yellow
      ctx.fill()
    })
  }, [])

  // Draw skeleton overlay on canvas
  // Note: Canvas has CSS scale-x-[-1] for mirroring, so coordinates are used directly
  const drawSkeleton = useCallback((
    poseLandmarks: { x: number; y: number; z: number; visibility?: number }[],
    handResults: HandResult[]
  ) => {
    const canvas = skeletonCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw pose skeleton
    if (poseLandmarks.length > 0) {
      // Draw connections
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 3
      POSE_CONNECTIONS.forEach(([start, end]) => {
        const startLm = poseLandmarks[start]
        const endLm = poseLandmarks[end]
        if (startLm && endLm &&
            (startLm.visibility === undefined || startLm.visibility > 0.5) &&
            (endLm.visibility === undefined || endLm.visibility > 0.5)) {
          ctx.beginPath()
          // Don't mirror here - CSS scale-x-[-1] already handles mirroring
          ctx.moveTo(startLm.x * canvas.width, startLm.y * canvas.height)
          ctx.lineTo(endLm.x * canvas.width, endLm.y * canvas.height)
          ctx.stroke()
        }
      })

      // Draw landmarks
      poseLandmarks.forEach((lm, index) => {
        if (lm.visibility !== undefined && lm.visibility < 0.5) return

        ctx.beginPath()
        // Don't mirror here - CSS handles it
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI)
        ctx.fillStyle = index < 11 ? '#FF0000' : '#00FF00' // Red for face, green for body
        ctx.fill()
      })
    }

    // Draw hand skeletons
    handResults.forEach((hand) => {
      const color = hand.handedness === 'Left' ? '#FF69B4' : '#00BFFF' // Pink for left, blue for right
      drawHandSkeleton(ctx, hand.landmarks, color, canvas.width, canvas.height)
    })
  }, [videoRef, drawHandSkeleton])

  // Apply pose and hands to VRM avatar with debug logging
  useEffect(() => {
    if (!isTracking) return

    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      poseDetected: poseLandmarks.length > 0,
      landmarkCount: poseLandmarks.length,
      handsDetected: hands.length,
      handLandmarkCount: hands.length > 0 ? hands[0].landmarks.length : 0,
      lastUpdate: new Date().toLocaleTimeString(),
    }))

    // Draw skeleton overlay (pose + hands)
    drawSkeleton(poseLandmarks, hands)

    // Apply pose to VRM
    if (vrmViewerRef.current && (trackingMode === 'fullbody' || trackingMode === 'game') && poseLandmarks.length > 0) {
      console.log('[Avatar] Applying pose to VRM, landmarks:', poseLandmarks.length)
      vrmViewerRef.current.applyPose(poseLandmarks)
    }
  }, [isTracking, trackingMode, poseLandmarks, hands, drawSkeleton])

  // Apply hands to VRM avatar
  // Note: MediaPipe reports actual physical hand (Left/Right), but since webcam is mirrored,
  // we need to SWAP the hands for avatar: MediaPipe "Left" → Avatar "Right" and vice versa
  useEffect(() => {
    if (!isTracking || !vrmViewerRef.current) return

    if ((trackingMode === 'hands' || trackingMode === 'game') && hands.length > 0) {
      // MediaPipe's "Left" hand appears on the RIGHT side of mirrored webcam
      // So we swap: MediaPipe Left → Avatar Right, MediaPipe Right → Avatar Left
      const mediaPipeLeftHand = hands.find((h: HandResult) => h.handedness === 'Left')
      const mediaPipeRightHand = hands.find((h: HandResult) => h.handedness === 'Right')

      // Swap for avatar (mirrored view)
      const avatarLeftHand = mediaPipeRightHand?.landmarks || null
      const avatarRightHand = mediaPipeLeftHand?.landmarks || null

      console.log('[Avatar] Applying hands to VRM (swapped for mirror):',
        'avatar left (from MP right):', !!avatarLeftHand, avatarLeftHand?.length || 0,
        'avatar right (from MP left):', !!avatarRightHand, avatarRightHand?.length || 0)

      vrmViewerRef.current.applyHands(avatarLeftHand, avatarRightHand)
    }
  }, [isTracking, trackingMode, hands])

  // Handle start tracking
  const handleStartTracking = useCallback(async () => {
    console.log('[Avatar] Starting tracking...')
    await startCamera()
    setIsTracking(true)
  }, [startCamera])

  // Start detection when streaming begins
  useEffect(() => {
    if (isStreaming && isTracking && videoRef.current) {
      console.log('[Avatar] Stream ready, starting detection for mode:', trackingMode)

      if (trackingMode === 'fullbody') {
        startPoseDetection(videoRef.current)
      } else if (trackingMode === 'hands') {
        startHandDetection(videoRef.current)
      } else if (trackingMode === 'game') {
        startPoseDetection(videoRef.current)
        startHandDetection(videoRef.current)
      }
    }
  }, [isStreaming, isTracking, trackingMode, videoRef, startPoseDetection, startHandDetection])

  // Handle stop tracking
  const handleStopTracking = useCallback(() => {
    console.log('[Avatar] Stopping tracking...')
    stopCamera()
    stopPoseDetection()
    stopHandDetection()
    setIsTracking(false)

    // Clear skeleton canvas
    const canvas = skeletonCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [stopCamera, stopPoseDetection, stopHandDetection])

  // Handle reset pose
  const handleResetPose = useCallback(() => {
    console.log('[Avatar] Resetting pose...')
    vrmViewerRef.current?.resetPose()
  }, [])

  // Handle tracking mode change
  const handleModeChange = useCallback((mode: TrackingMode) => {
    console.log('[Avatar] Changing mode to:', mode)
    if (isTracking) {
      stopPoseDetection()
      stopHandDetection()

      if (videoRef.current && isStreaming) {
        if (mode === 'fullbody') {
          startPoseDetection(videoRef.current)
        } else if (mode === 'hands') {
          startHandDetection(videoRef.current)
        } else if (mode === 'game') {
          startPoseDetection(videoRef.current)
          startHandDetection(videoRef.current)
        }
      }
    }
    setTrackingMode(mode)
    vrmViewerRef.current?.resetPose()
  }, [isTracking, isStreaming, videoRef, stopPoseDetection, stopHandDetection, startPoseDetection, startHandDetection])

  // Handle VRM ready callback
  const handleVrmLoad = useCallback(() => {
    console.log('[Avatar] VRM model loaded successfully')
    setDebugInfo(prev => ({ ...prev, vrmReady: true }))
  }, [])

  const handleVrmError = useCallback((error: string) => {
    console.error('[Avatar] VRM load error:', error)
    setDebugInfo(prev => ({ ...prev, vrmReady: false }))
  }, [])

  // Handle settings changes
  const handleBackgroundChange = useCallback((color: string) => {
    setSettings((s) => ({ ...s, backgroundColor: color }))
    vrmViewerRef.current?.setBackgroundColor(color)
  }, [])

  const handleLightingChange = useCallback((intensity: number) => {
    setSettings((s) => ({ ...s, lightingIntensity: intensity }))
    vrmViewerRef.current?.setLightingIntensity(intensity)
  }, [])

  const handleCameraPresetChange = useCallback((preset: CameraPreset) => {
    setSettings((s) => ({ ...s, cameraPreset: preset }))
    vrmViewerRef.current?.setCameraPreset(preset)
  }, [])

  const handleVrmChange = useCallback((url: string) => {
    setSettings((s) => ({ ...s, selectedVrmUrl: url }))
    vrmViewerRef.current?.loadVrm(url)
  }, [])

  const handleVrmFileUpload = useCallback((file: File) => {
    vrmViewerRef.current?.loadVrmFromFile(file)
  }, [])

  const isModelLoading = poseLoading || handsLoading

  // Clear hand error when changing modes
  useEffect(() => {
    setHandError(null)
  }, [trackingMode])

  return (
    <MainLayout title={t('avatar.title')}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Camera + Controls */}
          <div className="space-y-4">
            {/* Tracking Mode Selection */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {TRACKING_MODES.map(({ mode, icon: Icon, labelKey }) => (
                    <Button
                      key={mode}
                      variant={trackingMode === mode ? 'default' : 'outline'}
                      onClick={() => handleModeChange(mode)}
                      className="flex-1"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {t(labelKey)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Camera View with Skeleton Overlay */}
            <Card>
              <CardContent className="p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      'h-full w-full object-cover',
                      isStreaming ? 'opacity-100' : 'opacity-0',
                      'scale-x-[-1]'
                    )}
                  />

                  {/* Hidden capture canvas */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Skeleton Overlay Canvas */}
                  <canvas
                    ref={skeletonCanvasRef}
                    className={cn(
                      'absolute inset-0 h-full w-full pointer-events-none',
                      isStreaming ? 'opacity-100' : 'opacity-0',
                      'scale-x-[-1]'
                    )}
                  />

                  {/* Camera placeholder */}
                  {!isStreaming && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                      <CameraIcon className="h-16 w-16 text-text-secondary/30" />
                      <p className="mt-4 text-sm text-text-secondary">
                        {t('avatar.cameraPlaceholder')}
                      </p>
                      <Button onClick={handleStartTracking} className="mt-4" size="lg">
                        <Play className="mr-2 h-5 w-5" />
                        {t('avatar.startTracking')}
                      </Button>
                    </div>
                  )}

                  {/* Camera error */}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                      <AlertCircle className="h-12 w-12 text-error" />
                      <p className="mt-3 max-w-xs text-center text-sm text-error">
                        {cameraError}
                      </p>
                      <Button onClick={handleStartTracking} variant="outline" className="mt-4">
                        {t('common.retry')}
                      </Button>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isModelLoading && isStreaming && (
                    <div className="absolute left-3 top-3">
                      <span className="animate-pulse rounded-full bg-warning/80 px-3 py-1 text-xs font-medium text-white">
                        {t('avatar.loading')}
                      </span>
                    </div>
                  )}

                  {/* Tracking status indicator */}
                  {isStreaming && !isModelLoading && (
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-white">
                        {t('avatar.tracking')}
                      </span>
                      {(trackingMode === 'fullbody' || trackingMode === 'game') && debugInfo.poseDetected && (
                        <span className="rounded-full bg-green-500/80 px-3 py-1 text-xs font-medium text-white">
                          Pose ✓
                        </span>
                      )}
                      {(trackingMode === 'hands' || trackingMode === 'game') && debugInfo.handsDetected > 0 && (
                        <span className="rounded-full bg-pink-500/80 px-3 py-1 text-xs font-medium text-white">
                          Hands ✓ ({debugInfo.handsDetected})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Controls */}
                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex justify-center gap-3"
                  >
                    <Button variant="outline" onClick={handleStopTracking}>
                      <Pause className="mr-2 h-4 w-4" />
                      {t('common.stop')}
                    </Button>
                    <Button variant="outline" onClick={handleResetPose}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t('avatar.resetPose')}
                    </Button>
                    <Button
                      variant={showDebug ? 'default' : 'outline'}
                      onClick={() => setShowDebug(!showDebug)}
                      size="icon"
                    >
                      <Bug className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {/* Debug Panel */}
                {showDebug && isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 rounded-lg bg-black/80 p-3 font-mono text-xs text-green-400"
                  >
                    <div className="grid grid-cols-2 gap-x-4">
                      <div>Mode: {trackingMode}</div>
                      <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
                      <div>Pose Ready: {poseReady ? 'Yes' : 'No'}</div>
                      <div>Hands Ready: {handsReady ? 'Yes' : 'No'}</div>
                      <div>Pose: {debugInfo.poseDetected ? `✓ (${debugInfo.landmarkCount})` : '✗'}</div>
                      <div>Hands: {debugInfo.handsDetected > 0 ? `✓ (${debugInfo.handsDetected})` : '✗'}</div>
                      <div>VRM: {debugInfo.vrmReady ? '✓' : '✗'}</div>
                      <div>Updated: {debugInfo.lastUpdate}</div>
                    </div>
                    {handError && (
                      <div className="mt-2 text-red-400">Error: {handError}</div>
                    )}
                  </motion.div>
                )}

                {/* Hand Error Display */}
                {handError && !showDebug && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Hand detection error: {handError}</span>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Avatar Controls */}
            <AvatarControls
              isCollapsed={controlsCollapsed}
              onToggleCollapse={() => setControlsCollapsed(!controlsCollapsed)}
              backgroundColor={settings.backgroundColor}
              onBackgroundChange={handleBackgroundChange}
              lightingIntensity={settings.lightingIntensity}
              onLightingChange={handleLightingChange}
              cameraPreset={settings.cameraPreset}
              onCameraPresetChange={handleCameraPresetChange}
              selectedVrm={settings.selectedVrmUrl}
              onVrmChange={handleVrmChange}
              availableVrms={DEFAULT_VRM_MODELS}
              onFileUpload={handleVrmFileUpload}
            />
          </div>

          {/* Right: 3D Avatar Viewer */}
          <div>
            <Card className="h-full">
              <CardContent className="p-4">
                <VrmViewer
                  ref={vrmViewerRef}
                  mode={trackingMode}
                  size="large"
                  showControls
                  vrmUrl={settings.selectedVrmUrl}
                  className="min-h-[500px]"
                  onLoad={handleVrmLoad}
                  onError={handleVrmError}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
