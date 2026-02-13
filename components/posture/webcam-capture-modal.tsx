'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Timer, SwitchCamera, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'
import type { ViewAngle } from '@/types/analysis-result'

interface WebcamCaptureModalProps {
  isOpen: boolean
  viewAngle: ViewAngle
  onCapture: (dataUrl: string, width: number, height: number) => void
  onClose: () => void
}

export function WebcamCaptureModal({
  isOpen,
  viewAngle,
  onCapture,
  onClose,
}: WebcamCaptureModalProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    viewAngle === 'front' ? 'user' : 'environment',
  )
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedSize, setCapturedSize] = useState<{ w: number; h: number } | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopCamera()
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraReady(true)
        }
      }
    } catch (err) {
      const e = err as DOMException
      if (e.name === 'NotAllowedError') {
        setError(t('ai3d.webcam.cameraError'))
      } else if (e.name === 'NotFoundError') {
        setError(t('ai3d.webcam.noCameraFound'))
      } else {
        setError(t('ai3d.webcam.cameraError'))
      }
    }
  }, [stopCamera, t])

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null)
      setCapturedSize(null)
      setCountdown(null)
      startCamera(facingMode)
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSwitchCamera = useCallback(() => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    startCamera(newFacing)
  }, [facingMode, startCamera])

  const doCapture = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

    // Create a fresh offscreen canvas each time (avoids hidden-element rendering issues)
    const offscreen = document.createElement('canvas')
    offscreen.width = video.videoWidth
    offscreen.height = video.videoHeight
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    // Mirror for front-facing camera
    if (facingMode === 'user') {
      ctx.translate(offscreen.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0)
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.92)
    setCapturedImage(dataUrl)
    setCapturedSize({ w: offscreen.width, h: offscreen.height })
  }, [facingMode])

  const handleCapture = useCallback(() => {
    if (timerEnabled) {
      setCountdown(3)
      let count = 3
      const interval = setInterval(() => {
        count--
        if (count <= 0) {
          clearInterval(interval)
          setCountdown(null)
          doCapture()
        } else {
          setCountdown(count)
        }
      }, 1000)
    } else {
      doCapture()
    }
  }, [timerEnabled, doCapture])

  const handleRetake = useCallback(() => {
    setCapturedImage(null)
    setCapturedSize(null)
    // Re-assign stream to video element after React re-renders the <video>
    requestAnimationFrame(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    })
  }, [])

  const handleUsePhoto = useCallback(() => {
    if (capturedImage && capturedSize) {
      onCapture(capturedImage, capturedSize.w, capturedSize.h)
      onClose()
    }
  }, [capturedImage, capturedSize, onCapture, onClose])

  const handleClose = useCallback(() => {
    stopCamera()
    onClose()
  }, [stopCamera, onClose])

  const titleKey = viewAngle === 'front'
    ? 'ai3d.webcam.captureFront'
    : viewAngle === 'side'
    ? 'ai3d.webcam.captureSide'
    : 'ai3d.webcam.captureBack'

  const guideKey = viewAngle === 'front'
    ? 'ai3d.webcam.guideFront'
    : viewAngle === 'side'
    ? 'ai3d.webcam.guideSide'
    : 'ai3d.webcam.guideBack'

  const isMirrored = facingMode === 'user'

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-base font-semibold text-text-primary">
                {t(titleKey)}
              </h3>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-border/50 transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            {/* Camera / Preview Area */}
            <div className="relative bg-black" style={{ aspectRatio: '3/4' }}>
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  <Camera className="h-12 w-12 text-red-400" />
                  <p className="text-center text-sm text-red-300">{error}</p>
                </div>
              ) : capturedImage ? (
                /* Captured image review */
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="h-full w-full object-contain"
                />
              ) : (
                <>
                  {/* Live video */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
                  />

                  {/* Guide silhouette overlay */}
                  {cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <SilhouetteGuide viewAngle={viewAngle} />
                    </div>
                  )}

                  {/* Guide text */}
                  {cameraReady && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                      <p className="text-center text-xs text-white/80">{t(guideKey)}</p>
                    </div>
                  )}

                  {/* Countdown */}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="text-7xl font-bold text-white drop-shadow-lg"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                  )}

                  {/* Loading state */}
                  {!cameraReady && !error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Controls */}
            <div className="border-t border-border px-4 py-4">
              {capturedImage ? (
                /* Review buttons */
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRetake}
                    className="flex-1"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('ai3d.webcam.retake')}
                  </Button>
                  <Button
                    onClick={handleUsePhoto}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {t('ai3d.webcam.usePhoto')}
                  </Button>
                </div>
              ) : (
                /* Capture controls */
                <div className="flex items-center justify-between">
                  {/* Timer toggle */}
                  <button
                    onClick={() => setTimerEnabled((p) => !p)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      timerEnabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-border/50 text-text-secondary'
                    }`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {timerEnabled ? t('ai3d.webcam.timerOn') : t('ai3d.webcam.timerOff')}
                  </button>

                  {/* Capture button */}
                  <button
                    onClick={handleCapture}
                    disabled={!cameraReady || countdown !== null}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-all hover:bg-white/30 active:scale-95 disabled:opacity-40"
                  >
                    <div className="h-12 w-12 rounded-full bg-white" />
                  </button>

                  {/* Switch camera */}
                  <button
                    onClick={handleSwitchCamera}
                    disabled={!cameraReady}
                    className="flex items-center gap-1.5 rounded-full bg-border/50 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-border disabled:opacity-40"
                  >
                    <SwitchCamera className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Simple silhouette guide SVGs for each view */
function SilhouetteGuide({ viewAngle }: { viewAngle: ViewAngle }) {
  const common = 'h-[70%] w-auto opacity-30'

  if (viewAngle === 'front') {
    return (
      <svg viewBox="0 0 100 200" className={common} fill="none" stroke="white" strokeWidth="1.2">
        {/* Head */}
        <ellipse cx="50" cy="24" rx="12" ry="14" />
        {/* Neck */}
        <line x1="50" y1="38" x2="50" y2="48" />
        {/* Shoulders */}
        <line x1="25" y1="55" x2="75" y2="55" />
        {/* Torso */}
        <line x1="25" y1="55" x2="30" y2="110" />
        <line x1="75" y1="55" x2="70" y2="110" />
        {/* Hips */}
        <line x1="30" y1="110" x2="70" y2="110" />
        {/* Left leg */}
        <line x1="37" y1="110" x2="35" y2="155" />
        <line x1="35" y1="155" x2="34" y2="195" />
        {/* Right leg */}
        <line x1="63" y1="110" x2="65" y2="155" />
        <line x1="65" y1="155" x2="66" y2="195" />
        {/* Arms */}
        <line x1="25" y1="55" x2="18" y2="100" />
        <line x1="75" y1="55" x2="82" y2="100" />
      </svg>
    )
  }

  if (viewAngle === 'side') {
    return (
      <svg viewBox="0 0 100 200" className={common} fill="none" stroke="white" strokeWidth="1.2">
        {/* Head */}
        <ellipse cx="52" cy="24" rx="11" ry="14" />
        {/* Neck */}
        <line x1="50" y1="38" x2="48" y2="48" />
        {/* Shoulder point */}
        <circle cx="46" cy="55" r="3" />
        {/* Torso - slight S-curve */}
        <path d="M46,55 C48,75 52,85 48,110" />
        {/* Hip point */}
        <circle cx="48" cy="110" r="3" />
        {/* Leg */}
        <line x1="48" y1="110" x2="50" y2="155" />
        <line x1="50" y1="155" x2="50" y2="195" />
        {/* Arm */}
        <line x1="46" y1="55" x2="40" y2="100" />
      </svg>
    )
  }

  // Back view
  return (
    <svg viewBox="0 0 100 200" className={common} fill="none" stroke="white" strokeWidth="1.2">
      {/* Head */}
      <ellipse cx="50" cy="24" rx="12" ry="14" />
      {/* Neck */}
      <line x1="50" y1="38" x2="50" y2="48" />
      {/* Shoulders */}
      <line x1="25" y1="55" x2="75" y2="55" />
      {/* Spine line */}
      <line x1="50" y1="48" x2="50" y2="110" strokeDasharray="3,3" />
      {/* Torso */}
      <line x1="25" y1="55" x2="30" y2="110" />
      <line x1="75" y1="55" x2="70" y2="110" />
      {/* Hips */}
      <line x1="30" y1="110" x2="70" y2="110" />
      {/* Left leg */}
      <line x1="37" y1="110" x2="35" y2="155" />
      <line x1="35" y1="155" x2="34" y2="195" />
      {/* Right leg */}
      <line x1="63" y1="110" x2="65" y2="155" />
      <line x1="65" y1="155" x2="66" y2="195" />
      {/* Arms */}
      <line x1="25" y1="55" x2="18" y2="100" />
      <line x1="75" y1="55" x2="82" y2="100" />
    </svg>
  )
}
